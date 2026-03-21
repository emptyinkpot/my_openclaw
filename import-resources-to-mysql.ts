#!/usr/bin/env tsx
/**
 * 导入 Polish Resources 到 MySQL 数据库
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 读取 polish-resources JSON 文件
const filePath = path.join(__dirname, 'assets', 'polish-resources-2026-03-21.json');
const rawData = fs.readFileSync(filePath, 'utf-8');
const data = JSON.parse(rawData);

console.log('=== Polish Resources 数据 ===');
console.log('版本:', data.version);
console.log('词汇数量:', data.vocabulary?.length || 0);
console.log('文献数量:', data.literature?.length || 0);
console.log('禁用词数量:', data.bannedWords?.length || 0);
console.log('\n');

// 导入数据库管理器
import { getDatabaseManager } from './extensions/apps/novel-manager/core/data-scan-storage/database';

async function main() {
  try {
    console.log('🚀 开始导入数据到 MySQL...');
    
    const db = getDatabaseManager();
    
    // 创建表（如果不存在）
    console.log('📋 确保表存在...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS vocabulary (
        id INT AUTO_INCREMENT PRIMARY KEY,
        content VARCHAR(500) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'vocabulary',
        category VARCHAR(100) NOT NULL DEFAULT '通用',
        tags JSON,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_content (content)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS literature (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        author VARCHAR(200),
        content TEXT,
        tags JSON,
        note TEXT,
        priority INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS banned_words (
        id INT AUTO_INCREMENT PRIMARY KEY,
        content VARCHAR(500) NOT NULL,
        type VARCHAR(50) NOT NULL,
        category VARCHAR(100) NOT NULL,
        reason TEXT,
        alternative VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_content (content)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 导入词汇
    if (data.vocabulary && data.vocabulary.length > 0) {
      console.log('📚 正在导入词汇...');
      for (const item of data.vocabulary) {
        try {
          await db.execute(
            `INSERT INTO vocabulary (content, type, category, tags, note, created_at) 
             VALUES (?, ?, ?, ?, ?, FROM_UNIXTIME(?))
             ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
            [
              item.content,
              item.type || 'vocabulary',
              item.category || '通用',
              item.tags ? JSON.stringify(item.tags) : null,
              item.note || null,
              Math.floor((item.createdAt || Date.now()) / 1000)
            ]
          );
        } catch (e) {
          console.warn(`⚠️ 跳过词汇 "${item.content}":`, e);
        }
      }
      console.log(`✅ 词汇导入完成！`);
    }
    
    // 导入文献
    if (data.literature && data.literature.length > 0) {
      console.log('📖 正在导入文献...');
      for (const item of data.literature) {
        try {
          await db.execute(
            `INSERT INTO literature (title, author, content, tags, note, priority, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?))`,
            [
              item.title,
              item.author || null,
              item.content || null,
              item.tags ? JSON.stringify(item.tags) : null,
              item.note || null,
              item.priority || null,
              Math.floor((item.createdAt || Date.now()) / 1000)
            ]
          );
        } catch (e) {
          console.warn(`⚠️ 跳过文献 "${item.title}":`, e);
        }
      }
      console.log(`✅ 文献导入完成！`);
    }
    
    // 导入禁用词
    if (data.bannedWords && data.bannedWords.length > 0) {
      console.log('🚫 正在导入禁用词...');
      for (const item of data.bannedWords) {
        try {
          await db.execute(
            `INSERT INTO banned_words (content, type, category, reason, alternative, created_at) 
             VALUES (?, ?, ?, ?, ?, FROM_UNIXTIME(?))
             ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
            [
              item.content,
              item.type || 'modern',
              item.category || '通用',
              item.reason || null,
              item.alternative || null,
              Math.floor((item.createdAt || Date.now()) / 1000)
            ]
          );
        } catch (e) {
          console.warn(`⚠️ 跳禁用词 "${item.content}":`, e);
        }
      }
      console.log(`✅ 禁用词导入完成！`);
    }
    
    // 统计
    const vocabCount = await db.queryOne('SELECT COUNT(*) as count FROM vocabulary');
    const litCount = await db.queryOne('SELECT COUNT(*) as count FROM literature');
    const bannedCount = await db.queryOne('SELECT COUNT(*) as count FROM banned_words');
    
    console.log('\n📊 导入统计:');
    console.log(`  词汇: ${vocabCount?.count || 0} 条`);
    console.log(`  文献: ${litCount?.count || 0} 条`);
    console.log(`  禁用词: ${bannedCount?.count || 0} 条`);
    console.log('\n✅ 数据导入完成！');
    
  } catch (error) {
    console.error('❌ 导入失败:', error);
    process.exit(1);
  }
}

main();
