/**
 * 白梦写作网 - 网站结构分析
 * 用于分析页面结构，找到操作元素
 */

const { chromium } = require('playwright');
const fs = require('fs');

const OUTPUT_DIR = '/workspace/projects/output';

async function analyzeWebsite() {
  console.log('🔍 分析网站结构...');
  
  // 确保输出目录存在
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,  // 无界面模式
    executablePath: '/opt/google/chrome/chrome'
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();
  
  try {
    // 1. 访问登录页并截图
    console.log('📸 正在截取登录页...');
    await page.goto('https://baimengxiezuo.com/zh-Hans/login', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${OUTPUT_DIR}/01_login_page.png`, fullPage: true });
    console.log('✅ 登录页截图已保存: output/01_login_page.png');
    
    // 2. 获取页面HTML结构
    const loginHtml = await page.content();
    fs.writeFileSync(`${OUTPUT_DIR}/01_login_page.html`, loginHtml);
    console.log('✅ 登录页HTML已保存: output/01_login_page.html');
    
    // 3. 分析登录页元素
    const loginElements = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const buttons = Array.from(document.querySelectorAll('button'));
      const links = Array.from(document.querySelectorAll('a'));
      
      return {
        inputs: inputs.map(i => ({ type: i.type, name: i.name, id: i.id, placeholder: i.placeholder })),
        buttons: buttons.map(b => ({ text: b.textContent?.trim(), id: b.id, class: b.className })),
        wechatLogin: links.filter(l => l.href?.includes('wechat') || l.textContent?.includes('微信')),
        qrCode: document.querySelector('img[src*="qr"], .qrcode, #qrcode') ? 'found' : 'not found'
      };
    });
    
    console.log('\n📋 登录页分析结果:');
    console.log(JSON.stringify(loginElements, null, 2));
    
    // 4. 访问 library 页面（未登录状态）
    console.log('\n📸 正在截取 library 页面...');
    await page.goto('https://baimengxiezuo.com/zh-Hans/library', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${OUTPUT_DIR}/02_library_page.png`, fullPage: true });
    console.log('✅ Library页截图已保存: output/02_library_page.png');
    
    // 5. 分析 library 页面
    const libraryInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        hasLoginButton: !!document.querySelector('button:contains("登录"), a:contains("登录")'),
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(Boolean),
        links: Array.from(document.querySelectorAll('a')).slice(0, 10).map(a => ({ text: a.textContent?.trim(), href: a.href }))
      };
    });
    
    console.log('\n📋 Library页分析结果:');
    console.log(JSON.stringify(libraryInfo, null, 2));
    
    // 保存分析报告
    const report = {
      timestamp: new Date().toISOString(),
      loginPage: loginElements,
      libraryPage: libraryInfo
    };
    fs.writeFileSync(`${OUTPUT_DIR}/analysis_report.json`, JSON.stringify(report, null, 2));
    
    console.log('\n✅ 分析完成！');
    console.log('📁 所有文件保存在: /workspace/projects/output/');
    console.log('');
    console.log('请查看截图文件，告诉我:');
    console.log('1. 微信扫码登录的具体流程');
    console.log('2. 登录后如何进入 AI 写作');
    console.log('3. 写作页面的 URL 是什么');
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    await page.screenshot({ path: `${OUTPUT_DIR}/error.png` });
  } finally {
    await browser.close();
    console.log('\n🔒 浏览器已关闭');
  }
}

// 主函数
async function main() {
  console.log('🤖 白梦写作网网站结构分析工具');
  console.log('================================\n');
  await analyzeWebsite();
}

main().catch(console.error);
