/**
 * 带截图记录的白梦写作网操作
 * 每步操作后自动截图
 */

const { chromium } = require('playwright');
const fs = require('fs');

const OUTPUT_DIR = '/workspace/projects/output/baimeng_steps';
let step = 0;

async function screenshot(page, description) {
  step++;
  const filename = `${String(step).padStart(2, '0')}_${description.replace(/\s+/g, '_')}.png`;
  await page.screenshot({ path: `${OUTPUT_DIR}/${filename}`, fullPage: true });
  console.log(`📸 [步骤 ${step}] ${description} → ${filename}`);
}

async function demoWithScreenshots() {
  console.log('🎬 开始录制操作步骤...\n');
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/google/chrome/chrome'
  });

  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  try {
    // 步骤 1: 访问首页
    await page.goto('https://baimengxiezuo.com/zh-Hans/', { waitUntil: 'networkidle' });
    await screenshot(page, '01_首页');
    
    // 步骤 2: 点击登录按钮
    await page.click('text=注册 / 登录');
    await page.waitForTimeout(2000);
    await screenshot(page, '02_点击登录按钮');
    
    // 步骤 3: 等待登录弹窗
    await page.waitForTimeout(3000);
    await screenshot(page, '03_登录弹窗');
    
    // 步骤 4: 访问工具箱
    await page.goto('https://baimengxiezuo.com/zh-Hans/generator/');
    await page.waitForTimeout(3000);
    await screenshot(page, '04_工具箱页面');
    
    console.log('\n✅ 操作录制完成！');
    console.log(`📁 所有截图保存在: ${OUTPUT_DIR}/`);
    console.log('\n你可以查看这些截图看到每一步的操作结果。');
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    await screenshot(page, '错误截图');
  } finally {
    await browser.close();
  }
}

demoWithScreenshots().catch(console.error);
