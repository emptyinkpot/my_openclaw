#!/usr/bin/env node
/**
 * 导入章节正文（优化版）
 * 只更新content字段，不删除任何数据
 */
const { NovelDB } = require('../utils/db-helper');
const fs = require('fs');

const dbConfig = {
  host: 'sh-cynosdbmysql-grp-1kbg1xh0.sql.tencentcdb.com',
  port: 22295,
  user: 'openclaw',
  password: 'Lgp15237257500',
  database: 'cloudbase-4glvyyq9f61b19cd',
  charset: 'utf8mb4'
};

async function importContent(jsonFile, workId) {
  const db = await new NovelDB(dbConfig).connect();
  
  try {
    const chapters = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    console.log(`准备导入正文到作品ID=${workId}\n`);
    
    // 前置检查
    const status = await db.checkWorkStatus(workId);
    console.log('现有数据状态:');
    console.log(`  总章节: ${status.totalChapters}`);
    console.log(`  有正文: ${status.withContent}章`);
    console.log(`  空章节: ${status.emptyChapters}章\n`);
    
    // 确保章节记录存在（创建占位）
    console.log('确保章节记录存在...');
    for (const ch of chapters) {
      const volNum = Math.ceil(ch.number / 40);
      await db.ensureChapterExists(workId, ch.number, ch.title, volNum);
    }
    
    // 导入正文
    console.log('导入正文内容...\n');
    const result = await db.importContentSafe(workId, chapters);
    
    console.log(`\n✅ 完成:`);
    console.log(`  已更新: ${result.updated}章`);
    console.log(`  跳过(内容过短): ${result.skipped}章`);
    
    // 更新作品状态
    const newStatus = await db.checkWorkStatus(workId);
    await db.conn.execute(
      'UPDATE works SET current_chapters = ?, status = ? WHERE id = ?',
      [newStatus.withContent, 'ongoing', workId]
    );
    
    console.log(`\n作品状态更新: ${newStatus.withContent}章正文`);
    
  } catch (err) {
    console.error('❌ 错误:', err.message);
  } finally {
    await db.close();
  }
}

// 用法: node import-content.js <json文件> <workId>
const [,, jsonFile, workId] = process.argv;
if (!jsonFile || !workId) {
  console.log('用法: node import-content.js <json文件> <作品ID>');
  process.exit(1);
}

importContent(jsonFile, parseInt(workId));
