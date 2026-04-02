const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = '/workspace/projects/output/baimeng_steps';

// 确保截图目录存在
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

let step = 0;
async function screenshot(page, name) {
  step++;
  const filePath = path.join(SCREENSHOT_DIR, `${String(step).padStart(2, '0')}_${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`📸 截图: ${filePath}`);
  return filePath;
}

async function main() {
  console.log('🚀 启动浏览器...');
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  
  const page = await context.newPage();
  
  try {
    // 1. 打开首页（使用domcontentloaded更快）
    console.log('📱 正在打开白梦写作网...');
    await page.goto('https://www.baimengxiezuo.com', { 
      waitUntil: 'domcontentloaded', 
      timeout: 60000 
    });
    await page.waitForTimeout(3000);
    await screenshot(page, '01_首页');
    console.log('✅ 首页已截图');
    
    // 2. 尝试多种方式找到登录按钮
    console.log('🔍 查找登录按钮...');
    
    // 方法1: 通过文字查找
    let loginFound = false;
    const loginTexts = ['登录', '登入', 'Login', 'Sign in'];
    
    for (const text of loginTexts) {
      try {
        const locator = page.getByText(text, { exact: false });
        if (await locator.count() > 0) {
          await locator.first().click();
          console.log(`✅ 点击"${text}"按钮`);
          loginFound = true;
          break;
        }
      } catch (e) {}
    }
    
    // 方法2: 通过CSS选择器
    if (!loginFound) {
      const selectors = [
        'button[class*="login"]',
        'a[class*="login"]',
        '[data-testid*="login"]',
        'header button',
        'header a'
      ];
      
      for (const selector of selectors) {
        try {
          const el = page.locator(selector).first();
          if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
            await el.click();
            console.log(`✅ 使用选择器点击: ${selector}`);
            loginFound = true;
            break;
          }
        } catch (e) {}
      }
    }
    
    // 3. 等待并截图
    console.log('⏳ 等待登录界面加载...');
    await page.waitForTimeout(4000);
    await screenshot(page, '02_登录界面');
    
    console.log('\n✅ 截图完成！');
    
    // 显示截图列表
    const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'));
    console.log('\n📸 已生成的截图:');
    files.forEach(f => {
      const size = (fs.statSync(path.join(SCREENSHOT_DIR, f)).size / 1024).toFixed(1);
      console.log(`   - ${f} (${size} KB)`);
    });
    
    // 保持打开状态等待扫码
    console.log('\n⏳ 浏览器保持打开，等待 60 秒...');
    await page.waitForTimeout(60000);
    
    // 再次截图确认状态
    await screenshot(page, '03_当前状态');
    
    // 保存登录状态（如果有）
    await context.storageState({ path: '/workspace/projects/output/login_state.json' });
    console.log('💾 登录状态已尝试保存');
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    try {
      await screenshot(page, '错误截图');
    } catch (e) {}
  } finally {
    await browser.close();
    console.log('🔚 浏览器已关闭');
  }
}

main().catch(console.error);
