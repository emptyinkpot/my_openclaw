/**
 * 数据库操作工具库 - 优化版
 * 避免误删数据，使用UPSERT，增加前置检查
 */
const mysql = require('mysql2/promise');

class NovelDB {
  constructor(config) {
    this.config = config;
  }

  async connect() {
    this.conn = await mysql.createConnection(this.config);
    return this;
  }

  async close() {
    if (this.conn) await this.conn.end();
  }

  /**
   * 检查作品数据状态（前置检查）
   */
  async checkWorkStatus(workId) {
    const [chapters] = await this.conn.execute(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN LENGTH(content) > 0 THEN 1 ELSE 0 END) as withContent,
        SUM(CASE WHEN LENGTH(content) = 0 OR content IS NULL THEN 1 ELSE 0 END) as empty
      FROM chapters WHERE work_id = ?`,
      [workId]
    );
    
    const [outlines] = await this.conn.execute(
      'SELECT COUNT(*) as count FROM chapter_outlines WHERE work_id = ?',
      [workId]
    );
    
    return {
      workId,
      totalChapters: chapters[0].total,
      withContent: chapters[0].withContent,
      emptyChapters: chapters[0].empty,
      outlineCount: outlines[0].count
    };
  }

  /**
   * UPSERT章节基础信息（不动content）
   * 用于更新标题、卷号等，保留现有正文
   */
  async upsertChapterInfo(workId, chapterData) {
    const { number, title, volumeNum } = chapterData;
    
    await this.conn.execute(
      `INSERT INTO chapters (work_id, chapter_number, title, volume_number, status)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       volume_number = VALUES(volume_number)`,
      [workId, number, title, volumeNum, 'empty']
    );
  }

  /**
   * 仅更新正文内容
   * 前提：章节记录已存在
   */
  async updateContentOnly(workId, chapterNum, content) {
    await this.conn.execute(
      `UPDATE chapters 
       SET content = ?, word_count = ?, status = ?
       WHERE work_id = ? AND chapter_number = ?`,
      [content, content.length, 'completed', workId, chapterNum]
    );
  }

  /**
   * 插入或更新细纲
   * 完全独立于chapters表的操作
   */
  async upsertOutline(workId, outlineData) {
    const { number, title, plotSummary, characters, volumeNum } = outlineData;
    
    await this.conn.execute(
      `INSERT INTO chapter_outlines 
       (work_id, volume_number, chapter_number, title, plot_summary, characters)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       plot_summary = VALUES(plot_summary),
       characters = VALUES(characters)`,
      [workId, volumeNum, number, title, plotSummary, characters]
    );
  }

  /**
   * 批量导入正文（安全模式）
   * 只更新已有章节，不删除任何数据
   */
  async importContentSafe(workId, chapters) {
    let updated = 0;
    let skipped = 0;
    
    for (const ch of chapters) {
      if (!ch.content || ch.content.length < 100) {
        skipped++;
        continue;
      }
      
      await this.updateContentOnly(workId, ch.number, ch.content);
      updated++;
      
      if (updated % 20 === 0) {
        console.log(`  已更新 ${updated} 章...`);
      }
    }
    
    return { updated, skipped };
  }

  /**
   * 创建章节占位（如果不存在）
   */
  async ensureChapterExists(workId, chapterNum, title, volumeNum) {
    await this.conn.execute(
      `INSERT IGNORE INTO chapters (work_id, chapter_number, title, volume_number, status, word_count)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [workId, chapterNum, title, volumeNum, 'empty']
    );
  }
}

module.exports = { NovelDB };
