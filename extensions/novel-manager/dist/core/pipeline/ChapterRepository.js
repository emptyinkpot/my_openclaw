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
     * 获取待发布章节
     * 条件：有内容 + 已润色 + 审核通过 + 未发布
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
        c.polish_status as polishStatus,
        c.audit_status as auditStatus,
        c.publish_status as publishStatus
      FROM chapters c
      JOIN works w ON c.work_id = w.id
      WHERE c.content IS NOT NULL 
        AND c.content != ''
        AND c.polish_status = 'polished'
        AND c.audit_status = 'passed'
        AND (c.publish_status IS NULL OR c.publish_status != 'published')
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
        c.polish_status as polishStatus,
        c.audit_status as auditStatus,
        c.publish_status as publishStatus
      FROM chapters c
      JOIN works w ON c.work_id = w.id
      WHERE c.content IS NOT NULL 
        AND LENGTH(c.content) > 100
    `;
        if (workId) {
            sql += ' AND c.work_id = ?';
            params.push(workId);
        }
        if (chapterRange) {
            sql += ' AND c.chapter_number BETWEEN ? AND ?';
            params.push(chapterRange[0], chapterRange[1]);
        }
        sql += " AND (c.publish_status IS NULL OR c.publish_status != 'published')";
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
        await this.db.execute(`UPDATE chapters 
       SET publish_status = ?, published_at = NOW() 
       WHERE work_id = ? AND chapter_number = ?`, [status, workId, chapterNumber]);
    }
    /**
     * 更新审核状态
     */
    async updateAuditStatus(workId, chapterNumber, status, issues) {
        await this.db.execute(`UPDATE chapters 
       SET audit_status = ?, audit_issues = ?, audited_at = NOW() 
       WHERE work_id = ? AND chapter_number = ?`, [status, issues || null, workId, chapterNumber]);
    }
    /**
     * 更新润色状态
     */
    async updatePolishStatus(workId, chapterNumber, status, polishedContent) {
        await this.db.execute(`UPDATE chapters 
       SET polish_status = ?, polished_content = ?, polished_at = NOW() 
       WHERE work_id = ? AND chapter_number = ?`, [status, polishedContent || null, workId, chapterNumber]);
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