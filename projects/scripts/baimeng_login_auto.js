const { chromium } = require('playwright');
const fs = require('fs');

const LOGIN_STATE_FILE = '/workspace/projects/output/baimeng_login_state.json';
const SCREENSHOT_DIR = '/workspace/projects/output/baimeng_steps';

async function loginAndSave() {
  console.log('🚀 重新获取登录状态并保存...\n');
  
  // 确保目录存在
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
  
  const browser = await chromium.launch({ 
    headless: false,  // 必须显示浏览器让用户扫码
    args: ['--no-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  
  const page = await context.newPage();
  
  try {
    // 打开网站
    console.log('📱 打开白梦写作网...');
    await page.goto('https://www.baimengxiezuo.com', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    await page.waitForTimeout(2000);
    
    // 点击登录
    console.log('🔍 点击登录按钮...');
    await page.click('button:has-text("登录")');
    await page.waitForTimeout(2000);
    
    console.log('\n==========================================');
    console.log('📱 请扫码登录！');
    console.log('⏳ 正在自动检测登录状态...');
    console.log('==========================================\n');
    
    // 自动检测登录成功
    const maxWait = 180; // 最多等3分钟
    let loggedIn = false;
    
    for (let i = 0; i < maxWait; i++) {
      await page.waitForTimeout(1000);
      
      // 检测登录状态：检查登录按钮是否消失
      const loginBtn = page.locator('button:has-text("登录")').first();
      const hasLoginBtn = await loginBtn.isVisible({ timeout: 1000 }).catch(() => false);
      
      // 同时检查是否有用户头像或用户名显示
      const userElements = await page.locator('img[alt*="头像"], .avatar, [class*="user"]').count();
      
      process.stdout.write(`\r⏳ 等待扫码中... (${i + 1}/${maxWait}秒) 登录按钮:${hasLoginBtn}, 用户元素:${userElements}`);
      
      if (!hasLoginBtn || userElements > 0) {
        console.log('\n✅ 检测到登录成功！');
        loggedIn = true;
        break;
      }
    }
    
    if (!loggedIn) {
      console.log('\n❌ 等待超时，登录未完成');
      await browser.close();
      return;
    }
    
    // 多等2秒确保状态稳定
    await page.waitForTimeout(2000);
    
    // 保存登录状态
    await context.storageState({ path: LOGIN_STATE_FILE });
    console.log(`\n💾 登录状态已保存: ${LOGIN_STATE_FILE}`);
    
    // 验证token
    const stateData = JSON.parse(fs.readFileSync(LOGIN_STATE_FILE, 'utf8'));
    let hasToken = false;
    for (const origin of stateData.origins || []) {
      for (const item of origin.localStorage || []) {
        if (item.name === 'token') {
          hasToken = true;
          console.log(`🔑 Token已保存 (长度: ${item.value.length})`);
          break;
        }
      }
    }
    
    if (!hasToken) {
      console.log('⚠️ 警告: 未找到Token');
    } else {
      console.log('🎉 登录凭证保存成功！');
    }
    
    // 截图确认
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/登录成功_${Date.now()}.png`,
      fullPage: false 
    });
    
    await browser.close();
    
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    await browser.close();
  }
}

loginAndSave();
