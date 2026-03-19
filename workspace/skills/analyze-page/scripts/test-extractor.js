#!/usr/bin/env node
/**
 * 测试内容提取器
 * 
 * 启动浏览器并测试各种内容提取功能
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// 切换到项目根目录
const projectRoot = '/workspace/projects';
process.chdir(projectRoot);

// 确保模块存在
const contentExtractorPath = path.join(projectRoot, 'auto-scripts/src/utils/content-extractor.js');
const a11yPath = path.join(projectRoot, 'auto-scripts/src/utils/accessibility-tree.js');

if (!fs.existsSync(contentExtractorPath)) {
  console.error('❌ 找不到 content-extractor.js:', contentExtractorPath);
  process.exit(1);
}

const { ContentExtractor } = require(contentExtractorPath);
const { PageAnalyzer, AccessibilityTreeCollector } = require(a11yPath);

async function main() {
  console.log('🚀 启动浏览器...\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // 导航到白梦写作
  console.log('📱 导航到白梦写作...');
  await page.goto('https://baimeng.ai', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  console.log(`当前页面: ${page.url()}\n`);
  
  // 创建提取器
  const extractor = new ContentExtractor(page);
  const a11yCollector = new AccessibilityTreeCollector(page);
  
  // 1. 获取页面摘要
  console.log('='.repeat(60));
  console.log('📊 页面摘要');
  console.log('='.repeat(60));
  
  const summary = await extractor.getPageSummary();
  console.log(`URL: ${summary.url}`);
  console.log(`标题: ${summary.title}`);
  
  if (summary.headings?.length > 0) {
    console.log('\n标题层级:');
    for (const h of summary.headings) {
      console.log(`  H${h.level}: ${h.text}`);
    }
  }
  
  if (summary.regions?.length > 0) {
    console.log('\n页面区域:');
    for (const r of summary.regions) {
      console.log(`  ${r.name}: ${r.size.width}x${r.size.height}`);
    }
  }
  
  // 2. 获取可交互元素
  console.log('\n' + '='.repeat(60));
  console.log('🎯 可交互元素');
  console.log('='.repeat(60));
  
  const elements = await extractor.enumerateInteractiveElements();
  console.log(`总计: ${elements.totalElements} 个 (隐藏: ${elements.hiddenElements} 个)\n`);
  
  // 按类型分组
  const grouped = {};
  for (const el of elements.elements) {
    if (!grouped[el.type]) grouped[el.type] = [];
    grouped[el.type].push(el);
  }
  
  for (const [type, els] of Object.entries(grouped)) {
    console.log(`[${type}] ${els.length} 个:`);
    for (const el of els.slice(0, 3)) {
      const selector = el.selectors[0] || el.tag;
      const text = el.text ? ` "${el.text.substring(0, 30)}"` : '';
      console.log(`  ${selector}${text}`);
    }
    if (els.length > 3) {
      console.log(`  ... 还有 ${els.length - 3} 个`);
    }
  }
  
  // 3. 获取 Accessibility Tree
  console.log('\n' + '='.repeat(60));
  console.log('♿ Accessibility Tree');
  console.log('='.repeat(60));
  
  try {
    const a11yInteractive = await a11yCollector.getInteractiveTree();
    console.log(`可交互元素: ${a11yInteractive.count} 个\n`);
    
    for (const el of a11yInteractive.interactive.slice(0, 10)) {
      console.log(`  [${el.role}] "${el.name}"`);
    }
  } catch (e) {
    console.log(`  (CDP 连接失败: ${e.message})`);
  }
  
  // 4. 生成 AI 描述
  console.log('\n' + '='.repeat(60));
  console.log('🤖 AI 页面描述');
  console.log('='.repeat(60));
  
  const aiDesc = await extractor.generateAIDescription();
  console.log(aiDesc.substring(0, 1000));
  if (aiDesc.length > 1000) {
    console.log('\n... (已截断)');
  }
  
  // 5. 导出完整快照
  console.log('\n' + '='.repeat(60));
  console.log('📁 导出快照');
  console.log('='.repeat(60));
  
  const result = await extractor.exportFullSnapshot('test-baimeng');
  console.log(`文件: ${result.filepath}`);
  
  // 等待用户查看
  console.log('\n✅ 测试完成！浏览器将保持打开，按 Ctrl+C 退出...');
  
  // 保持浏览器打开
  await new Promise(() => {});
}

main().catch(console.error);
