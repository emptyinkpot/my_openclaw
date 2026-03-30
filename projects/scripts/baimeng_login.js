/**
 * 白梦写作网 - 带登录状态保存
 * 自动保存登录状态，下次运行无需重新登录
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = '/workspace/projects/output';
const STATE_FILE = path.join(OUTPUT_DIR, 'baimeng_state.json');

async function openWebsite() {
  console.log('🌐 正在打开白梦写作网...\n');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: false,  // 需要可见以便扫码登录
    executablePath: '/opt/google/chrome/chrome'
  });

  // 创建上下文
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  // 尝试加载已保存的登录状态
  if (fs.existsSync(STATE_FILE)) {
    console.log('📂 发现保存的登录状态，尝试恢复...');
    try {
      const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
      await context.addCookies(state.cookies);
      // 注意：storageState 需要用 newContext 的 storageState 参数
      console.log('✅ 登录状态已恢复\n');
    } catch (e) {
      console.log('⚠️ 恢复登录状态失败，将进行新登录\n');
    }
  } else {
    console.log('📝 未找到登录状态，需要扫码登录\n');
  }

  const page = await context.newPage();

  try {
    // 访问网站
    await page.goto('https://baimengxiezuo.com/zh-Hans/library', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await page.waitForTimeout(2000);

    // 检查是否需要登录
    const needsLogin = await page.$('text=微信登录');
    const userInfo = await page.$('text=我的作品');

    if (needsLogin && !userInfo) {
      console.log('⚠️ 需要登录，请使用微信扫码...\n');

      // 等待用户登录，最多 120 秒
      let loggedIn = false;
      for (let i = 0; i < 120; i++) {
        await page.waitForTimeout(1000);
        const title = await page.title();
        if (title.includes('我的作品') || title.includes('白梦写作')) {
          const loginBtn = await page.$('text=微信登录');
          if (!loginBtn) {
            loggedIn = true;
            console.log('✅ 登录成功！\n');
            break;
          }
        }
      }

      if (!loggedIn) {
        console.log('❌ 登录超时\n');
        await browser.close();
        return;
      }
    }

    // 保存登录状态
    console.log('💾 保存登录状态...');
    const cookies = await context.cookies();
    fs.writeFileSync(STATE_FILE, JSON.stringify({ cookies }, null, 2));
    console.log('✅ 登录状态已保存到:', STATE_FILE, '\n');

    // 获取页面信息
    const info = await page.evaluate(() => ({
      title: document.title,
      url: window.location.href,
      worksCount: document.querySelectorAll('[class*="作品"]').length || 0
    }));

    console.log('📋 页面信息:');
    console.log('  标题:', info.title);
    console.log('  URL:', info.url);

    // 截图
    await page.screenshot({ path: `${OUTPUT_DIR}/baimeng_library.png`, fullPage: true });
    console.log('\n✅ 截图已保存\n');

    // 保持浏览器打开
    console.log('⏳ 浏览器保持打开，按 Ctrl+C 结束...\n');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await browser.close();
    console.log('🔒 浏览器已关闭');
  }
}

openWebsite().catch(console.error);
