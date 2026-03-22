"use strict";
/**
 * 审稿模块 - 数据访问层
 * 负责所有数据库操作，低耦合
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPendingAuditChapters = getPendingAuditChapters;
exports.getChapter = getChapter;
exports.getWork = getWork;
exports.updateChapterStatus = updateChapterStatus;
exports.saveAuditResult = saveAuditResult;
exports.getAuditResult = getAuditResult;
exports.updateChapterContent = updateChapterContent;
const database_1 = require("../database");
const logger_1 = require("../../plugins/novel-manager/utils/logger");
const db = (0, database_1.getDatabaseManager)();
/**
 * 获取待审核的章节列表
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
 * 获取章节详情
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
 * 获取作品信息
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
 * 更新章节状态
 */
async function updateChapterStatus(workId, chapterNumber, status) {
    // 获取章节 ID
    const chapter = await db.queryOne('SELECT id FROM chapters WHERE work_id = ? AND chapter_number = ?', [workId, chapterNumber]);
    if (!chapter) {
        logger_1.logger.warn(`未找到章节: workId=${workId}, chapter=${chapterNumber}`);
        return;
    }
    // 使用状态机服务更新状态
    try {
        const { getChapterStateMachine } = require('../state-machine');
        const stateMachine = getChapterStateMachine();
        const reason = status === 'audited' ? 'audit_passed' : 'manual_adjustment';
        await stateMachine.transition(chapter.id, status, reason, { metadata: { auditResult: status === 'audited' ? 'passed' : 'other' } });
    }
    catch (error) {
        // 如果状态机服务不可用，回退到直接更新
        logger_1.logger.warn('状态机服务不可用，使用直接更新', error);
        await db.execute(`
      UPDATE chapters SET status = ?, updated_at = NOW()
      WHERE work_id = ? AND chapter_number = ?
    `, [status, workId, chapterNumber]);
        logger_1.logger.info(`已更新章节状态: workId=${workId}, chapter=${chapterNumber}, status=${status}`);
    }
}
/**
 * 保存审核结果
 */
async function saveAuditResult(workId, chapterNumber, auditStatus, auditIssues, suggestedAction) {
    const issuesJson = JSON.stringify(auditIssues);
    await db.execute(`
    UPDATE chapters 
    SET audit_status = ?, audit_issues = ?, suggested_action = ?, updated_at = NOW()
    WHERE work_id = ? AND chapter_number = ?
  `, [auditStatus, issuesJson, suggestedAction, workId, chapterNumber]);
    logger_1.logger.info(`已保存审核结果: workId=${workId}, chapter=${chapterNumber}, status=${auditStatus}`);
}
/**
 * 获取审核结果
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
 * 更新章节内容
 */
async function updateChapterContent(workId, chapterNumber, content) {
    await db.execute(`
    UPDATE chapters 
    SET content = ?, word_count = ?, updated_at = NOW()
    WHERE work_id = ? AND chapter_number = ?
  `, [content, content.length, workId, chapterNumber]);
    logger_1.logger.info(`已更新章节内容: workId=${workId}, chapter=${chapterNumber}`);
}
//# sourceMappingURL=repository.js.map