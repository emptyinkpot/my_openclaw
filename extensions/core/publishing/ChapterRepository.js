"use strict";
/**
 * 章节数据仓库
 * 统一章节相关的数据访问逻辑
 *
 * 职责：封装所有章节相关的数据库操作
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChapterRepository = void 0;
exports.getChapterRepository = getChapterRepository;
const database_1 = require("../database");
class ChapterRepository {
    constructor() {
        this.db = (0, database_1.getDatabaseManager)();
    }
    /**
     * 获取作品信息
     */
    async getWorkInfo(workId) {
        const results = await this.db.query('SELECT id, title FROM works WHERE id = ? LIMIT 1', [workId]);
        return results.length > 0 ? results[0] : null;
    }
    /**
     * 按章节号获取章节内容（用于发布，不管发布状态）
     */
    async getChapterByNumber(workId, chapterNumber) {
        const sql = `
      SELECT
        c.work_id as workId,
        w.title as workTitle,
        c.chapter_number as chapterNumber,
        c.title as chapterTitle,
        c.content,
        c.word_count as wordCount,
        c.status as status,
        c.audit_score as auditScore,
        c.suggested_action as suggestedAction
      FROM chapters c
      JOIN works w ON c.work_id = w.id
      WHERE c.work_id = ?
        AND c.chapter_number = ?
        AND c.content IS NOT NULL
        AND LENGTH(c.content) > 100
      LIMIT 1
    `;
        const results = await this.db.query(sql, [workId, chapterNumber]);
        return results.length > 0 ? results[0] : null;
    }
    /**
     * 获取待发布章节
     * 条件：有内容 + status = 'audited' + 未发布
     */
    async getPendingPublish(filter = {}) {
        const { workId, chapterNumber, limit = 10 } = filter;
        const params = [];
        let sql = `
      SELECT
        c.work_id as workId,
        w.title as workTitle,
        c.chapter_number as chapterNumber,
        c.title as chapterTitle,
        c.content,
        c.word_count as wordCount,
        c.status as status,
        c.audit_score as auditScore,
        c.suggested_action as suggestedAction
      FROM chapters c
      JOIN works w ON c.work_id = w.id
      WHERE c.content IS NOT NULL
        AND c.content != ''
        AND c.status = 'audited'
    `;
        if (workId) {
            sql += ' AND c.work_id = ?';
            params.push(workId);
        }
        if (chapterNumber) {
            sql += ' AND c.chapter_number = ?';
            params.push(chapterNumber);
        }
        // 直接拼接 LIMIT，避免 MySQL prepared statement 问题
        const safeLimit = Math.min(Math.max(1, limit), 1000);
        sql += ` ORDER BY c.work_id, c.chapter_number LIMIT ${safeLimit}`;
        return await this.db.query(sql, params);
    }
    /**
     * 获取待处理章节（流水线用）
     * 条件：有内容 + 未发布
     */
    async getPendingProcess(filter = {}) {
        const { workId, chapterRange, limit = 100 } = filter;
        const params = [];
        console.log('[ChapterRepository] getPendingProcess filter:', JSON.stringify(filter));
        let sql = `
      SELECT
        c.work_id as workId,
        w.title as workTitle,
        c.chapter_number as chapterNumber,
        c.title as chapterTitle,
        c.content,
        c.word_count as wordCount,
        c.status as status,
        c.audit_score as auditScore,
        c.suggested_action as suggestedAction
      FROM chapters c
      JOIN works w ON c.work_id = w.id
      WHERE c.content IS NOT NULL
        AND LENGTH(c.content) > 100
        AND c.status != 'published'
    `;
        if (workId) {
            sql += ' AND c.work_id = ?';
            params.push(workId);
        }
        if (chapterRange) {
            sql += ' AND c.chapter_number BETWEEN ? AND ?';
            params.push(chapterRange[0], chapterRange[1]);
        }
        // 直接拼接 LIMIT，避免 MySQL prepared statement 问题
        const safeLimit = Math.min(Math.max(1, limit), 1000);
        sql += ` ORDER BY c.work_id, c.chapter_number LIMIT ${safeLimit}`;
        console.log('[ChapterRepository] SQL:', sql);
        console.log('[ChapterRepository] params:', params);
        const results = await this.db.query(sql, params);
        console.log('[ChapterRepository] 结果数量:', results.length);
        return results;
    }
    /**
     * 更新发布状态
     */
    async updatePublishStatus(workId, chapterNumber, status) {
        // 获取章节 ID
        const chapter = await this.db.queryOne('SELECT id FROM chapters WHERE work_id = ? AND chapter_number = ?', [workId, chapterNumber]);
        if (chapter) {
            // 使用状态机服务更新状态
            try {
                const { getChapterStateMachine } = require('../state-machine');
                const stateMachine = getChapterStateMachine();
                await stateMachine.transition(chapter.id, 'audited', 'published', { metadata: { publishStatus: status } });
            }
            catch (error) {
                // 如果状态机服务不可用，回退到直接更新 status 列
                console.warn('状态机服务不可用，使用直接更新', error);
                await this.db.execute(`UPDATE chapters SET status = ? WHERE work_id = ? AND chapter_number = ?`, ['published', workId, chapterNumber]);
            }
        }
    }
    /**
     * 更新审核状态
     */
    async updateAuditStatus(workId, chapterNumber, status, issues) {
        await this.db.execute(`UPDATE chapters
       SET audit_score = ?, suggested_action = ?
       WHERE work_id = ? AND chapter_number = ?`, [status || null, issues || null, workId, chapterNumber]);
    }
    /**
     * 更新润色状态
     */
    async updatePolishStatus(workId, chapterNumber, status, polishedContent) {
        // 由于没有 polish_status 列，只更新内容
        if (polishedContent) {
            await this.db.execute(`UPDATE chapters
       SET content = ?
       WHERE work_id = ? AND chapter_number = ?`, [polishedContent, workId, chapterNumber]);
        }
    }
    /**
     * 获取章节内容
     */
    async getChapterContent(workId, chapterNumber) {
        const row = await this.db.queryOne('SELECT content FROM chapters WHERE work_id = ? AND chapter_number = ?', [workId, chapterNumber]);
        return row?.content || null;
    }
}
exports.ChapterRepository = ChapterRepository;
// 单例
let instance = null;
function getChapterRepository() {
    if (!instance) {
        instance = new ChapterRepository();
    }
    return instance;
}
//# sourceMappingURL=ChapterRepository.js.map