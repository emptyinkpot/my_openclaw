#!/usr/bin/env node
/**
 * 页面分析脚本
 * 
 * 用法:
 *   node scripts/analyze.js quick     - 快速分析
 *   node scripts/analyze.js deep      - 深度分析
 *   node scripts/analyze.js prompt    - 生成 AI 提示
 *   node scripts/analyze.js watch     - 持续监控页面变化
 */

const path = require('path');

// 添加路径
const projectRoot = path.join(__dirname, '..', '..', '..');
process.chdir(projectRoot);

const { chromium } = require('playwright');
const { ContentExtractor } = require('../../../auto-scripts/src/utils/content-extractor');
const { PageAnalyzer, AccessibilityTreeCollector } = require('../../../auto-scripts/src/utils/accessibility-tree');

// ============================================================
// 配置
// ============================================================

const BROWSER_DIRS = [
  '/workspace/projects/browser/baimeng-default',
  '/workspace/projects/browser/fanqie-default',
];

// ============================================================
// 连接到现有浏览器
// ============================================================

async function connectToBrowser() {
  // 尝试连接到已有的浏览器
  for (const dir of BROWSER_DIRS) {
    try {
      // 检查是否有 DevTools 端口
      const portFile = path.join(dir, 'DevToolsActivePort');
      if (require('fs').existsSync(portFile)) {
        const content = require('fs').readFileSync(portFile, 'utf-8');
        const port = content.split('\n')[0];
        const wsEndpoint = `http://localhost:${port}`;
        
        console.log(`[Analyze] 尝试连接到浏览器: ${wsEndpoint}`);
        
        const browser = await chromium.connectOverCDP(wsEndpoint);
        const contexts = browser.contexts();
        if (contexts.length > 0) {
          const pages = contexts[0].pages();
          if (pages.length > 0) {
            console.log(`[Analyze] 已连接到浏览器，当前页面: ${pages[0].url()}`);
            return { browser, page: pages[0] };
          }
        }
      }
    } catch (e) {
      // 忽略错误，继续尝试下一个
    }
  }
  
  // 如果无法连接，启动新浏览器
  console.log('[Analyze] 启动新浏览器...');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  return { browser, page, isNew: true };
}

// ============================================================
// 命令处理
// ============================================================

async function quickAnalyze() {
  const { browser, page, isNew } = await connectToBrowser();
  
  try {
    const analyzer = new PageAnalyzer(page);
    const result = await analyzer.quickAnalyze();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 页面快速分析结果');
    console.log('='.repeat(60));
    console.log(`\nURL: ${result.url}`);
    console.log(`标题: ${result.title}`);
    
    if (result.headings?.length > 0) {
      console.log('\n📑 标题结构:');
      for (const h of result.headings) {
        console.log(`  H${h.level}: ${h.text}`);
      }
    }
    
    if (result.regions?.length > 0) {
      console.log('\n📦 页面区域:');
      for (const r of result.regions) {
        console.log(`  ${r.name}: ${r.size.width}x${r.size.height}`);
      }
    }
    
    if (result.activeDialogs?.length > 0) {
      console.log('\n⚠️ 活动弹窗:');
      for (const d of result.activeDialogs) {
        console.log(`  - ${d.title || d.id || '匿名弹窗'}`);
      }
    }
    
    console.log(`\n🎮 可交互元素: ${result.interactiveCount} 个`);
    
    if (result.interactiveElements?.length > 0) {
      console.log('\n前 10 个可交互元素:');
      for (const el of result.interactiveElements.slice(0, 10)) {
        console.log(`  [${el.role}] "${el.name}"`);
      }
    }
    
    console.log('\n');
    
  } finally {
    if (isNew) await browser.close();
  }
}

async function deepAnalyze(name) {
  const { browser, page, isNew } = await connectToBrowser();
  
  try {
    const analyzer = new PageAnalyzer(page);
    const result = await analyzer.deepAnalyze(name);
    
    console.log('\n' + '='.repeat(60));
    console.log('📁 深度分析完成');
    console.log('='.repeat(60));
    console.log(`\n快照文件: ${result.snapshotFile}`);
    console.log(`A11y 文件: ${result.a11yFile}`);
    console.log(`\n可交互元素: ${result.summary.interactiveCount || 'N/A'} 个`);
    console.log('\n');
    
  } finally {
    if (isNew) await browser.close();
  }
}

async function generatePrompt() {
  const { browser, page, isNew } = await connectToBrowser();
  
  try {
    const analyzer = new PageAnalyzer(page);
    const prompt = await analyzer.generateAIPrompt();
    
    console.log('\n' + '='.repeat(60));
    console.log('🤖 AI 页面描述');
    console.log('='.repeat(60));
    console.log('\n' + prompt);
    
  } finally {
    if (isNew) await browser.close();
  }
}

async function watchMode() {
  const { browser, page, isNew } = await connectToBrowser();
  
  try {
    const extractor = new ContentExtractor(page);
    const a11yCollector = new AccessibilityTreeCollector(page);
    
    console.log('\n👀 开始监控页面变化...');
    console.log('按 Ctrl+C 停止\n');
    
    let lastUrl = '';
    
    // 每秒检查一次
    const interval = setInterval(async () => {
      try {
        const url = page.url();
        if (url !== lastUrl) {
          lastUrl = url;
          console.log(`\n[${new Date().toLocaleTimeString()}] 页面变化: ${url}`);
          
          const quick = await extractor.getPageSummary();
          console.log(`  标题: ${quick.title}`);
          console.log(`  区域: ${quick.regions?.map(r => r.name).join(', ') || '无'}`);
          
          if (quick.activeDialogs?.length > 0) {
            console.log(`  ⚠️ 弹窗: ${quick.activeDialogs.map(d => d.title || '匿名').join(', ')}`);
          }
        }
      } catch (e) {
        // 忽略错误
      }
    }, 1000);
    
    // 等待用户中断
    await new Promise(() => {});
    
  } finally {
    if (isNew) await browser.close();
  }
}

// ============================================================
// 主入口
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'quick';
  
  switch (command) {
    case 'quick':
      await quickAnalyze();
      break;
    case 'deep':
      await deepAnalyze(args[1]);
      break;
    case 'prompt':
      await generatePrompt();
      break;
    case 'watch':
      await watchMode();
      break;
    default:
      console.log(`
页面分析工具

用法:
  node scripts/analyze.js quick     - 快速分析
  node scripts/analyze.js deep      - 深度分析（保存快照）
  node scripts/analyze.js prompt    - 生成 AI 友好描述
  node scripts/analyze.js watch     - 持续监控页面变化
`);
  }
}

main().catch(console.error);
