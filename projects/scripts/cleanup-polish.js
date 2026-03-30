/**
 * 清理润色文件 - 只保留最新3组
 * 
 * 使用通用剪贴板模块 lib/utils/clipboard
 * 
 * 使用方式：
 *   node scripts/cleanup-polish.js
 *   node scripts/cleanup-polish.js --dry-run  # 预览模式
 */

const clipboard = require('/workspace/projects/lib/utils/clipboard');

// 解析参数
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

console.log('🧹 清理润色文件');
console.log('目录:', clipboard.getDir('polish'));
console.log('模式:', dryRun ? '预览' : '执行');

const result = clipboard.cleanup({ 
  namespace: 'polish', 
  keepCount: 3, 
  dryRun 
});

console.log('\n📊 结果:');
console.log('  删除:', result.deleted, '个文件');
console.log('  保留:', result.kept.join(', ') || '无');

if (dryRun) {
  console.log('\n🔍 预览模式，未实际删除');
}
