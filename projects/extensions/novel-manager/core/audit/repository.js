"use strict";
/**
 * 瀹＄妯″潡 - 鏁版嵁璁块棶灞?
 * 璐熻矗鎵€鏈夋暟鎹簱鎿嶄綔锛屼綆鑰﹀悎
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPendingAuditChapters = getPendingAuditChapters;
exports.getChapter = getChapter;
exports.getWork = getWork;
exports.updateChapterStatus = updateChapterStatus;
exports.saveAuditResult = saveAuditResult;
exports.getAuditResult = getAuditResult;
exports.updateChapterContent = updateChapterContent;
const database_1 = require("../../../core/database");
const logger_1 = require("../utils/logger");
const db = (0, database_1.getDatabaseManager)();
/**
 * 鑾峰彇寰呭鏍哥殑绔犺妭鍒楄〃
 */
async function getPendingAuditChapters(options) {
    let sql = `
    SELECT c.id, c.work_id, c.chapter_number, c.title, c.content, c.status
    FROM chapters c
    WHERE c.status = 'polished'
  `;
    const params = [];
    if (options.workId) {
        sql += ' AND c.work_id = ?';
        params.push(options.workId);
    }
    if (options.chapterRange) {
        sql += ' AND c.chapter_number BETWEEN ? AND ?';
        params.push(options.chapterRange[0], options.chapterRange[1]);
    }
    sql += ' ORDER BY c.work_id, c.chapter_number';
    const rows = await db.query(sql, params);
    return rows.map((row) => ({
        id: row.id,
        workId: row.work_id,
        chapterNumber: row.chapter_number,
        title: row.title,
        content: row.content,
        status: row.status,
    }));
}
/**
 * 鑾峰彇绔犺妭璇︽儏
 */
async function getChapter(workId, chapterNumber) {
    const row = await db.queryOne(`
    SELECT id, work_id, chapter_number, title, content, status
    FROM chapters
    WHERE work_id = ? AND chapter_number = ?
  `, [workId, chapterNumber]);
    if (!row)
        return null;
    return {
        id: row.id,
        workId: row.work_id,
        chapterNumber: row.chapter_number,
        title: row.title,
        content: row.content,
        status: row.status,
    };
}
/**
 * 鑾峰彇浣滃搧淇℃伅
 */
async function getWork(workId) {
    const row = await db.queryOne(`
    SELECT id, title, status
    FROM works
    WHERE id = ?
  `, [workId]);
    if (!row)
        return null;
    return {
        id: row.id,
        title: row.title,
        status: row.status,
    };
}
/**
 * 鏇存柊绔犺妭鐘舵€?
 */
async function updateChapterStatus(workId, chapterNumber, status) {
    // 鑾峰彇绔犺妭 ID
    const chapter = await db.queryOne('SELECT id FROM chapters WHERE work_id = ? AND chapter_number = ?', [workId, chapterNumber]);
    if (!chapter) {
        logger_1.logger.warn(`鏈壘鍒扮珷鑺? workId=${workId}, chapter=${chapterNumber}`);
        return;
    }
    // 浣跨敤鐘舵€佹満鏈嶅姟鏇存柊鐘舵€?
    try {
        const { getChapterStateMachine } = require('../state-machine');
        const stateMachine = getChapterStateMachine();
        const reason = status === 'audited' ? 'audit_passed' : 'manual_adjustment';
        await stateMachine.transition(chapter.id, status, reason, { metadata: { auditResult: status === 'audited' ? 'passed' : 'other' } });
    }
    catch (error) {
        // 濡傛灉鐘舵€佹満鏈嶅姟涓嶅彲鐢紝鍥為€€鍒扮洿鎺ユ洿鏂?
        logger_1.logger.warn('鐘舵€佹満鏈嶅姟涓嶅彲鐢紝浣跨敤鐩存帴鏇存柊', error);
        await db.execute(`
      UPDATE chapters SET status = ?, updated_at = NOW()
      WHERE work_id = ? AND chapter_number = ?
    `, [status, workId, chapterNumber]);
        logger_1.logger.info(`宸叉洿鏂扮珷鑺傜姸鎬? workId=${workId}, chapter=${chapterNumber}, status=${status}`);
    }
}
/**
 * 淇濆瓨瀹℃牳缁撴灉
 */
async function saveAuditResult(workId, chapterNumber, auditStatus, auditIssues, suggestedAction) {
    const issuesJson = JSON.stringify(auditIssues);
    await db.execute(`
    UPDATE chapters 
    SET audit_status = ?, audit_issues = ?, suggested_action = ?, updated_at = NOW()
    WHERE work_id = ? AND chapter_number = ?
  `, [auditStatus, issuesJson, suggestedAction, workId, chapterNumber]);
    logger_1.logger.info(`宸蹭繚瀛樺鏍哥粨鏋? workId=${workId}, chapter=${chapterNumber}, status=${auditStatus}`);
}
/**
 * 鑾峰彇瀹℃牳缁撴灉
 */
async function getAuditResult(workId, chapterNumber) {
    const row = await db.queryOne(`
    SELECT audit_status, audit_issues, suggested_action
    FROM chapters
    WHERE work_id = ? AND chapter_number = ?
  `, [workId, chapterNumber]);
    if (!row)
        return null;
    return {
        auditStatus: row.audit_status || 'pending',
        auditIssues: row.audit_issues ? JSON.parse(row.audit_issues) : [],
        suggestedAction: row.suggested_action || 'none',
    };
}
/**
 * 鏇存柊绔犺妭鍐呭
 */
async function updateChapterContent(workId, chapterNumber, content) {
    await db.execute(`
    UPDATE chapters 
    SET content = ?, word_count = ?, updated_at = NOW()
    WHERE work_id = ? AND chapter_number = ?
  `, [content, content.length, workId, chapterNumber]);
    logger_1.logger.info(`宸叉洿鏂扮珷鑺傚唴瀹? workId=${workId}, chapter=${chapterNumber}`);
}
//# sourceMappingURL=repository.js.map

