#!/usr/bin/env tsx
/**
 * 导入 Polish Resources 到 Supabase 数据库
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

// 导入 Supabase 客户端
import { getSupabaseClient } from './extensions/apps/novel-manager/core/content-craft/src/storage/database/supabase-client';

async function main() {
  try {
    console.log('🚀 开始导入数据到 Supabase...');
    
    const client = getSupabaseClient();
    
    // 导入词汇
    if (data.vocabulary && data.vocabulary.length > 0) {
      console.log('📚 正在导入词汇...');
      const entries = data.vocabulary.map((item: any) => ({
        original: item.content,
        replacements: [],
        category: item.category || '通用',
        is_system: true,
        is_hidden: false,
      }));
      
      // 分批插入，每批100条
      const batchSize = 100;
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        const { error } = await client
          .from('main_library_entries')
          .upsert(batch, { onConflict: 'original' });
        
        if (error) {
          console.error('❌ 词汇导入失败:', error);
        } else {
          console.log(`✅ 词汇批次 ${Math.floor(i/batchSize) + 1} 导入成功 (${batch.length} 条)`);
        }
      }
    }
    
    console.log('\n✅ 数据导入完成！');
    
  } catch (error) {
    console.error('❌ 导入失败:', error);
    process.exit(1);
  }
}

main();
