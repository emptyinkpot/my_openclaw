const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = '/workspace/projects/output/baimeng_steps';
const LOGIN_STATE_FILE = '/workspace/projects/output/baimeng_login_state.json';

// 清理旧截图
if (fs.existsSync(SCREENSHOT_DIR)) {
  fs.readdirSync(SCREENSHOT_DIR).forEach(f => fs.unlinkSync(path.join(SCREENSHOT_DIR, f)));
}

let step = 0;
async function screenshot(page, name) {
  step++;
  const filePath = path.join(SCREENSHOT_DIR, `${String(step).padStart(2, '0')}_${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  const size = (fs.statSync(filePath).size / 1024).toFixed(1);
  console.log(`📸 截图: ${name} (${size} KB)`);
  return filePath;
}

async function main() {
  console.log('🚀 启动浏览器...');
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  
  try {
    // 1. 打开首页
    console.log('📱 打开白梦写作网...');
    await page.goto('https://www.baimengxiezuo.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);
    await screenshot(page, '01_首页');
    
    // 2. 点击登录
    console.log('🔍 点击登录按钮...');
    const loginBtn = page.locator('text=登录').first();
    if (await loginBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await loginBtn.click();
      console.log('✅ 已点击登录');
    }
    
    // 3. 等待登录弹窗
    await page.waitForTimeout(3000);
    await screenshot(page, '02_登录二维码');
    
    console.log('\n==========================================');
    console.log('📱 请现在扫码登录！');
    console.log('⏳ 你有 2 分钟时间扫码...');
    console.log('==========================================\n');
    
    // 4. 等待扫码（2分钟）
    await page.waitForTimeout(120000);
    
    // 5. 截图确认登录状态
    await screenshot(page, '03_登录后状态');
    
    // 6. 保存登录状态
    await context.storageState({ path: LOGIN_STATE_FILE });
    console.log('\n✅ 登录状态已保存！');
    console.log('📂 文件位置:', LOGIN_STATE_FILE);
    
    // 7. 验证文件
    if (fs.existsSync(LOGIN_STATE_FILE)) {
      const stats = fs.statSync(LOGIN_STATE_FILE);
      console.log(`📊 文件大小: ${(stats.size / 1024).toFixed(1)} KB`);
      
      // 读取内容检查
      const content = JSON.parse(fs.readFileSync(LOGIN_STATE_FILE, 'utf8'));
      if (content.cookies && content.cookies.length > 0) {
        console.log(`🍪 已保存 ${content.cookies.length} 个 Cookie`);
        console.log('🎉 登录成功！');
      }
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await browser.close();
    console.log('🔚 浏览器已关闭');
  }
}

main().catch(console.error);
