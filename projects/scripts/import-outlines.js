#!/usr/bin/env node
/**
 * 导入章节细纲（优化版）
 * 只操作chapter_outlines表，不动chapters正文
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

async function importOutlines(jsonFile, workId) {
  const db = await new NovelDB(dbConfig).connect();
  
  try {
    const outlines = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    console.log(`准备导入 ${outlines.length} 章细纲到作品ID=${workId}\n`);
    
    // 前置检查
    const status = await db.checkWorkStatus(workId);
    console.log('现有数据状态:');
    console.log(`  总章节: ${status.totalChapters}`);
    console.log(`  有正文: ${status.withContent}章`);
    console.log(`  空章节: ${status.emptyChapters}章`);
    console.log(`  细纲数: ${status.outlineCount}条\n`);
    
    if (status.withContent > 0) {
      console.log(`⚠️ 警告: 该作品已有 ${status.withContent} 章正文内容`);
      console.log('✓ 本脚本只更新细纲，不会动正文\n');
    }
    
    // 导入细纲（只操作chapter_outlines表）
    let inserted = 0;
    for (const ol of outlines) {
      const volNum = Math.ceil(ol.number / 40); // 每40章一卷
      await db.upsertOutline(workId, {
        number: ol.number,
        title: ol.title,
        plotSummary: ol.plot_summary,
        characters: ol.characters,
        volumeNum: volNum
      });
      inserted++;
    }
    
    console.log(`✅ 已导入/更新 ${inserted} 章细纲`);
    
    // 验证
    const newStatus = await db.checkWorkStatus(workId);
    console.log(`\n验证: chapter_outlines表现在有 ${newStatus.outlineCount} 条记录`);
    console.log(`       chapters表正文未动: ${newStatus.withContent}章`);
    
  } catch (err) {
    console.error('❌ 错误:', err.message);
  } finally {
    await db.close();
  }
}

// 用法: node import-outlines.js <json文件> <workId>
const [,, jsonFile, workId] = process.argv;
if (!jsonFile || !workId) {
  console.log('用法: node import-outlines.js <json文件> <作品ID>');
  process.exit(1);
}

importOutlines(jsonFile, parseInt(workId));
