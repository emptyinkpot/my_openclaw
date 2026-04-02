/**
 * 绔犺妭鏁版嵁浠撳簱
 * 缁熶竴绔犺妭鐩稿叧鐨勬暟鎹闂€昏緫
 * 
 * 鑱岃矗锛氬皝瑁呮墍鏈夌珷鑺傜浉鍏崇殑鏁版嵁搴撴搷浣? */

import { getDatabaseManager } from '../../../core/database';

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
   * 鑾峰彇浣滃搧淇℃伅
   */
  async getWorkInfo(workId: number): Promise<{ id: number; title: string } | null> {
    const results = await this.db.query<{ id: number; title: string }>(
      'SELECT id, title FROM works WHERE id = ? LIMIT 1',
      [workId]
    );
    return results.length > 0 ? results[0] : null;
  }

  /**
   * 鎸夌珷鑺傚彿鑾峰彇绔犺妭鍐呭锛堢敤浜庡彂甯冿級
   * 鏉′欢锛氭湁鍐呭 + status = 'audited'
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
        AND c.status = 'audited'
      LIMIT 1
    `;
    
    const results = await this.db.query<ChapterData>(sql, [workId, chapterNumber]);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * 鑾峰彇寰呭彂甯冪珷鑺?   * 鏉′欢锛氭湁鍐呭 + status = 'audited'
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

    // 鐩存帴鎷兼帴 LIMIT锛岄伩鍏?MySQL prepared statement 闂
    const safeLimit = Math.min(Math.max(1, limit), 1000);
    sql += ` ORDER BY c.work_id, c.chapter_number LIMIT ${safeLimit}`;

    return await this.db.query<ChapterData>(sql, params);
  }

  /**
   * 鑾峰彇寰呭鐞嗙珷鑺傦紙娴佹按绾跨敤锛?   * 鏉′欢锛氭湁鍐呭
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
    
    // 鐩存帴鎷兼帴 LIMIT锛岄伩鍏?MySQL prepared statement 闂
    const safeLimit = Math.min(Math.max(1, limit), 1000);
    sql += ` ORDER BY c.work_id, c.chapter_number LIMIT ${safeLimit}`;

    console.log('[ChapterRepository] SQL:', sql);
    console.log('[ChapterRepository] params:', params);

    const results = await this.db.query<ChapterData>(sql, params);
    console.log('[ChapterRepository] 缁撴灉鏁伴噺:', results.length);
    return results;
  }

  /**
   * 鏇存柊鍙戝竷鐘舵€?   * 鏉′欢锛氭洿鏂?status 鍜?published_at
   */
  async updatePublishStatus(workId: number, chapterNumber: number, status: string): Promise<void> {
    await this.db.execute(
      `UPDATE chapters 
       SET status = ?, published_at = NOW() 
       WHERE work_id = ? AND chapter_number = ?`,
      [status, workId, chapterNumber]
    );
  }

  /**
   * 鏇存柊瀹℃牳鐘舵€?   */
  async updateAuditStatus(workId: number, chapterNumber: number, status: string, issues?: string): Promise<void> {
    await this.db.execute(
      `UPDATE chapters 
       SET audit_status = ?, audit_issues = ?, audited_at = NOW() 
       WHERE work_id = ? AND chapter_number = ?`,
      [status, issues || null, workId, chapterNumber]
    );
  }

  /**
   * 鏇存柊娑﹁壊鐘舵€?   */
  async updatePolishStatus(workId: number, chapterNumber: number, status: string, polishedContent?: string): Promise<void> {
    await this.db.execute(
      `UPDATE chapters 
       SET polish_status = ?, polished_content = ?, polished_at = NOW() 
       WHERE work_id = ? AND chapter_number = ?`,
      [status, polishedContent || null, workId, chapterNumber]
    );
  }

  /**
   * 鑾峰彇绔犺妭鍐呭
   */
  async getChapterContent(workId: number, chapterNumber: number): Promise<string | null> {
    const row = await this.db.queryOne<{ content: string }>(
      'SELECT content FROM chapters WHERE work_id = ? AND chapter_number = ?',
      [workId, chapterNumber]
    );
    return row?.content || null;
  }
}

// 鍗曚緥
let instance: ChapterRepository | null = null;

export function getChapterRepository(): ChapterRepository {
  if (!instance) {
    instance = new ChapterRepository();
  }
  return instance;
}

