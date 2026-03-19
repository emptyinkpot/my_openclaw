#!/usr/bin/env node
const { chromium } = require('playwright');
const ScreenshotManager = require('./screenshot_manager');
const path = require('path');

const CONFIG = {
  loginStateFile: '/workspace/projects/output/baimeng_login_state.json'
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('\n========================================');
  console.log('🤖 白梦写作网 - 交互式控制台');
  console.log('========================================\n');
  
  const screenshotMgr = new ScreenshotManager({
    outputDir: '/workspace/projects/output/baimeng_steps',
    maxAge: 365 * 24 * 60 * 60 * 1000,  // 保留365天（主要按数量限制）
    maxCount: 5,                         // 最多保留5张（只保留最近的）
    prefix: 'baimeng_'
  });
  
  console.log('🚀 正在启动浏览器...');
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    storageState: CONFIG.loginStateFile
  });
  
  const page = await context.newPage();
  console.log('✅ 浏览器已启动\n');
  
  try {
    // 步骤1: 打开首页
    console.log('📖 [步骤1] 打开白梦写作网...');
    await page.goto('https://www.baimengxiezuo.com', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    await sleep(2000);
    
    // 截图（使用jpeg减少文件大小）
    const screenshot1 = screenshotMgr.getScreenshotPath('01_首页');
    await page.screenshot({ 
      path: screenshot1, 
      fullPage: false,
      type: 'jpeg',
      quality: 80
    });
    console.log(`✅ 首页已打开`);
    console.log(`📸 截图: ${path.basename(screenshot1)}\n`);
    
    // 验证登录
    const loginBtn = page.locator('text=登录').first();
    const isLoggedIn = await loginBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (isLoggedIn) {
      throw new Error('登录状态已失效，请重新运行登录脚本');
    }
    console.log('🔑 登录状态: 有效\n');
    
    // 步骤2: 点击开始创作
    console.log('📖 [步骤2] 点击"免费开始创作"...');
    await page.click('text=免费开始创作');
    await sleep(3000);
    
    const screenshot2 = screenshotMgr.getScreenshotPath('02_开始创作');
    await page.screenshot({ 
      path: screenshot2, 
      fullPage: false,
      type: 'jpeg',
      quality: 80
    });
    console.log(`✅ 已点击"免费开始创作"`);
    console.log(`📸 截图: ${path.basename(screenshot2)}\n`);
    
    // 步骤3: 获取作品列表
    console.log('📖 [步骤3] 正在获取作品列表...');
    await sleep(2000);
    
    const works = await page.evaluate(() => {
      const results = [];
      const h3Elements = document.querySelectorAll('h3');
      
      h3Elements.forEach((el) => {
        const title = el.textContent?.trim();
        if (title && title.length > 0 && title !== '创建新作品') {
          let description = '';
          const parent = el.closest('[class*="card"]') || el.closest('[class*="item"]') || el.parentElement;
          if (parent) {
            const descEl = parent.querySelector('p');
            if (descEl) description = descEl.textContent?.trim();
          }
          results.push({ title, description });
        }
      });
      
      return results;
    });
    
    const screenshot3 = screenshotMgr.getScreenshotPath('03_作品列表');
    await page.screenshot({ 
      path: screenshot3, 
      fullPage: true,
      type: 'jpeg',
      quality: 80
    });
    console.log(`✅ 作品列表已获取`);
    console.log(`📸 截图: ${path.basename(screenshot3)}\n`);
    
    if (works.length === 0) {
      console.log('⚠️ 未找到作品，可能是新用户\n');
    } else {
      console.log(`📚 找到 ${works.length} 个作品:\n`);
      works.forEach((work, index) => {
        const desc = work.description && work.description !== '未描述' 
          ? ` - ${work.description}` 
          : '';
        console.log(`  [${index + 1}] ${work.title}${desc}`);
      });
      console.log('');
      
      // 从环境变量或参数获取选择
      const choice = process.env.WORK_CHOICE ? parseInt(process.env.WORK_CHOICE) : null;
      
      if (choice && choice >= 1 && choice <= works.length) {
        const selectedWork = works[choice - 1];
        console.log(`\n👉 自动选择: [${choice}] ${selectedWork.title}\n`);
        
        // 点击进入
        await page.evaluate((title) => {
          const h3Elements = document.querySelectorAll('h3');
          for (const el of h3Elements) {
            if (el.textContent.trim() === title) {
              el.click();
              break;
            }
          }
        }, selectedWork.title);
        
        await sleep(3000);
        
        const safeTitle = selectedWork.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').slice(0, 20);
        const screenshot4 = screenshotMgr.getScreenshotPath(`04_进入作品_${safeTitle}`);
        await page.screenshot({ 
          path: screenshot4, 
          fullPage: false,
          type: 'jpeg',
          quality: 80
        });
        console.log(`✅ 已进入作品: ${selectedWork.title}`);
        console.log(`📸 截图: ${path.basename(screenshot4)}\n`);
      } else {
        console.log('💡 提示: 设置 WORK_CHOICE 环境变量可自动进入作品');
        console.log('   例如: WORK_CHOICE=2 node scripts/baimeng_interactive_v2.js\n');
      }
    }
    
    console.log('========================================');
    console.log('✅ 所有操作完成！');
    console.log('========================================\n');
    
    // 显示所有截图
    const screenshots = screenshotMgr.getScreenshotList();
    console.log(`📸 截图文件 (${screenshots.length} 张):\n`);
    screenshots.slice(0, 10).forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.name}`);
    });
    console.log(`\n📁 目录: /workspace/projects/output/baimeng_steps/\n`);
    
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    
    try {
      const errorScreenshot = screenshotMgr.getScreenshotPath('ERROR_错误');
      await page.screenshot({ 
        path: errorScreenshot, 
        fullPage: true,
        type: 'jpeg',
        quality: 80
      });
      console.log(`📸 错误截图: ${path.basename(errorScreenshot)}`);
    } catch (e) {}
    
  } finally {
    await browser.close();
    console.log('\n🔒 浏览器已关闭');
    
    // 清理旧截图，只保留最近5张
    screenshotMgr.cleanup();
  }
}

main().catch(err => {
  console.error('\n💥 程序异常:', err.message);
  process.exit(1);
});
