#!/usr/bin/env node
/**
 * 统一平台 CLI 工具
 * 
 * 用法：
 *   node site-cli.js <平台> <操作> [参数]
 *   node site-cli.js baimeng works
 *   node site-cli.js fanqie check
 *   node site-cli.js baimeng enter 2
 */

const lib = require('./index');
const path = require('path');
const fs = require('fs');

// 输出目录
const OUTPUT_DIR = '/workspace/projects/output';
const SCREENSHOT_DIR = path.join(OUTPUT_DIR, 'screenshots');

/**
 * 确保目录存在
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 保存截图
 */
async function saveScreenshot(page, name, siteName) {
  ensureDir(SCREENSHOT_DIR);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${siteName}_${name}_${timestamp}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  
  await page.screenshot({ path: filepath, fullPage: false });
  
  // 清理旧截图
  const files = fs.readdirSync(SCREENSHOT_DIR)
    .filter(f => f.startsWith(`${siteName}_`))
    .sort()
    .reverse();
  
  files.slice(5).forEach(f => {
    try { fs.unlinkSync(path.join(SCREENSHOT_DIR, f)); } catch (e) {}
  });
  
  return filepath;
}

/**
 * 显示帮助
 */
function showHelp() {
  console.log(`
🤖 统一平台 CLI 工具 v${lib.VERSION}

用法:
  node site-cli.js <平台> <操作> [参数]

平台:
  baimeng    白梦写作
  fanqie     番茄小说
  coze       扣子编程

操作:
  works      查看作品列表
  check      检查登录状态
  login      扫码登录
  enter <n>  进入第 n 个作品
  screenshot 截图当前页面

示例:
  node site-cli.js baimeng works       # 查看白梦作品
  node site-cli.js fanqie check         # 检查番茄登录状态
  node site-cli.js baimeng enter 2      # 进入白梦第2个作品

可用平台: ${lib.getAvailableSites().join(', ')}
`);
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const siteName = args[0];
  const action = args[1];
  const param = args[2];
  
  // 显示帮助
  if (!siteName || siteName === 'help' || siteName === '--help') {
    showHelp();
    process.exit(0);
  }
  
  console.log(`\n🤖 平台操作: ${siteName} - ${action || 'help'}`);
  console.log('='.repeat(50));
  
  try {
    // 获取平台实例
    const site = lib.getSite(siteName);
    
    switch (action) {
      case 'works':
      case 'list': {
        console.log('\n获取作品列表...\n');
        
        // 初始化浏览器
        await site.initBrowser();
        console.log('✅ 浏览器初始化完成');
        
        // 恢复登录状态
        console.log('🔄 恢复登录状态...');
        await site.restoreAuth();
        console.log('✅ 登录状态恢复完成');
        
        // 获取作品
        const works = await site.getWorks();
        
        console.log(`📚 共 ${works.length} 部作品：\n`);
        works.forEach((w, i) => {
          console.log(`  ${i + 1}. ${w.title || w.name}`);
        });
        
        // 截图
        const screenshot = await saveScreenshot(site.page, 'works', siteName);
        console.log(`\n📸 截图: ${screenshot}`);
        
        // 输出 JSON
        console.log('\n---JSON---');
        console.log(JSON.stringify({
          success: true,
          platform: siteName,
          count: works.length,
          works: works,
          screenshot,
        }));
        break;
      }
      
      case 'check':
      case 'status': {
        console.log('\n检查登录状态...\n');
        
        await site.initBrowser();
        
        const homeUrl = site.config?.site?.urls?.home;
        if (homeUrl) {
          await site.page.goto(homeUrl);
          await site.page.waitForTimeout(2000);
        }
        
        // 检查登录状态
        let isLoggedIn = false;
        const loginBtn = site.page.locator('text=登录').first();
        const hasLoginBtn = await loginBtn.isVisible().catch(() => false);
        isLoggedIn = !hasLoginBtn;
        
        console.log(isLoggedIn ? '✅ 已登录' : '❌ 未登录');
        
        console.log('\n---JSON---');
        console.log(JSON.stringify({
          success: true,
          platform: siteName,
          isLoggedIn,
          message: isLoggedIn ? '已登录' : '未登录，请使用 login 命令扫码登录',
        }));
        break;
      }
      
      case 'login': {
        console.log('\n请扫码登录...\n');
        
        await site.initBrowser();
        
        const homeUrl = site.config?.site?.urls?.home;
        if (homeUrl) {
          await site.page.goto(homeUrl);
        }
        
        // 点击登录按钮
        const loginBtn = site.page.locator('text=登录').first();
        if (await loginBtn.isVisible().catch(() => false)) {
          await loginBtn.click();
          console.log('请在浏览器中扫描二维码登录...');
        }
        
        // 等待登录
        await site.page.waitForTimeout(60000);
        
        // 备份登录状态
        await site.backupAuth();
        
        console.log('\n✅ 登录完成，已保存登录状态');
        break;
      }
      
      case 'enter': {
        const index = parseInt(param, 10) || 1;
        console.log(`\n进入第 ${index} 个作品...\n`);
        
        await site.initBrowser();
        await site.restoreAuth();
        
        const works = await site.getWorks();
        const work = works[index - 1];
        
        if (!work) {
          throw new Error(`作品不存在: 第 ${index} 个`);
        }
        
        if (work.id) {
          await site.openWork(work.id);
        }
        
        const screenshot = await saveScreenshot(site.page, `work-${index}`, siteName);
        
        console.log(`✅ 已进入: ${work.title}`);
        console.log(`📸 截图: ${screenshot}`);
        
        console.log('\n---JSON---');
        console.log(JSON.stringify({
          success: true,
          platform: siteName,
          work: { index, title: work.title },
          screenshot,
        }));
        break;
      }
      
      case 'screenshot': {
        console.log('\n截图当前页面...\n');
        
        await site.initBrowser();
        
        const screenshot = await saveScreenshot(site.page, 'manual', siteName);
        
        console.log(`✅ 截图已保存: ${screenshot}`);
        
        console.log('\n---JSON---');
        console.log(JSON.stringify({
          success: true,
          screenshot,
        }));
        break;
      }
      
      default:
        console.log(`\n❌ 未知操作: ${action}`);
        showHelp();
    }
    
  } catch (error) {
    console.error(`\n❌ 操作失败: ${error.message}`);
    
    console.log('\n---JSON---');
    console.log(JSON.stringify({
      success: false,
      error: error.message,
    }));
    
    process.exit(1);
  }
}

main();
