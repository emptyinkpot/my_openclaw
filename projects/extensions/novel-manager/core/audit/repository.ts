
/**
 * 审稿模块 - 数据访问层
 * 负责所有数据库操作，低耦合
 */

import { getDatabaseManager } from '../../../core/database';
import { ChapterData, WorkData, AuditStatus, SuggestedAction, AuditIssue } from './types';
import { logger } from '../utils/logger';

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
    WHERE c.status = 'polished'
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
  // 获取章节 ID
  const chapter = await db.queryOne(
    'SELECT id FROM chapters WHERE work_id = ? AND chapter_number = ?',
    [workId, chapterNumber]
  );

  if (!chapter) {
    logger.warn(`未找到章节: workId=${workId}, chapter=${chapterNumber}`);
    return;
  }

  // 使用状态机服务更新状态
  try {
    const { getChapterStateMachine } = require('../state-machine');
    const stateMachine = getChapterStateMachine();
    
    const reason = status === 'audited' ? 'audit_passed' : 'manual_adjustment';
    await stateMachine.transition(
      chapter.id,
      status as any,
      reason as any,
      { metadata: { auditResult: status === 'audited' ? 'passed' : 'other' } }
    );
  } catch (error) {
    // 如果状态机服务不可用，回退到直接更新
    logger.warn('状态机服务不可用，使用直接更新', error);
    await db.execute(`
      UPDATE chapters SET status = ?, updated_at = NOW()
      WHERE work_id = ? AND chapter_number = ?
    `, [status, workId, chapterNumber]);
    logger.info(`已更新章节状态: workId=${workId}, chapter=${chapterNumber}, status=${status}`);
  }
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
  
  // 动态构建 UPDATE 语句，只更新存在的字段
  const updates: string[] = [];
  const params: any[] = [];
  
  // 检查 audit_status 字段是否存在
  try {
    const [auditStatusCheck] = await db.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chapters' AND COLUMN_NAME = 'audit_status'
    `);
    if (auditStatusCheck[0].cnt > 0) {
      updates.push('audit_status = ?');
      params.push(auditStatus);
    }
  } catch (e) {
    console.warn('[AuditRepository] 检查 audit_status 字段失败:', e.message);
  }
  
  // 检查 audit_issues 字段是否存在
  try {
    const [auditIssuesCheck] = await db.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chapters' AND COLUMN_NAME = 'audit_issues'
    `);
    if (auditIssuesCheck[0].cnt > 0) {
      updates.push('audit_issues = ?');
      params.push(issuesJson);
    }
  } catch (e) {
    console.warn('[AuditRepository] 检查 audit_issues 字段失败:', e.message);
  }
  
  // 检查 suggested_action 字段是否存在
  try {
    const [suggestedActionCheck] = await db.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chapters' AND COLUMN_NAME = 'suggested_action'
    `);
    if (suggestedActionCheck[0].cnt > 0) {
      updates.push('suggested_action = ?');
      params.push(suggestedAction);
    }
  } catch (e) {
    console.warn('[AuditRepository] 检查 suggested_action 字段失败:', e.message);
  }
  
  // 如果有要更新的字段，执行更新
  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    params.push(workId, chapterNumber);
    
    await db.execute(`
      UPDATE chapters 
      SET ${updates.join(', ')}
      WHERE work_id = ? AND chapter_number = ?
    `, params);
    
    logger.info(`已保存审核结果: workId=${workId}, chapter=${chapterNumber}, status=${auditStatus}`);
  } else {
    logger.info(`没有可更新的审核字段，跳过保存: workId=${workId}, chapter=${chapterNumber}`);
  }
}

/**
 * 获取审核结果
 */
export async function getAuditResult(workId: number, chapterNumber: number): Promise<{
  auditStatus: AuditStatus;
  auditIssues: AuditIssue[];
  suggestedAction: SuggestedAction;
} | null> {
  // 动态构建 SELECT 语句，只查询存在的字段
  const fields: string[] = [];
  
  // 检查 audit_status 字段是否存在
  try {
    const [auditStatusCheck] = await db.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chapters' AND COLUMN_NAME = 'audit_status'
    `);
    if (auditStatusCheck[0].cnt > 0) {
      fields.push('audit_status');
    }
  } catch (e) {
    console.warn('[AuditRepository] 检查 audit_status 字段失败:', e.message);
  }
  
  // 检查 audit_issues 字段是否存在
  try {
    const [auditIssuesCheck] = await db.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chapters' AND COLUMN_NAME = 'audit_issues'
    `);
    if (auditIssuesCheck[0].cnt > 0) {
      fields.push('audit_issues');
    }
  } catch (e) {
    console.warn('[AuditRepository] 检查 audit_issues 字段失败:', e.message);
  }
  
  // 检查 suggested_action 字段是否存在
  try {
    const [suggestedActionCheck] = await db.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chapters' AND COLUMN_NAME = 'suggested_action'
    `);
    if (suggestedActionCheck[0].cnt > 0) {
      fields.push('suggested_action');
    }
  } catch (e) {
    console.warn('[AuditRepository] 检查 suggested_action 字段失败:', e.message);
  }
  
  // 如果没有字段，返回 null
  if (fields.length === 0) {
    return null;
  }
  
  const row = await db.queryOne(`
    SELECT ${fields.join(', ')}
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
