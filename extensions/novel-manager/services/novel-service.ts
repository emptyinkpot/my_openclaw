/**
 * 小说数据服务
 */

import { getDatabaseManager, withTransaction } from '../core/database';

export interface NovelFilter {
  status?: string;
  platform?: string;
  search?: string;
}

export interface NovelStats {
  works: number;
  chapters: number;
  totalWords: number;
  has_content: number;
  outlines: number;
  characters: number;
}

export class NovelService {
  private db = getDatabaseManager();
  
  /**
   * 获取所有作品
   */
  async getWorks(filter?: NovelFilter) {
    let sql = `
      SELECT w.*, 
        COUNT(c.id) as chapter_count,
        SUM(CASE WHEN c.content IS NOT NULL AND LENGTH(c.content) > 100 THEN 1 ELSE 0 END) as has_content_count
      FROM works w
      LEFT JOIN chapters c ON w.id = c.work_id
    `;
    
    const conditions: string[] = [];
    const params: any[] = [];
    
    if (filter?.status) {
      conditions.push('w.status = ?');
      params.push(filter.status);
    }
    
    if (filter?.platform) {
      conditions.push('w.platform = ?');
      params.push(filter.platform);
    }
    
    if (filter?.search) {
      conditions.push('(w.title LIKE ? OR w.description LIKE ?)');
      params.push(`%${filter.search}%`, `%${filter.search}%`);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' GROUP BY w.id ORDER BY w.id';
    
    return await this.db.query(sql, params);
  }
  
  /**
   * 获取作品详情
   */
  async getWorkById(id: number) {
    const work = await this.db.queryOne(`
      SELECT w.*, COUNT(c.id) as chapter_count
      FROM works w
      LEFT JOIN chapters c ON w.id = c.work_id
      WHERE w.id = ?
      GROUP BY w.id
    `, [id]);
    
    if (!work) return null;
    
    // 获取章节列表
    const chapters = await this.db.query(`
      SELECT * FROM chapters WHERE work_id = ? ORDER BY chapter_number
    `, [id]);
    
    // 获取角色列表
    const characters = await this.db.query(`
      SELECT * FROM characters WHERE work_id = ? ORDER BY id
    `, [id]);
    
    // 获取卷纲
    const volumes = await this.db.query(`
      SELECT * FROM volume_outlines WHERE work_id = ? ORDER BY volume_number
    `, [id]);
    
    return {
      ...work,
      chapters,
      characters,
      volumes,
    };
  }
  
  /**
   * 获取统计信息
   */
  async getStats(): Promise<NovelStats> {
    const [workStats] = await this.db.query('SELECT COUNT(*) as count FROM works');
    const [chapterStats] = await this.db.query('SELECT COUNT(*) as count FROM chapters');
    const [wordStats] = await this.db.query('SELECT SUM(LENGTH(content)) as total FROM chapters WHERE content IS NOT NULL');
    const [hasContentStats] = await this.db.query('SELECT COUNT(*) as count FROM chapters WHERE content IS NOT NULL AND LENGTH(content) > 100');
    const [characterStats] = await this.db.query('SELECT COUNT(*) as count FROM characters');
    
    return {
      works: parseInt(workStats?.count || '0'),
      chapters: parseInt(chapterStats?.count || '0'),
      totalWords: parseInt(wordStats?.total || '0'),
      has_content: parseInt(hasContentStats?.count || '0'),
      outlines: 0,
      characters: parseInt(characterStats?.count || '0'),
    };
  }
  
  /**
   * 导入章节
   */
  async importChapters(workId: number, chapters: Array<{
    number: number;
    title: string;
    content: string;
    word_count?: number;
  }>) {
    return await withTransaction(async (conn) => {
      let imported = 0;
      
      for (const ch of chapters) {
        const [existing]: any = await conn.execute(`
          SELECT id FROM chapters WHERE work_id = ? AND chapter_number = ?
        `, [workId, ch.number]);
        
        if (existing.length === 0) {
          await conn.execute(`
            INSERT INTO chapters (work_id, chapter_number, title, content, word_count, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'draft', NOW(), NOW())
          `, [
            workId,
            ch.number,
            ch.title || null,
            ch.content || null,
            ch.word_count || ch.content?.length || 0,
          ]);
          imported++;
        }
      }
      
      // 更新作品章节数
      await conn.execute(`
        UPDATE works SET current_chapters = (
          SELECT COUNT(*) FROM chapters WHERE work_id = ?
        ), updated_at = NOW() WHERE id = ?
      `, [workId, workId]);
      
      return imported;
    });
  }
}
