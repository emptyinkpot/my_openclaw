/**
 * 审核服务
 * 负责章节审核状态检查、自动修复
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { getDatabaseManager } from '../database';
import { logger } from '../../utils/logger';
const DEFAULT_AUDIT_CONFIG = {
    minWordCount: 1000,
    maxWordCount: 20000,
    checkSensitiveWords: true,
    checkFormat: true,
    sensitiveWords: ['政治', '敏感词'],
};
export class AuditService {
    constructor(config) {
        this.db = getDatabaseManager();
        this.config = Object.assign(Object.assign({}, DEFAULT_AUDIT_CONFIG), config);
    }
    initializeTables() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const columns = yield this.db.query("PRAGMA table_info(chapters)");
                const columnNames = columns.map((c) => c.name);
                if (!columnNames.includes('audit_status')) {
                    yield this.db.execute(`ALTER TABLE chapters ADD COLUMN audit_status TEXT DEFAULT 'pending'`);
                    logger.info('已添加 audit_status 列');
                }
                if (!columnNames.includes('audit_issues')) {
                    yield this.db.execute(`ALTER TABLE chapters ADD COLUMN audit_issues TEXT DEFAULT '[]'`);
                }
                if (!columnNames.includes('audit_score')) {
                    yield this.db.execute(`ALTER TABLE chapters ADD COLUMN audit_score INTEGER DEFAULT 0`);
                }
                if (!columnNames.includes('suggested_action')) {
                    yield this.db.execute(`ALTER TABLE chapters ADD COLUMN suggested_action TEXT DEFAULT 'none'`);
                }
                if (!columnNames.includes('audited_at')) {
                    yield this.db.execute(`ALTER TABLE chapters ADD COLUMN audited_at TEXT`);
                }
                logger.info('审核表结构初始化完成');
            }
            catch (error) {
                logger.warn('审核表结构初始化警告:', error.message);
            }
        });
    }
    getChapterAuditStatus(workId, chapterNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const row = yield this.db.queryOne(`
      SELECT status, audit_status, audit_issues, suggested_action
      FROM chapters WHERE work_id = ? AND chapter_number = ?
    `, [workId, chapterNumber]);
            if (!row) {
                return {
                    workId, chapterNumber, exists: false, status: '',
                    auditStatus: null, auditIssues: [], suggestedAction: 'none', canPublish: false,
                };
            }
            const auditStatus = row.audit_status || 'pending';
            const auditIssues = this.parseAuditIssues(row.audit_issues);
            const suggestedAction = row.suggested_action || 'none';
            return {
                workId, chapterNumber, exists: true, status: row.status,
                auditStatus, auditIssues, suggestedAction,
                canPublish: row.status === 'polished' && auditStatus === 'passed',
            };
        });
    }
    auditChapter(workId, chapterNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            logger.info(`开始审核: workId=${workId}, chapter=${chapterNumber}`);
            const chapter = yield this.db.queryOne(`
      SELECT content, title FROM chapters WHERE work_id = ? AND chapter_number = ?
    `, [workId, chapterNumber]);
            if (!chapter || !chapter.content) {
                const result = {
                    status: 'failed',
                    issues: [{ type: 'content', message: '章节不存在或内容为空', severity: 'error' }],
                    score: 0, suggestedAction: 'manual', canAutoFix: false,
                };
                yield this.saveAuditResult(workId, chapterNumber, result);
                return result;
            }
            const issues = [];
            let score = 100;
            // 字数检查
            const wordCount = this.countWords(chapter.content);
            if (wordCount < this.config.minWordCount) {
                issues.push({
                    type: 'length',
                    message: `字数不足: ${wordCount} < ${this.config.minWordCount}`,
                    severity: 'error',
                });
                score -= 30;
            }
            else if (wordCount > this.config.maxWordCount) {
                issues.push({
                    type: 'length',
                    message: `字数超限: ${wordCount} > ${this.config.maxWordCount}`,
                    severity: 'warning',
                });
                score -= 10;
            }
            // 格式检查
            if (this.config.checkFormat) {
                const formatIssues = this.checkFormat(chapter.content);
                issues.push(...formatIssues);
                score -= formatIssues.length * 5;
            }
            // 敏感词检查
            if (this.config.checkSensitiveWords) {
                const sensitiveIssues = this.checkSensitiveWords(chapter.content);
                issues.push(...sensitiveIssues);
                score -= sensitiveIssues.length * 20;
            }
            const hasErrors = issues.some(i => i.severity === 'error');
            const status = hasErrors ? 'failed' : 'passed';
            const canAutoFix = issues.some(i => i.type === 'format' || i.type === 'length');
            const suggestedAction = status === 'passed' ? 'none' : canAutoFix ? 'autofix' : 'manual';
            const result = {
                status, issues, score: Math.max(0, score), suggestedAction, canAutoFix,
            };
            yield this.saveAuditResult(workId, chapterNumber, result);
            logger.info(`审核完成: status=${status}, score=${score}, issues=${issues.length}`);
            return result;
        });
    }
    getAuditStats(workId) {
        return __awaiter(this, void 0, void 0, function* () {
            let whereClause = 'WHERE content IS NOT NULL';
            const params = [];
            if (workId) {
                whereClause += ' AND work_id = ?';
                params.push(workId);
            }
            const stats = yield this.db.queryOne(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN audit_status IS NULL OR audit_status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN audit_status = 'passed' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN audit_status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN audit_status = 'failed' AND suggested_action = 'autofix' THEN 1 ELSE 0 END) as auto_fixable
      FROM chapters ${whereClause}
    `, params);
            return {
                total: (stats === null || stats === void 0 ? void 0 : stats.total) || 0,
                pending: (stats === null || stats === void 0 ? void 0 : stats.pending) || 0,
                passed: (stats === null || stats === void 0 ? void 0 : stats.passed) || 0,
                failed: (stats === null || stats === void 0 ? void 0 : stats.failed) || 0,
                autoFixable: (stats === null || stats === void 0 ? void 0 : stats.auto_fixable) || 0,
            };
        });
    }
    /**
     * 获取待审核章节列表
     */
    getPendingAuditChapters(workId) {
        return __awaiter(this, void 0, void 0, function* () {
            let sql = `
      SELECT work_id, chapter_number, status, audit_status, audit_issues, suggested_action
      FROM chapters 
      WHERE status = 'polished' AND (audit_status IS NULL OR audit_status = 'pending')
    `;
            const params = [];
            if (workId) {
                sql += ' AND work_id = ?';
                params.push(workId);
            }
            sql += ' ORDER BY work_id, chapter_number';
            const rows = yield this.db.query(sql, params);
            return rows.map((row) => ({
                workId: row.work_id, chapterNumber: row.chapter_number, exists: true,
                status: row.status, auditStatus: row.audit_status || 'pending',
                auditIssues: this.parseAuditIssues(row.audit_issues),
                suggestedAction: row.suggested_action || 'none', canPublish: false,
            }));
        });
    }
    /**
     * 获取审核失败的章节
     */
    getFailedAuditChapters(workId) {
        return __awaiter(this, void 0, void 0, function* () {
            let sql = `
      SELECT work_id, chapter_number, status, audit_status, audit_issues, suggested_action
      FROM chapters WHERE audit_status = 'failed'
    `;
            const params = [];
            if (workId) {
                sql += ' AND work_id = ?';
                params.push(workId);
            }
            sql += " AND suggested_action = 'autofix' ORDER BY work_id, chapter_number";
            const rows = yield this.db.query(sql, params);
            return rows.map((row) => ({
                workId: row.work_id, chapterNumber: row.chapter_number, exists: true,
                status: row.status, auditStatus: row.audit_status,
                auditIssues: this.parseAuditIssues(row.audit_issues),
                suggestedAction: row.suggested_action, canPublish: false,
            }));
        });
    }
    /**
     * 批量审核章节
     */
    auditChapters(workId, options) {
        return __awaiter(this, void 0, void 0, function* () {
            let sql = `SELECT work_id, chapter_number FROM chapters WHERE content IS NOT NULL AND LENGTH(content) > 0`;
            const params = [];
            if (workId) {
                sql += ' AND work_id = ?';
                params.push(workId);
            }
            if (options === null || options === void 0 ? void 0 : options.chapterRange) {
                sql += ' AND chapter_number BETWEEN ? AND ?';
                params.push(options.chapterRange[0], options.chapterRange[1]);
            }
            if (options === null || options === void 0 ? void 0 : options.onlyPending) {
                sql += " AND (audit_status IS NULL OR audit_status = 'pending')";
            }
            const chapters = yield this.db.query(sql, params);
            const results = [];
            let passed = 0;
            let failed = 0;
            for (const chapter of chapters) {
                const result = yield this.auditChapter(chapter.work_id, chapter.chapter_number);
                results.push(result);
                if (result.status === 'passed')
                    passed++;
                else
                    failed++;
            }
            return { total: chapters.length, passed, failed, results };
        });
    }
    /**
     * 重置审核状态
     */
    resetAuditStatus(workId, chapterNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.db.execute(`
      UPDATE chapters 
      SET audit_status = 'pending', audit_issues = '[]', audit_score = 0,
        suggested_action = 'none', audited_at = NULL
      WHERE work_id = ? AND chapter_number = ?
    `, [workId, chapterNumber]);
            logger.info(`已重置审核状态: workId=${workId}, chapter=${chapterNumber}`);
        });
    }
    saveAuditResult(workId, chapterNumber, result) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.db.execute(`
      UPDATE chapters 
      SET audit_status = ?, audit_issues = ?, audit_score = ?, suggested_action = ?, audited_at = ?
      WHERE work_id = ? AND chapter_number = ?
    `, [
                result.status, JSON.stringify(result.issues), result.score, result.suggestedAction,
                new Date().toISOString(), workId, chapterNumber,
            ]);
        });
    }
    parseAuditIssues(issuesJson) {
        if (!issuesJson)
            return [];
        try {
            return JSON.parse(issuesJson);
        }
        catch (_a) {
            return [];
        }
    }
    countWords(text) {
        const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
        return chineseChars + englishWords;
    }
    checkFormat(content) {
        const issues = [];
        if (/\n{4,}/.test(content)) {
            issues.push({ type: 'format', message: '存在过多连续空行', severity: 'warning' });
        }
        return issues;
    }
    checkSensitiveWords(content) {
        const issues = [];
        const lowerContent = content.toLowerCase();
        for (const word of this.config.sensitiveWords) {
            if (lowerContent.includes(word.toLowerCase())) {
                issues.push({ type: 'sensitive', message: `包含敏感词: ${word}`, severity: 'error' });
            }
        }
        return issues;
    }
}
