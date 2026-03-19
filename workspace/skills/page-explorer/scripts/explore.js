#!/usr/bin/env node
/**
 * 页面探索脚本
 * 
 * 用法:
 *   node scripts/explore.js              - 探索当前页面
 *   node scripts/explore.js find "关键词" - 查找元素
 *   node scripts/explore.js export       - 导出完整结构
 *   node scripts/explore.js watch        - 监控页面变化
 */

const path = require('path');
const fs = require('fs');

// 项目根目录
const projectRoot = path.join(__dirname, '..', '..', '..');
process.chdir(projectRoot);

// ============================================================
// 动态导入（避免模块找不到错误）
// ============================================================

function requireUtils() {
  const contentExtractorPath = path.join(projectRoot, 'auto-scripts/src/utils/content-extractor.js');
  const a11yPath = path.join(projectRoot, 'auto-scripts/src/utils/accessibility-tree.js');
  
  if (!fs.existsSync(contentExtractorPath)) {
    console.error('❌ 找不到 content-extractor.js');
    process.exit(1);
  }
  
  return {
    ContentExtractor: require(contentExtractorPath).ContentExtractor,
    PageAnalyzer: require(a11yPath).PageAnalyzer,
  };
}

// ============================================================
// 简化版页面探索（不依赖 Playwright 连接）
// ============================================================

async function quickExplore() {
  const { chromium } = require('playwright');
  const { ContentExtractor } = requireUtils();
  
  // 尝试连接到已有浏览器
  const browserDir = '/workspace/projects/browser/baimeng-default';
  let browser, page, isNew = false;
  
  try {
    // 尝试通过 CDP 连接
    const portFile = path.join(browserDir, 'DevToolsActivePort');
    if (fs.existsSync(portFile)) {
      const content = fs.readFileSync(portFile, 'utf-8');
      const port = content.split('\n')[0];
      browser = await chromium.connectOverCDP(`http://localhost:${port}`);
      const contexts = browser.contexts();
      if (contexts.length > 0 && contexts[0].pages().length > 0) {
        page = contexts[0].pages()[0];
        console.log(`✅ 已连接到浏览器`);
      }
    }
  } catch (e) {
    // 连接失败，启动新浏览器
  }
  
  if (!page) {
    console.log('⚠️ 未找到运行中的浏览器，启动新浏览器...');
    browser = await chromium.launch({ headless: false });
    page = await browser.newPage();
    await page.goto('https://baimeng.ai');
    isNew = true;
  }
  
  try {
    const extractor = new ContentExtractor(page);
    
    // 获取页面摘要
    const summary = await extractor.getPageSummary();
    
    // 获取可交互元素
    const elements = await extractor.enumerateInteractiveElements();
    
    // 输出结果
    console.log('\n' + '═'.repeat(60));
    console.log('🔍 页面探索结果');
    console.log('═'.repeat(60));
    
    console.log(`\n📍 URL: ${summary.url}`);
    console.log(`📄 标题: ${summary.title}`);
    
    // 标题层级
    if (summary.headings?.length > 0) {
      console.log('\n📑 标题层级:');
      for (const h of summary.headings) {
        const indent = '  '.repeat(h.level - 1);
        console.log(`${indent}H${h.level}: ${h.text}`);
      }
    }
    
    // 页面区域
    if (summary.regions?.length > 0) {
      console.log('\n📦 页面区域:');
      for (const r of summary.regions) {
        console.log(`  ${r.name}: ${r.size.width}x${r.size.height}`);
        if (r.buttons) console.log(`    - 按钮: ${r.buttons} 个`);
        if (r.inputs) console.log(`    - 输入框: ${r.inputs} 个`);
        if (r.links) console.log(`    - 链接: ${r.links} 个`);
      }
    }
    
    // 可交互元素
    console.log(`\n🎯 可交互元素: ${elements.totalElements} 个`);
    
    // 按类型分组显示
    const grouped = {};
    for (const el of elements.elements) {
      if (!grouped[el.type]) grouped[el.type] = [];
      grouped[el.type].push(el);
    }
    
    for (const [type, els] of Object.entries(grouped)) {
      console.log(`\n  [${type}] ${els.length} 个:`);
      for (const el of els.slice(0, 5)) {
        const selector = el.selectors[0] || el.tag;
        const text = el.text ? ` "${el.text.substring(0, 30)}"` : '';
        const placeholder = el.placeholder ? ` [${el.placeholder}]` : '';
        console.log(`    ${selector}${text}${placeholder}`);
      }
      if (els.length > 5) {
        console.log(`    ... 还有 ${els.length - 5} 个`);
      }
    }
    
    // 弹窗检测
    if (summary.activeDialogs?.length > 0) {
      console.log('\n⚠️ 活动弹窗:');
      for (const d of summary.activeDialogs) {
        console.log(`  - ${d.title || d.id || '匿名弹窗'}`);
      }
    }
    
    // 当前焦点
    if (summary.focusedElement) {
      console.log('\n🎯 当前焦点:');
      console.log(`  ${summary.focusedElement.tag}#${summary.focusedElement.id || '无ID'}`);
    }
    
    console.log('\n');
    
  } finally {
    if (isNew) await browser.close();
  }
}

