/**
 * 白梦写作网自动化 - 分步方案
 * 
 * 步骤1：手动登录并保存状态
 * 步骤2：使用保存的状态自动执行
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const AUTH_FILE = '/workspace/projects/output/baimeng_auth.json';
const OUTPUT_DIR = '/workspace/projects/output';

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * 步骤1：首次登录，保存状态
 * 运行：node baimeng_helper.js login
 */
async function saveLoginState() {
  console.log('🌐 启动浏览器，请手动扫码登录...');
  console.log('⏳ 登录成功后按 Ctrl+C 保存状态，或等待 60 秒后自动保存');
  
  const browser = await chromium.launch({
    headless: false,
    executablePath: '/opt/google/chrome/chrome',
    args: ['--window-size=1920,1080']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();
  
  // 访问登录页
  await page.goto('https://baimengxiezuo.com/zh-Hans/login', { 
    waitUntil: 'networkidle' 
  });
  
  console.log('📱 请使用微信扫码登录...');
  console.log('✅ 登录成功后，浏览器会保持打开');
  
  // 等待用户登录（最多5分钟）
  await page.waitForTimeout(300000);
  
  // 保存登录状态
  await context.storageState({ path: AUTH_FILE });
  console.log('💾 登录状态已保存到:', AUTH_FILE);
  
  await browser.close();
}

/**
 * 步骤2：使用保存的状态自动写作
 * 运行：node baimeng_helper.js write "提示词"
 */
async function autoWrite(prompt) {
  if (!fs.existsSync(AUTH_FILE)) {
    console.error('❌ 未找到登录状态，请先运行: node baimeng_helper.js login');
    process.exit(1);
  }

  console.log('🤖 自动写作:', prompt);
  
  const browser = await chromium.launch({
    headless: true, // 无界面模式
    executablePath: '/opt/google/chrome/chrome'
  });

  // 加载保存的登录状态
  const context = await browser.newContext({
    storageState: AUTH_FILE,
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();
  
  try {
    // 访问写作页面
    await page.goto('https://baimengxiezuo.com/zh-Hans/library', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    await page.waitForTimeout(3000);
    
    // 截图查看页面结构
    await page.screenshot({ path: `${OUTPUT_DIR}/step1_library.png` });
    console.log('📸 已截图 library 页面');
    
    // TODO: 根据实际页面结构操作
    // 需要分析页面后才能编写具体步骤
    
    console.log('⏸️ 请查看截图，告诉我:');
    console.log('   1. AI 写作入口在哪里？（按钮/链接）');
    console.log('   2. 提示词输入框怎么找？');
    console.log('   3. 生成按钮在哪里？');
    console.log('   4. 结果怎么复制？');
    
    // 保持浏览器打开供检查
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ 错误:', error);
    await page.screenshot({ path: `${OUTPUT_DIR}/error.png` });
  } finally {
    await browser.close();
  }
}

// 主函数
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'login':
      await saveLoginState();
      break;
    case 'write':
      const prompt = process.argv.slice(3).join(' ') || '写一篇关于未来科技的文章';
      await autoWrite(prompt);
      break;
    default:
      console.log('使用方法:');
      console.log('  1. 首次登录: node baimeng_helper.js login');
      console.log('     （扫码登录后会自动保存状态）');
      console.log('');
      console.log('  2. 自动写作: node baimeng_helper.js write "你的提示词"');
      console.log('     （使用保存的登录状态自动执行）');
  }
}

main().catch(console.error);
