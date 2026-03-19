#!/usr/bin/env node
/**
 * 批量采集已登录页面快照
 * 
 * 用法:
 *   node scripts/collect-all.js              # 采集所有已登录页面
 *   node scripts/collect-all.js --platform fanqie  # 只采集指定平台
 *   node scripts/collect-all.js --list       # 列出已采集的快照
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = '/workspace/projects';
const BROWSER_DIR = path.join(PROJECT_ROOT, 'browser');

// 加载工具模块
const { ContentExtractor } = require(path.join(PROJECT_ROOT, 'auto-scripts/src/utils/content-extractor.js'));
const { SnapshotStorage } = require(path.join(PROJECT_ROOT, 'auto-scripts/src/utils/snapshot-storage.js'));

// ============================================================
// 平台配置
// ============================================================

const PLATFORM_CONFIG = {
  fanqie: {
    name: '番茄小说',
    urls: {
      home: 'https://fanqienovel.com',
      works: 'https://fanqienovel.com/page/my-work',
      editor: null, // 需要从作品列表进入
    },
    pageTypes: {
      'fanqienovel.com': 'home',
      'fanqienovel.com/page/my-work': 'works',
      'fanqienovel.com/page/write': 'editor',
      'fanqienovel.com/reader': 'reader',
    },
  },
  baimeng: {
    name: '白梦写作',
    urls: {
      home: 'https://baimengxiezuo.com',
      works: 'https://baimengxiezuo.com/zh-Hans/library/',
      editor: 'https://baimengxiezuo.com/zh-Hans/editor/',
    },
    pageTypes: {
      'baimengxiezuo.com': 'home',
      'baimengxiezuo.com/zh-Hans/library': 'works',
      'baimengxiezuo.com/zh-Hans/editor': 'editor',
    },
  },
};

// ============================================================
// 解析浏览器目录
// ============================================================

function parseBrowserDirs() {
  const dirs = fs.readdirSync(BROWSER_DIR);
  const accounts = [];
  
  for (const dir of dirs) {
    const fullPath = path.join(BROWSER_DIR, dir);
    if (!fs.statSync(fullPath).isDirectory()) continue;
    
    // 解析平台和账户名
    // 格式: {platform}-{account} 或 {platform} (默认账户)
    let platform, account;
    
    if (dir.includes('-')) {
      const parts = dir.split('-');
      platform = parts[0];
      account = parts.slice(1).join('-');
    } else {
      platform = dir;
      account = 'default';
    }
    
    // 只处理已知的平台
    if (PLATFORM_CONFIG[platform]) {
      accounts.push({
        platform,
        account,
        browserDir: fullPath,
        config: PLATFORM_CONFIG[platform],
      });
    }
  }
  
  return accounts;
}

// ============================================================
// 采集单个账户的页面
// ============================================================

async function collectAccount(browserAccount, options = {}) {
  const { platform, account, browserDir, config } = browserAccount;
  const { pages = ['home', 'works'], headless = false } = options;
  
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📂 ${config.name} - ${account}`);
  console.log(`   浏览器目录: ${browserDir}`);
  console.log(`${'═'.repeat(60)}`);
  
  const storage = new SnapshotStorage();
  const results = [];
  
  let browser;
  try {
    // 启动浏览器（使用持久化上下文，恢复登录状态）
    browser = await chromium.launchPersistentContext(browserDir, {
      headless,
      viewport: { width: 1400, height: 850 },
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    });
    
    const page = browser.pages()[0] || await browser.newPage();
    const extractor = new ContentExtractor(page);
    
    // 采集各个页面类型
    for (const pageType of pages) {
      const url = config.urls[pageType];
      if (!url) {
        console.log(`  ⏭️ 跳过 ${pageType}（无 URL）`);
        continue;
      }
      
      console.log(`\n  📄 采集 [${pageType}]: ${url}`);
      
      try {
        // 导航
        await page.goto(url, { timeout: 30000, waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
        
        // 检查是否登录
        const currentUrl = page.url();
        if (currentUrl.includes('login') || currentUrl.includes('signin')) {
          console.log(`  ⚠️ 未登录，跳过`);
          continue;
        }
        
        // 采集数据
        console.log(`  📊 正在采集页面内容...`);
        
        const [summary, elements] = await Promise.all([
          extractor.getPageSummary(),
          extractor.enumerateInteractiveElements(),
        ]);
        
        // 保存快照
        const result = storage.saveSnapshot({
          platform,
          account,
          pageType,
          snapshot: {
            url: currentUrl,
            title: summary.title,
            summary,
            elements,
            domSnapshot: null, // 完整 DOM 太大，按需采集
          },
        });
        
        console.log(`  ✅ 已保存: ${elements.totalElements} 个元素`);
        console.log(`     文件: ${result.snapshotId}`);
        
        results.push({
          pageType,
          url: currentUrl,
          title: summary.title,
          elementCount: elements.totalElements,
          snapshotId: result.snapshotId,
        });
        
      } catch (e) {
        console.log(`  ❌ 失败: ${e.message}`);
      }
    }
    
  } catch (e) {
    console.log(`❌ 浏览器启动失败: ${e.message}`);
  } finally {
    if (browser) await browser.close();
  }
  
  return results;
}

// ============================================================
// 列出已采集的快照
// ============================================================

function listSnapshots() {
  const storage = new SnapshotStorage();
  const platforms = storage.getPlatforms();
  
  console.log('\n📚 已采集的快照\n');
  
  for (const platform of platforms) {
    const accounts = storage.getAccounts(platform);
    const platformName = PLATFORM_CONFIG[platform]?.name || platform;
    
    console.log(`\n## ${platformName} (${platform})`);
    
    for (const account of accounts) {
      console.log(`\n  ### 账户: ${account}`);
      
      const snapshots = storage.getSnapshots(platform, account, { limit: 20 });
      
      // 按页面类型分组
      const byType = {};
      for (const s of snapshots) {
        if (!byType[s.pageType]) byType[s.pageType] = [];
        byType[s.pageType].push(s);
      }
      
      for (const [pageType, snaps] of Object.entries(byType)) {
        const latest = snaps[0];
        console.log(`\n  ${pageType}:`);
        console.log(`    最新: ${latest.title}`);
        console.log(`    元素: ${latest.elementCount} 个`);
        console.log(`    时间: ${latest.timestamp}`);
        console.log(`    快照数: ${snaps.length} 个`);
      }
    }
  }
  
  console.log('\n');
}

// ============================================================
// 主入口
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  
  // 解析参数
  const options = {
    platform: null,
    pages: ['home', 'works'],
    headless: true,
    list: args.includes('--list'),
  };
  
  const platformIndex = args.indexOf('--platform');
  if (platformIndex >= 0) {
    options.platform = args[platformIndex + 1];
  }
  
  if (options.list) {
    listSnapshots();
    return;
  }
  
  // 获取所有浏览器账户
  const accounts = parseBrowserDirs();
  
  console.log('\n🔍 发现浏览器账户:');
  for (const acc of accounts) {
    console.log(`  - ${acc.config.name} / ${acc.account}`);
  }
  
  // 过滤平台
  const toCollect = options.platform 
    ? accounts.filter(a => a.platform === options.platform)
    : accounts;
  
  console.log(`\n📝 准备采集 ${toCollect.length} 个账户...\n`);
  
  // 逐个采集
  const allResults = {};
  
  for (const acc of toCollect) {
    const key = `${acc.platform}/${acc.account}`;
    allResults[key] = await collectAccount(acc, options);
  }
  
  // 汇总
  console.log('\n' + '═'.repeat(60));
  console.log('📊 采集完成汇总');
  console.log('═'.repeat(60));
  
  let totalElements = 0;
  let totalSnapshots = 0;
  
  for (const [key, results] of Object.entries(allResults)) {
    console.log(`\n${key}:`);
    for (const r of results) {
      console.log(`  ✅ ${r.pageType}: ${r.elementCount} 个元素`);
      totalElements += r.elementCount;
      totalSnapshots++;
    }
  }
  
  console.log(`\n总计: ${totalSnapshots} 个快照，${totalElements} 个元素`);
  console.log(`\n存储位置: /workspace/projects/storage/page-snapshots/`);
  console.log('\n查看快照: node scripts/collect-all.js --list\n');
}

main().catch(console.error);