async function findElement(keyword) {
  const { chromium } = require('playwright');
  const { ContentExtractor } = requireUtils();
  
  const browserDir = '/workspace/projects/browser/baimeng-default';
  let browser, page, isNew = false;
  
  try {
    const portFile = path.join(browserDir, 'DevToolsActivePort');
    if (fs.existsSync(portFile)) {
      const content = fs.readFileSync(portFile, 'utf-8');
      const port = content.split('\n')[0];
      browser = await chromium.connectOverCDP(`http://localhost:${port}`);
      const contexts = browser.contexts();
      if (contexts.length > 0 && contexts[0].pages().length > 0) {
        page = contexts[0].pages()[0];
      }
    }
  } catch (e) {}
  
  if (!page) {
    console.error('❌ 未找到运行中的浏览器');
    return;
  }
  
  try {
    const extractor = new ContentExtractor(page);
    const elements = await extractor.enumerateInteractiveElements();
    
    const keyword_lower = keyword.toLowerCase();
    const matches = elements.elements.filter(el => 
      (el.text && el.text.toLowerCase().includes(keyword_lower)) ||
      (el.placeholder && el.placeholder.toLowerCase().includes(keyword_lower)) ||
      el.selectors.some(s => s.toLowerCase().includes(keyword_lower))
    );
    
    console.log(`\n🔍 搜索 "${keyword}":\n`);
    
    if (matches.length === 0) {
      console.log('  未找到匹配元素');
    } else {
      for (const el of matches) {
        console.log(`  [${el.type}] ${el.selectors[0] || el.tag}`);
        if (el.text) console.log(`    文本: "${el.text.substring(0, 50)}"`);
        if (el.placeholder) console.log(`    提示: "${el.placeholder}"`);
        if (el.value) console.log(`    值: "${el.value}"`);
        console.log('');
      }
    }
    
  } finally {
    if (isNew) await browser.close();
  }
}

async function exportStructure() {
  const { chromium } = require('playwright');
  const { ContentExtractor } = requireUtils();
  
  const browserDir = '/workspace/projects/browser/baimeng-default';
  let browser, page, isNew = false;
  
  try {
    const portFile = path.join(browserDir, 'DevToolsActivePort');
    if (fs.existsSync(portFile)) {
      const content = fs.readFileSync(portFile, 'utf-8');
      const port = content.split('\n')[0];
      browser = await chromium.connectOverCDP(`http://localhost:${port}`);
      const contexts = browser.contexts();
      if (contexts.length > 0 && contexts[0].pages().length > 0) {
        page = contexts[0].pages()[0];
      }
    }
  } catch (e) {}
  
  if (!page) {
    console.error('❌ 未找到运行中的浏览器');
    return;
  }
  
  try {
    const extractor = new ContentExtractor(page);
    const result = await extractor.exportFullSnapshot();
    
    console.log('\n✅ 页面结构已导出:');
    console.log(`  文件: ${result.filepath}`);
    console.log(`  元素: ${result.interactiveCount} 个`);
    console.log('');
    
  } finally {
    if (isNew) await browser.close();
  }
}

async function watchChanges() {
  const { chromium } = require('playwright');
  const { ContentExtractor } = requireUtils();
  
  const browserDir = '/workspace/projects/browser/baimeng-default';
  let browser, page;
  
  try {
    const portFile = path.join(browserDir, 'DevToolsActivePort');
    if (fs.existsSync(portFile)) {
      const content = fs.readFileSync(portFile, 'utf-8');
      const port = content.split('\n')[0];
      browser = await chromium.connectOverCDP(`http://localhost:${port}`);
      const contexts = browser.contexts();
      if (contexts.length > 0 && contexts[0].pages().length > 0) {
        page = contexts[0].pages()[0];
      }
    }
  } catch (e) {}
  
  if (!page) {
    console.error('❌ 未找到运行中的浏览器');
    return;
  }
  
  const extractor = new ContentExtractor(page);
  let lastUrl = '';
  let lastElementCount = 0;
  
  console.log('\n👀 开始监控页面变化...');
  console.log('按 Ctrl+C 停止\n');
  
  setInterval(async () => {
    try {
      const url = page.url();
      const elements = await extractor.enumerateInteractiveElements();
      
      if (url !== lastUrl || elements.totalElements !== lastElementCount) {
        const time = new Date().toLocaleTimeString();
        console.log(`[${time}] 页面变化:`);
        console.log(`  URL: ${url}`);
        console.log(`  元素: ${elements.totalElements} 个 (之前: ${lastElementCount} 个)`);
        console.log('');
        
        lastUrl = url;
        lastElementCount = elements.totalElements;
      }
    } catch (e) {
      // 忽略
    }
  }, 2000);
  
  // 保持运行
  await new Promise(() => {});
}

// ============================================================
// 主入口
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'explore';
  
  switch (command) {
    case 'explore':
      await quickExplore();
      break;
    case 'find':
      await findElement(args[1]);
      break;
    case 'export':
      await exportStructure();
      break;
    case 'watch':
      await watchChanges();
      break;
    default:
      console.log(`
页面探索工具

用法:
  node scripts/explore.js              - 探索当前页面
  node scripts/explore.js find "关键词" - 查找元素
  node scripts/explore.js export       - 导出完整结构
  node scripts/explore.js watch        - 监控页面变化
`);
  }
}

main().catch(console.error);
