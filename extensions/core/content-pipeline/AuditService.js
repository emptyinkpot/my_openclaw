"use strict";
/**
 * 审核服务
 * 负责章节审核状态检查、自动修复
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const database_1 = require("../database");
const logger_1 = require("../../plugins/novel-manager/utils/logger");
const DEFAULT_AUDIT_CONFIG = {
    minWordCount: 1000,
    maxWordCount: 20000,
    checkSensitiveWords: true,
    checkFormat: true,
    sensitiveWords: ['政治', '敏感词'],
};
class AuditService {
    constructor(config) {
        this.db = (0, database_1.getDatabaseManager)();
        this.config = { ...DEFAULT_AUDIT_CONFIG, ...config };
    }
    async initializeTables() {
        try {
            const columns = await this.db.query("PRAGMA table_info(chapters)");
            const columnNames = columns.map((c) => c.name);
            if (!columnNames.includes('audit_status')) {
                await this.db.execute(`ALTER TABLE chapters ADD COLUMN audit_status TEXT DEFAULT 'pending'`);
                logger_1.logger.info('已添加 audit_status 列');
            }
            if (!columnNames.includes('audit_issues')) {
                await this.db.execute(`ALTER TABLE chapters ADD COLUMN audit_issues TEXT DEFAULT '[]'`);
            }
            if (!columnNames.includes('audit_score')) {
                await this.db.execute(`ALTER TABLE chapters ADD COLUMN audit_score INTEGER DEFAULT 0`);
            }
            if (!columnNames.includes('suggested_action')) {
                await this.db.execute(`ALTER TABLE chapters ADD COLUMN suggested_action TEXT DEFAULT 'none'`);
            }
            if (!columnNames.includes('audited_at')) {
                await this.db.execute(`ALTER TABLE chapters ADD COLUMN audited_at TEXT`);
            }
            logger_1.logger.info('审核表结构初始化完成');
        }
        catch (error) {
            logger_1.logger.warn('审核表结构初始化警告:', error.message);
        }
    }
    async getChapterAuditStatus(workId, chapterNumber) {
        const row = await this.db.queryOne(`
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
    }
    async auditChapter(workId, chapterNumber) {
        logger_1.logger.info(`开始审核: workId=${workId}, chapter=${chapterNumber}`);
        const chapter = await this.db.queryOne(`
      SELECT content, title FROM chapters WHERE work_id = ? AND chapter_number = ?
    `, [workId, chapterNumber]);
        if (!chapter || !chapter.content) {
            const result = {
                status: 'failed',
                issues: [{ type: 'content', message: '章节不存在或内容为空', severity: 'error' }],
                score: 0, suggestedAction: 'manual', canAutoFix: false,
            };
            await this.saveAuditResult(workId, chapterNumber, result);
            return result;
        }
        const issues = [];
        let score = 100;
        // 审稿规则1：章节必须有副标题（即"第x章 副标题"的形式）
        if (chapter.title) {
            const subtitlePattern = /^第[0-9]+章\s+.+$/;
            if (!subtitlePattern.test(chapter.title)) {
                issues.push({
                    type: 'format',
                    message: '章节标题格式错误，必须是"第x章 副标题"的形式',
                    severity: 'error',
                });
                score -= 20;
            }
        }
        else {
            issues.push({
                type: 'content',
                message: '章节标题不能为空',
                severity: 'error',
            });
            score -= 20;
        }
        // 审稿规则2：正文中不能有标题
        const titlePattern = /^#{1,6}\s+.+$/gm;
        const titleMatches = chapter.content.match(titlePattern);
        if (titleMatches && titleMatches.length > 0) {
            issues.push({
                type: 'format',
                message: `正文中发现 ${titleMatches.length} 个标题，不允许有标题`,
                severity: 'error',
            });
            score -= 15;
        }
        // 审稿规则3：正文中不能有Markdown语法
        const markdownPatterns = [
            /\*\*.+?\*\*/g, // 粗体
            /_.+?_/g, // 斜体
            /\[.+?\]\(.+?\)/g, // 链接
            /`{1,3}.+?`{1,3}/g, // 代码
        ];
        let markdownCount = 0;
        markdownPatterns.forEach(pattern => {
            const matches = chapter.content.match(pattern);
            if (matches)
                markdownCount += matches.length;
        });
        if (markdownCount > 0) {
            issues.push({
                type: 'format',
                message: `正文中发现 ${markdownCount} 处Markdown语法，不允许使用Markdown`,
                severity: 'error',
            });
            score -= 15;
        }
        // 审稿规则4：正文中使用日文半角符号
        const fullWidthPattern = /[、。，；：！？「」『』【】〔〕〖〗〘〙〚〛]/g;
        const fullWidthMatches = chapter.content.match(fullWidthPattern);
        if (fullWidthMatches && fullWidthMatches.length > 0) {
            issues.push({
                type: 'format',
                message: `正文中发现 ${fullWidthMatches.length} 个全角符号，必须使用日文半角符号`,
                severity: 'warning',
            });
            score -= 10;
        }
        // 审稿规则5：正文中不允许有无意义鼓励字母数字单词，不能有垃圾字符
        const garbagePattern = /[a-zA-Z]{10,}/g;
        const garbageMatches = chapter.content.match(garbagePattern);
        if (garbageMatches && garbageMatches.length > 0) {
            issues.push({
                type: 'content',
                message: `正文中发现 ${garbageMatches.length} 个过长字母数字单词，可能是无意义内容`,
                severity: 'warning',
            });
            score -= 10;
        }
        // 检查垃圾字符（控制字符等）
        const controlCharPattern = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
        const controlCharMatches = chapter.content.match(controlCharPattern);
        if (controlCharMatches && controlCharMatches.length > 0) {
            issues.push({
                type: 'content',
                message: `正文中发现 ${controlCharMatches.length} 个控制字符或垃圾字符`,
                severity: 'error',
            });
            score -= 20;
        }
        // 原有字数检查
        const wordCount = this.countWords(chapter.content);
        if (wordCount < this.config.minWordCount) {
            issues.push({
                type: 'length',
                message: `字数不足: ${wordCount} < ${this.config.minWordCount}`,
                severity: 'error',
            });
            score -= 20;
        }
        else if (wordCount > this.config.maxWordCount) {
            issues.push({
                type: 'length',
                message: `字数超限: ${wordCount} > ${this.config.maxWordCount}`,
                severity: 'warning',
            });
            score -= 10;
        }
        const hasErrors = issues.some(i => i.severity === 'error');
        const status = hasErrors ? 'failed' : 'passed';
        const canAutoFix = issues.some(i => i.type === 'format' || i.type === 'length');
        const suggestedAction = status === 'passed' ? 'none' : canAutoFix ? 'autofix' : 'manual';
        const result = {
            status, issues, score: Math.max(0, score), suggestedAction, canAutoFix,
        };
        await this.saveAuditResult(workId, chapterNumber, result);
        logger_1.logger.info(`审核完成: status=${status}, score=${score}, issues=${issues.length}`);
        return result;
    }
    async getAuditStats(workId) {
        let whereClause = 'WHERE content IS NOT NULL';
        const params = [];
        if (workId) {
            whereClause += ' AND work_id = ?';
            params.push(workId);
        }
        const stats = await this.db.queryOne(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN audit_status IS NULL OR audit_status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN audit_status = 'passed' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN audit_status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN audit_status = 'failed' AND suggested_action = 'autofix' THEN 1 ELSE 0 END) as auto_fixable
      FROM chapters ${whereClause}
    `, params);
        return {
            total: stats?.total || 0,
            pending: stats?.pending || 0,
            passed: stats?.passed || 0,
            failed: stats?.failed || 0,
            autoFixable: stats?.auto_fixable || 0,
        };
    }
    /**
     * 获取待审核章节列表
     */
    async getPendingAuditChapters(workId) {
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
        const rows = await this.db.query(sql, params);
        return rows.map((row) => ({
            workId: row.work_id, chapterNumber: row.chapter_number, exists: true,
            status: row.status, auditStatus: row.audit_status || 'pending',
            auditIssues: this.parseAuditIssues(row.audit_issues),
            suggestedAction: row.suggested_action || 'none', canPublish: false,
        }));
    }
    /**
     * 获取审核失败的章节
     */
    async getFailedAuditChapters(workId) {
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
        const rows = await this.db.query(sql, params);
        return rows.map((row) => ({
            workId: row.work_id, chapterNumber: row.chapter_number, exists: true,
            status: row.status, auditStatus: row.audit_status,
            auditIssues: this.parseAuditIssues(row.audit_issues),
            suggestedAction: row.suggested_action, canPublish: false,
        }));
    }
    /**
     * 批量审核章节
     */
    async auditChapters(workId, options) {
        let sql = `SELECT work_id, chapter_number FROM chapters WHERE content IS NOT NULL AND LENGTH(content) > 0`;
        const params = [];
        if (workId) {
            sql += ' AND work_id = ?';
            params.push(workId);
        }
        if (options?.chapterRange) {
            sql += ' AND chapter_number BETWEEN ? AND ?';
            params.push(options.chapterRange[0], options.chapterRange[1]);
        }
        if (options?.onlyPending) {
            sql += " AND (audit_status IS NULL OR audit_status = 'pending')";
        }
        const chapters = await this.db.query(sql, params);
        const results = [];
        let passed = 0;
        let failed = 0;
        for (const chapter of chapters) {
            const result = await this.auditChapter(chapter.work_id, chapter.chapter_number);
            results.push(result);
            if (result.status === 'passed')
                passed++;
            else
                failed++;
        }
        return { total: chapters.length, passed, failed, results };
    }
    /**
     * 重置审核状态
     */
    async resetAuditStatus(workId, chapterNumber) {
        await this.db.execute(`
      UPDATE chapters 
      SET audit_status = 'pending', audit_issues = '[]', audit_score = 0,
        suggested_action = 'none', audited_at = NULL
      WHERE work_id = ? AND chapter_number = ?
    `, [workId, chapterNumber]);
        logger_1.logger.info(`已重置审核状态: workId=${workId}, chapter=${chapterNumber}`);
    }
    async saveAuditResult(workId, chapterNumber, result) {
        await this.db.execute(`
      UPDATE chapters 
      SET audit_status = ?, audit_issues = ?, audit_score = ?, suggested_action = ?, audited_at = ?
      WHERE work_id = ? AND chapter_number = ?
    `, [
            result.status, JSON.stringify(result.issues), result.score, result.suggestedAction,
            new Date().toISOString(), workId, chapterNumber,
        ]);
    }
    parseAuditIssues(issuesJson) {
        if (!issuesJson)
            return [];
        try {
            return JSON.parse(issuesJson);
        }
        catch {
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
exports.AuditService = AuditService;
//# sourceMappingURL=AuditService.js.map