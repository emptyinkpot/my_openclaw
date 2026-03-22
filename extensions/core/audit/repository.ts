
/**
 * 审稿模块 - 数据访问层
 * 负责所有数据库操作，低耦合
 */

import { getDatabaseManager } from '../storage/database';
import { ChapterData, WorkData, AuditStatus, SuggestedAction, AuditIssue } from './types';
import { logger } from '../plugins/novel-manager/utils/logger';

const db = getDatabaseManager();

/**
 * 获取待审核的章节列表
 */
export async function getPendingAuditChapters(options: {
  workId?: number;
  chapterRange?: [number, number];
}): Promise<ChapterData[]> {
  let sql = `
    SELECT c.id, c.work_id, c.chapter_number, c.title, c.content, c.status
    FROM chapters c
    WHERE c.status = 'pending'
  `;
  const params: any[] = [];

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
  
  return rows.map((row: any) => ({
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
export async function getChapter(workId: number, chapterNumber: number): Promise<ChapterData | null> {
  const row = await db.queryOne(`
    SELECT id, work_id, chapter_number, title, content, status
    FROM chapters
    WHERE work_id = ? AND chapter_number = ?
  `, [workId, chapterNumber]);

  if (!row) return null;

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
export async function getWork(workId: number): Promise<WorkData | null> {
  const row = await db.queryOne(`
    SELECT id, title, status
    FROM works
    WHERE id = ?
  `, [workId]);

  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    status: row.status,
  };
}

/**
 * 更新章节状态
 */
export async function updateChapterStatus(
  workId: number,
  chapterNumber: number,
  status: string
): Promise<void> {
  await db.execute(`
    UPDATE chapters SET status = ?, updated_at = NOW()
    WHERE work_id = ? AND chapter_number = ?
  `, [status, workId, chapterNumber]);
  
  logger.info(`已更新章节状态: workId=${workId}, chapter=${chapterNumber}, status=${status}`);
}

/**
 * 保存审核结果
 */
export async function saveAuditResult(
  workId: number,
  chapterNumber: number,
  auditStatus: AuditStatus,
  auditIssues: AuditIssue[],
  suggestedAction: SuggestedAction
): Promise<void> {
  const issuesJson = JSON.stringify(auditIssues);
  
  await db.execute(`
    UPDATE chapters 
    SET audit_status = ?, audit_issues = ?, suggested_action = ?, updated_at = NOW()
    WHERE work_id = ? AND chapter_number = ?
  `, [auditStatus, issuesJson, suggestedAction, workId, chapterNumber]);
  
  logger.info(`已保存审核结果: workId=${workId}, chapter=${chapterNumber}, status=${auditStatus}`);
}

/**
 * 获取审核结果
 */
export async function getAuditResult(workId: number, chapterNumber: number): Promise<{
  auditStatus: AuditStatus;
  auditIssues: AuditIssue[];
  suggestedAction: SuggestedAction;
} | null> {
  const row = await db.queryOne(`
    SELECT audit_status, audit_issues, suggested_action
    FROM chapters
    WHERE work_id = ? AND chapter_number = ?
  `, [workId, chapterNumber]);

  if (!row) return null;

  return {
    auditStatus: (row.audit_status as AuditStatus) || 'pending',
    auditIssues: row.audit_issues ? JSON.parse(row.audit_issues) : [],
    suggestedAction: (row.suggested_action as SuggestedAction) || 'none',
  };
}

/**
 * 更新章节内容
 */
export async function updateChapterContent(
  workId: number,
  chapterNumber: number,
  content: string
): Promise<void> {
  await db.execute(`
    UPDATE chapters 
    SET content = ?, word_count = ?, updated_at = NOW()
    WHERE work_id = ? AND chapter_number = ?
  `, [content, content.length, workId, chapterNumber]);
  
  logger.info(`已更新章节内容: workId=${workId}, chapter=${chapterNumber}`);
}
