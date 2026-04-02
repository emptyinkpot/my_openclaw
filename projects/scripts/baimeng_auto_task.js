const { chromium } = require('playwright');
const ScreenshotManager = require('./screenshot_manager');
const readline = require('readline');

/**
 * 创建 readline 接口用于用户输入
 */
function createRL() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * 提问并等待用户输入
 */
function askQuestion(rl, question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

/**
 * 白梦写作网自动化任务 - 集成截图自动清理
 * 
 * 使用方法:
 *   node baimeng_auto_task.js
 * 
 * 配置选项（修改下方 CONFIG 对象）:
 *   - autoCleanup: 运行前是否自动清理旧截图
 *   - keepDays: 截图保留天数
 *   - maxScreenshots: 最大保留截图数量
 */

const CONFIG = {
  // 登录状态文件路径
  loginStateFile: '/workspace/projects/output/baimeng_login_state.json',
  
  // 截图配置
  screenshot: {
    autoCleanup: true,        // 运行前自动清理
    keepDays: 365,            // 保留365天（主要按数量清理）
    maxScreenshots: 5,        // 最多保留5张（只保留最近的）
    enableScreenshots: true   // 是否启用截图
  }
};

async function runAutomation() {
  console.log('🤖 白梦写作网自动化任务\n');
  console.log('=' .repeat(50));
  
  // 初始化截图管理器
  const screenshotMgr = new ScreenshotManager({
    outputDir: '/workspace/projects/output/baimeng_steps',
    maxAge: CONFIG.screenshot.keepDays * 24 * 60 * 60 * 1000,
    maxCount: CONFIG.screenshot.maxScreenshots,
    prefix: 'baimeng_'
  });
  
  // 显示当前状态
  screenshotMgr.printStatus();
  
  // 自动清理旧截图
  if (CONFIG.screenshot.autoCleanup) {
    screenshotMgr.cleanup();
  }
  
  console.log('\n🚀 启动浏览器...');
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    storageState: CONFIG.loginStateFile  // 加载登录状态
  });
  
  const page = await context.newPage();
  
  try {
    // ========== 自动化任务开始 ==========
    
    // 1. 打开网站并验证登录
    console.log('\n📖 步骤1: 打开白梦写作网');
    await page.goto('https://www.baimengxiezuo.com', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    await page.waitForTimeout(2000);
    
    if (CONFIG.screenshot.enableScreenshots) {
      await page.screenshot({ 
        path: screenshotMgr.getScreenshotPath('01_首页'),
        fullPage: false,
        type: 'jpeg',
        quality: 80
      });
    }
    
    // 验证登录状态
    const loginBtn = page.locator('text=登录').first();
    const isLoggedIn = await loginBtn.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (isLoggedIn) {
      throw new Error('登录状态已失效，需要重新扫码');
    }
    console.log('✅ 登录状态有效');
    
    // 2. 点击"免费开始创作"
    console.log('\n📖 步骤2: 点击免费开始创作');
    await page.click('text=免费开始创作');
    await page.waitForTimeout(3000);
    
    if (CONFIG.screenshot.enableScreenshots) {
      await page.screenshot({ 
        path: screenshotMgr.getScreenshotPath('02_开始创作'),
        fullPage: false 
      });
      console.log('📸 已截图: 开始创作页面');
    }
    
    // 3. 获取作品列表
    console.log('\n📖 步骤3: 获取作品列表');
    
    // 等待作品列表加载
    await page.waitForTimeout(2000);
    
    // 获取作品列表 - 根据页面结构调整选择器
    const works = await page.evaluate(() => {
      const results = [];
      
      // 白梦写作网的作品通常在 H3 标签下
      const h3Elements = document.querySelectorAll('h3');
      
      h3Elements.forEach((el, index) => {
        const title = el.textContent?.trim();
        // 过滤掉"创建新作品"这个特殊项（它是创建按钮，不是已有作品）
        if (title && title.length > 0 && title !== '创建新作品') {
          // 查找描述（通常在相邻的 p 标签中）
          let description = '';
          const parent = el.closest('[class*="card"]') || el.closest('[class*="item"]') || el.parentElement;
          if (parent) {
            const descEl = parent.querySelector('p');
            if (descEl) description = descEl.textContent?.trim();
          }
          
          results.push({
            index: results.length + 1,
            title: title,
            description: description,
            element: el
          });
        }
      });
      
      return results;
    });
    
    if (works.length === 0) {
      console.log('⚠️ 未找到作品，可能是新用户或页面结构不同');
      
      // 截图保存供查看
      await page.screenshot({ 
        path: screenshotMgr.getScreenshotPath('03_作品列表_无作品'),
        fullPage: true 
      });
    } else {
      console.log(`\n📚 找到 ${works.length} 个作品:\n`);
      works.forEach(work => {
        console.log(`  ${work.index}. ${work.title}`);
      });
      
      // 截图保存
      await page.screenshot({ 
        path: screenshotMgr.getScreenshotPath('03_作品列表'),
        fullPage: true 
      });
      console.log('\n📸 已截图: 作品列表');
      
      // 让用户选择
      const rl = createRL();
      const answer = await askQuestion(rl, '\n👉 请输入要进入的作品编号 (1-' + works.length + ', 或按回车跳过): ');
      rl.close();
      
      const choice = parseInt(answer);
      if (choice >= 1 && choice <= works.length) {
        const selectedWork = works[choice - 1];
        console.log(`\n✅ 选择进入: ${selectedWork.title}`);
        
        // 点击作品标题进入
        await page.evaluate((title) => {
          const h3Elements = document.querySelectorAll('h3');
          for (const el of h3Elements) {
            if (el.textContent.trim() === title) {
              el.click();
              break;
            }
          }
        }, selectedWork.title);
        
        await page.waitForTimeout(3000);
        
        // 截图保存
        const safeTitle = selectedWork.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').slice(0, 20);
        await page.screenshot({ 
          path: screenshotMgr.getScreenshotPath(`04_进入作品_${safeTitle}`),
          fullPage: false 
        });
        console.log('📸 已截图: 作品详情页');
      } else {
        console.log('\n⏭️  跳过选择');
      }
    }
    
    console.log('\n✅ 任务执行完成！');
    
  } catch (error) {
    console.error('\n❌ 任务执行失败:', error.message);
    
    // 出错时截图
    if (CONFIG.screenshot.enableScreenshots) {
      try {
        await page.screenshot({ 
          path: screenshotMgr.getScreenshotPath('ERROR_错误'),
          fullPage: true 
        });
        console.log('📸 已保存错误截图');
      } catch (e) {
        // 截图失败忽略
      }
    }
    
    throw error;
    
  } finally {
    await browser.close();
    console.log('\n🔒 浏览器已关闭');
    
    // 再次清理（任务过程中可能产生新截图）
    if (CONFIG.screenshot.autoCleanup) {
      screenshotMgr.cleanup();
    }
    
    screenshotMgr.printStatus();
  }
}

// 运行任务
runAutomation().catch(err => {
  console.error('\n💥 程序异常退出');
  process.exit(1);
});
