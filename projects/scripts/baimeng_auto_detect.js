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

// 检测是否已登录
async function checkLoggedIn(page) {
  try {
    // 检测方法1: 页面是否还有"登录"按钮
    const loginBtn = page.locator('text=登录').first();
    const hasLoginBtn = await loginBtn.isVisible({ timeout: 2000 }).catch(() => false);
    
    // 检测方法2: 是否有用户头像或用户信息
    const userElements = await page.locator('img[alt*="头像"], .avatar, [class*="user"]').count();
    
    // 检测方法3: URL是否变化（登录后通常会跳转）
    const url = page.url();
    
    console.log(`   检测状态: 登录按钮=${hasLoginBtn}, 用户元素=${userElements}, URL=${url}`);
    
    // 如果没有登录按钮，且有用户元素，说明已登录
    return !hasLoginBtn || userElements > 0;
  } catch (e) {
    return false;
  }
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
      console.log('✅ 已点击登录，等待二维码...');
    }
    
    // 3. 等待登录弹窗并截图
    await page.waitForTimeout(3000);
    await screenshot(page, '02_登录二维码');
    
    console.log('\n==========================================');
    console.log('📱 请扫码登录！');
    console.log('⏳ 正在自动检测登录状态...');
    console.log('==========================================\n');
    
    // 4. 轮询检测登录状态（最多等3分钟）
    let loggedIn = false;
    const maxWait = 180; // 3分钟
    let waited = 0;
    
    while (!loggedIn && waited < maxWait) {
      await page.waitForTimeout(3000); // 每3秒检测一次
      waited += 3;
      
      // 刷新页面检查登录状态
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      
      loggedIn = await checkLoggedIn(page);
      
      if (loggedIn) {
        console.log(`✅ 检测到登录成功！（等待了 ${waited} 秒）`);
        break;
      } else {
        process.stdout.write(`⏳ 等待扫码中... (${waited}/${maxWait}秒)\r`);
      }
    }
    
    if (!loggedIn) {
      console.log('\n⚠️ 等待超时，可能未扫码或检测失败');
    }
    
    // 5. 截图最终状态
    await screenshot(page, '03_最终状态');
    
    // 6. 保存登录状态
    await context.storageState({ path: LOGIN_STATE_FILE });
    
    if (fs.existsSync(LOGIN_STATE_FILE)) {
      const stats = fs.statSync(LOGIN_STATE_FILE);
      const content = JSON.parse(fs.readFileSync(LOGIN_STATE_FILE, 'utf8'));
      console.log('\n📊 状态文件信息:');
      console.log(`   文件大小: ${(stats.size / 1024).toFixed(1)} KB`);
      console.log(`   Cookie数量: ${content.cookies?.length || 0}`);
      console.log(`   本地存储: ${Object.keys(content.origins?.[0]?.localStorage || {}).length} 项`);
      
      if (content.cookies?.length > 2) {
        console.log('🎉 登录状态保存成功！');
      } else {
        console.log('⚠️ Cookie较少，可能未完全登录');
      }
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await browser.close();
    console.log('🔚 浏览器已关闭');
    
    // 列出所有截图
    const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'));
    console.log('\n📸 生成的截图:');
    files.forEach(f => console.log('   -', f));
  }
}

main().catch(console.error);
