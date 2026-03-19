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
    console.log('⏳ 登录成功后按回车键保存状态...');
    console.log('==========================================\n');
    
    // 等待用户按回车
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', async () => {
      // 保存登录状态
      await context.storageState({ path: LOGIN_STATE_FILE });
      console.log(`✅ 登录状态已保存: ${LOGIN_STATE_FILE}`);
      
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
        console.log('⚠️ 警告: 未找到Token，可能登录未成功');
      }
      
      await browser.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    await browser.close();
    process.exit(1);
  }
}

loginAndSave();
