#!/usr/bin/env tsx
/**
 * 上传 Polish Resources 到云库（使用 API 路由）
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
console.log('导出时间:', data.exportedAt);
console.log('来源:', data.source);
console.log('词汇数量:', data.vocabulary?.length || 0);
console.log('文献数量:', data.literature?.length || 0);
console.log('禁用词数量:', data.bannedWords?.length || 0);
console.log('\n');

// 检查环境变量
console.log('=== 环境变量检查 ===');
console.log('COZE_SUPABASE_URL:', process.env.COZE_SUPABASE_URL ? '✅ 已设置' : '❌ 未设置');
console.log('COZE_SUPABASE_ANON_KEY:', process.env.COZE_SUPABASE_ANON_KEY ? '✅ 已设置' : '❌ 未设置');
console.log('\n');

// 主函数
async function main() {
  try {
    // 由于我们在沙箱环境中，先展示数据结构
    console.log('📊 数据结构展示');
    console.log('---');
    
    // 词汇示例
    if (data.vocabulary && data.vocabulary.length > 0) {
      console.log('📚 词汇示例（前 5 条）:');
      data.vocabulary.slice(0, 5).forEach((item: any, index: number) => {
        console.log(`  ${index + 1}. ${item.content} (${item.category})`);
      });
      console.log('');
    }
    
    // 文献示例
    if (data.literature && data.literature.length > 0) {
      console.log('📖 文献示例（前 3 条）:');
      data.literature.slice(0, 3).forEach((item: any, index: number) => {
        console.log(`  ${index + 1}. ${item.title} (${item.author || '佚名'})`);
        if (item.tags && item.tags.length > 0) {
          console.log(`     标签: ${item.tags.join(', ')}`);
        }
      });
      console.log('');
    }
    
    // 禁用词示例
    if (data.bannedWords && data.bannedWords.length > 0) {
      console.log('🚫 禁用词示例（前 5 条）:');
      data.bannedWords.slice(0, 5).forEach((item: any, index: number) => {
        console.log(`  ${index + 1}. ${item.content} (${item.category})`);
        if (item.alternative) {
          console.log(`     替代: ${item.alternative}`);
        }
      });
      console.log('');
    }
    
    console.log('✅ 数据准备完成！');
    console.log('');
    console.log('📝 下一步操作:');
    console.log('  1. 启动开发服务器: pnpm dev');
    console.log('  2. 访问资源库页面');
    console.log('  3. 使用前端界面或 API 路由上传数据');
    console.log('');
    console.log('🔗 API 路由:');
    console.log('  - 词汇: /api/main-library');
    console.log('  - 文献: /api/literature');
    console.log('  - 禁用词: /api/banned-words');
    
  } catch (error) {
    console.error('❌ 处理失败:', error);
    process.exit(1);
  }
}

main();
