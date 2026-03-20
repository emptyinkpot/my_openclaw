#!/usr/bin/env node

console.log('🔍 检查 workId 7...');

const { getDatabaseManager } = require('./extensions/novel-manager/dist/core/database');

async function check() {
  try {
    const db = getDatabaseManager();
    
    console.log('\n📚 查询作品信息 (workId 7)...');
    const work = await db.queryOne('SELECT * FROM works WHERE id = ?', [7]);
    console.log('作品:', work ? JSON.stringify(work, null, 2) : '未找到');
    
    console.log('\n📖 查询章节列表...');
    const chapters = await db.query('SELECT chapter_number, title, word_count, publish_status FROM chapters WHERE work_id = 7 ORDER BY chapter_number');
    console.log('章节数:', chapters.length);
    chapters.forEach((ch, i) => {
      console.log(`  ${i + 1}. 第${ch.chapter_number}章: ${ch.title} (${ch.word_count}字, 状态: ${ch.publish_status || 'draft'})`);
    });
    
    console.log('\n📝 最新章节:', chapters[chapters.length - 1] ? 
      `第${chapters[chapters.length - 1].chapter_number}章: ${chapters[chapters.length - 1].title}` : '无章节');
    
  } catch (error) {
    console.error('❌ 错误:', error);
  }
}

check();
