"use strict";
/**
 * 绔犺妭鏁版嵁浠撳簱
 * 缁熶竴绔犺妭鐩稿叧鐨勬暟鎹闂€昏緫
 *
 * 鑱岃矗锛氬皝瑁呮墍鏈夌珷鑺傜浉鍏崇殑鏁版嵁搴撴搷浣?
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChapterRepository = void 0;
exports.getChapterRepository = getChapterRepository;
const database_1 = require("../../../core/database");
class ChapterRepository {
    constructor() {
        this.db = (0, database_1.getDatabaseManager)();
    }
    /**
     * 鑾峰彇浣滃搧淇℃伅
     */
    async getWorkInfo(workId) {
        const results = await this.db.query('SELECT id, title FROM works WHERE id = ? LIMIT 1', [workId]);
        return results.length > 0 ? results[0] : null;
    }
    /**
     * 鎸夌珷鑺傚彿鑾峰彇绔犺妭鍐呭锛堢敤浜庡彂甯冿紝涓嶇鍙戝竷鐘舵€侊級
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
        c.polish_status as polishStatus,
        c.audit_status as auditStatus,
        c.publish_status as publishStatus
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
     * 鑾峰彇寰呭彂甯冪珷鑺?
     * 鏉′欢锛氭湁鍐呭 + 宸叉鼎鑹?+ 瀹℃牳閫氳繃 + 鏈彂甯?
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
        // 鐩存帴鎷兼帴 LIMIT锛岄伩鍏?MySQL prepared statement 闂
        const safeLimit = Math.min(Math.max(1, limit), 1000);
        sql += ` ORDER BY c.work_id, c.chapter_number LIMIT ${safeLimit}`;
        return await this.db.query(sql, params);
    }
    /**
     * 鑾峰彇寰呭鐞嗙珷鑺傦紙娴佹按绾跨敤锛?
     * 鏉′欢锛氭湁鍐呭 + 鏈彂甯?
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
        // 鐩存帴鎷兼帴 LIMIT锛岄伩鍏?MySQL prepared statement 闂
        const safeLimit = Math.min(Math.max(1, limit), 1000);
        sql += ` ORDER BY c.work_id, c.chapter_number LIMIT ${safeLimit}`;
        console.log('[ChapterRepository] SQL:', sql);
        console.log('[ChapterRepository] params:', params);
        const results = await this.db.query(sql, params);
        console.log('[ChapterRepository] 缁撴灉鏁伴噺:', results.length);
        return results;
    }
    /**
     * 鏇存柊鍙戝竷鐘舵€?
     */
    async updatePublishStatus(workId, chapterNumber, status) {
        await this.db.execute(`UPDATE chapters 
       SET publish_status = ?, published_at = NOW() 
       WHERE work_id = ? AND chapter_number = ?`, [status, workId, chapterNumber]);
    }
    /**
     * 鏇存柊瀹℃牳鐘舵€?
     */
    async updateAuditStatus(workId, chapterNumber, status, issues) {
        await this.db.execute(`UPDATE chapters 
       SET audit_status = ?, audit_issues = ?, audited_at = NOW() 
       WHERE work_id = ? AND chapter_number = ?`, [status, issues || null, workId, chapterNumber]);
    }
    /**
     * 鏇存柊娑﹁壊鐘舵€?
     */
    async updatePolishStatus(workId, chapterNumber, status, polishedContent) {
        await this.db.execute(`UPDATE chapters 
       SET polish_status = ?, polished_content = ?, polished_at = NOW() 
       WHERE work_id = ? AND chapter_number = ?`, [status, polishedContent || null, workId, chapterNumber]);
    }
    /**
     * 鑾峰彇绔犺妭鍐呭
     */
    async getChapterContent(workId, chapterNumber) {
        const row = await this.db.queryOne('SELECT content FROM chapters WHERE work_id = ? AND chapter_number = ?', [workId, chapterNumber]);
        return row?.content || null;
    }
}
exports.ChapterRepository = ChapterRepository;
// 鍗曚緥
let instance = null;
function getChapterRepository() {
    if (!instance) {
        instance = new ChapterRepository();
    }
    return instance;
}
//# sourceMappingURL=ChapterRepository.js.map
