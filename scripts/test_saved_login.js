const { chromium } = require('playwright');
const fs = require('fs');

const LOGIN_STATE_FILE = '/workspace/projects/output/baimeng_login_state.json';

async function testLogin() {
  console.log('🧪 测试已保存的登录状态...\n');
  
  // 检查状态文件
  if (!fs.existsSync(LOGIN_STATE_FILE)) {
    console.log('❌ 登录状态文件不存在');
    return false;
  }
  
  const stats = fs.statSync(LOGIN_STATE_FILE);
  console.log(`📂 状态文件: ${(stats.size / 1024).toFixed(1)} KB`);
  console.log(`📅 保存时间: ${stats.mtime.toLocaleString()}`);
  
  // 启动浏览器并加载状态
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    storageState: LOGIN_STATE_FILE  // 加载保存的状态
  });
  
  const page = await context.newPage();
  
  try {
    // 打开网站
    console.log('\n🌐 正在打开白梦写作网...');
    await page.goto('https://www.baimengxiezuo.com', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    
    await page.waitForTimeout(3000);
    
    // 检测登录状态
    const loginBtn = page.locator('text=登录').first();
    const hasLoginBtn = await loginBtn.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasLoginBtn) {
      console.log('✅ 登录状态有效！无需扫码，直接登录成功！');
      
      // 截图确认
      await page.screenshot({ 
        path: '/workspace/projects/output/baimeng_steps/04_自动登录成功.png',
        fullPage: false 
      });
      console.log('📸 已截图保存');
      
      await browser.close();
      return true;
    } else {
      console.log('⚠️ 登录状态已失效，需要重新扫码');
      await browser.close();
      return false;
    }
    
  } catch (error) {
    console.error('❌ 测试出错:', error.message);
    await browser.close();
    return false;
  }
}

testLogin().then(success => {
  if (success) {
    console.log('\n🎉 结论: 登录状态可长期使用，下次直接运行脚本即可！');
  } else {
    console.log('\n⚠️ 结论: 需要重新扫码获取登录状态');
  }
});
