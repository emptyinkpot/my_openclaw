/**
 * 简单验证脚本 - 检查新文件是否正确创建
 */

const path = require('path');
const fs = require('fs');

console.log('🧪 验证章节标题管理器文件...\n');

// 检查的文件列表
const filesToCheck = [
  path.join(__dirname, '../chapter-title-manager.ts'),
  path.join(__dirname, '../index.ts'),
  path.join(__dirname, './chapter-title-manager.test.ts')
];

let allOk = true;

for (const file of filesToCheck) {
  const fileName = path.basename(file);
  if (fs.existsSync(file)) {
    console.log(`✅ ${fileName} - 存在`);
  } else {
    console.log(`❌ ${fileName} - 不存在`);
    allOk = false;
  }
}

console.log('\n📂 database 模块新结构：');
console.log('   extensions/core/database/');
console.log('   ├── __tests__/');
console.log('   │   ├── manager.test.ts');
console.log('   │   ├── simple-test.js');
console.log('   │   ├── chapter-title-manager.test.ts  🆕');
console.log('   │   └── simple-verify.js          🆕');
console.log('   ├── chapter-title-manager.ts      🆕');
console.log('   ├── index.ts');
console.log('   └── manager.ts\n');

if (allOk) {
  console.log('🎉 所有文件创建成功！');
  console.log('📝 功能说明：');
  console.log('   1. chapter-title-manager.ts - 章节标题管理器主文件');
  console.log('      - autoFillAllMissingTitles() - 自动补充所有缺失标题的章节');
  console.log('      - autoFillChapterTitle() - 自动补充单个章节标题');
  console.log('      - improveOutlineMatching() - 完善大纲匹配功能');
  console.log('   2. index.ts - 已更新，导出新模块');
  console.log('   3. chapter-title-manager.test.ts - 测试脚本\n');
} else {
  console.log('❌ 部分文件创建失败！\n');
  process.exit(1);
}

process.exit(0);
