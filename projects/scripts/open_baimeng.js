/**
 * 打开白梦写作网并截图
 */

const { chromium } = require('playwright');
const fs = require('fs');

const OUTPUT_DIR = '/workspace/projects/output';

async function openWebsite() {
  console.log('🌐 正在打开 https://baimengxiezuo.com/zh-Hans/library');
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/google/chrome/chrome'
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();
  
  try {
    // 访问网站
    await page.goto('https://baimengxiezuo.com/zh-Hans/library', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    await page.waitForTimeout(3000);
    
    // 截图
    await page.screenshot({ path: `${OUTPUT_DIR}/baimeng_library.png`, fullPage: true });
    console.log('✅ 截图已保存');
    
    // 获取页面信息
    const info = await page.evaluate(() => ({
      title: document.title,
      url: window.location.href,
      buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(Boolean).slice(0, 10),
      links: Array.from(document.querySelectorAll('a')).slice(0, 5).map(a => ({ text: a.textContent?.trim(), href: a.href }))
    }));
    
    console.log('\n📋 页面信息:');
    console.log('标题:', info.title);
    console.log('URL:', info.url);
    console.log('\n按钮:', info.buttons);
    console.log('\n链接:', info.links);
    
    // 保持浏览器打开 30 秒
    console.log('\n⏳ 浏览器保持打开 30 秒...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await browser.close();
    console.log('🔒 浏览器已关闭');
  }
}

openWebsite().catch(console.error);
