/**
 * 章节数据仓库
 * 统一章节相关的数据访问逻辑
 * 
 * 职责：封装所有章节相关的数据库操作
 */

import { getDatabaseManager } from '../database';

export interface ChapterFilter {
  workId?: number;
  chapterNumber?: number;
  chapterRange?: [number, number];
  polishStatus?: string;
  auditStatus?: string;
  publishStatus?: string;
  hasContent?: boolean;
  limit?: number;
}

export interface ChapterData {
  workId: number;
  workTitle: string;
  chapterNumber: number;
  chapterTitle: string;
  content: string | null;
  wordCount: number;
  polishStatus: string | null;
  auditStatus: string | null;
  publishStatus: string | null;
}

export class ChapterRepository {
  private db = getDatabaseManager();

  /**
   * 获取作品信息
   */
  async getWorkInfo(workId: number): Promise<{ id: number; title: string } | null> {
    const results = await this.db.query<{ id: number; title: string }>(
      'SELECT id, title FROM works WHERE id = ? LIMIT 1',
      [workId]
    );
    return results.length > 0 ? results[0] : null;
  }

  /**
   * 按章节号获取章节内容（用于发布，不管发布状态）
   */
  async getChapterByNumber(workId: number, chapterNumber: number): Promise<ChapterData | null> {
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
    
    const results = await this.db.query<ChapterData>(sql, [workId, chapterNumber]);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * 获取待发布章节
   * 条件：有内容 + 已润色 + 审核通过 + 未发布
   */
  async getPendingPublish(filter: ChapterFilter = {}): Promise<ChapterData[]> {
    const { workId, chapterNumber, limit = 10 } = filter;
    const params: any[] = [];

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

    return await this.db.query<ChapterData>(sql, params);
  }

  /**
   * 获取待处理章节（流水线用）
   * 条件：有内容 + 未发布
   */
  async getPendingProcess(filter: ChapterFilter = {}): Promise<ChapterData[]> {
    const { workId, chapterRange, limit = 100 } = filter;
    const params: any[] = [];

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

    const results = await this.db.query<ChapterData>(sql, params);
    console.log('[ChapterRepository] 结果数量:', results.length);
    return results;
  }

  /**
   * 更新发布状态
   */
  async updatePublishStatus(workId: number, chapterNumber: number, status: string): Promise<void> {
    await this.db.execute(
      `UPDATE chapters 
       SET publish_status = ?, published_at = NOW() 
       WHERE work_id = ? AND chapter_number = ?`,
      [status, workId, chapterNumber]
    );
  }

  /**
   * 更新审核状态
   */
  async updateAuditStatus(workId: number, chapterNumber: number, status: string, issues?: string): Promise<void> {
    await this.db.execute(
      `UPDATE chapters 
       SET audit_status = ?, audit_issues = ?, audited_at = NOW() 
       WHERE work_id = ? AND chapter_number = ?`,
      [status, issues || null, workId, chapterNumber]
    );
  }

  /**
   * 更新润色状态
   */
  async updatePolishStatus(workId: number, chapterNumber: number, status: string, polishedContent?: string): Promise<void> {
    await this.db.execute(
      `UPDATE chapters 
       SET polish_status = ?, polished_content = ?, polished_at = NOW() 
       WHERE work_id = ? AND chapter_number = ?`,
      [status, polishedContent || null, workId, chapterNumber]
    );
  }

  /**
   * 获取章节内容
   */
  async getChapterContent(workId: number, chapterNumber: number): Promise<string | null> {
    const row = await this.db.queryOne<{ content: string }>(
      'SELECT content FROM chapters WHERE work_id = ? AND chapter_number = ?',
      [workId, chapterNumber]
    );
    return row?.content || null;
  }
}

// 单例
let instance: ChapterRepository | null = null;

export function getChapterRepository(): ChapterRepository {
  if (!instance) {
    instance = new ChapterRepository();
  }
  return instance;
}
