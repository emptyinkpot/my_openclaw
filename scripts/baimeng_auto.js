/**
 * 白梦写作网自动化 - 连接已登录的浏览器
 * 需要先手动扫码登录，保持浏览器打开
 */

const { chromium } = require('playwright');
const fs = require('fs');

async function generateArticleWithExistingBrowser(prompt) {
  console.log('🔌 尝试连接已打开的 Chrome...');
  
  // 连接已运行的 Chrome（需要 Chrome 以调试模式启动）
  // 先启动 Chrome：google-chrome --remote-debugging-port=9222
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  
  const context = browser.contexts()[0] || await browser.newContext();
  const page = context.pages()[0] || await context.newPage();
  
  try {
    // 检查是否已登录（根据实际页面特征判断）
    console.log('✅ 已连接到浏览器');
    
    // 导航到写作页面
    await page.goto('https://baimengxiezuo.com/zh-Hans/library', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    console.log('📝 进入写作页面...');
    await page.waitForTimeout(3000);
    
    // 截图查看当前状态
    await page.screenshot({ path: '/workspace/projects/output/debug_1.png' });
    console.log('📸 已截图保存到 output/debug_1.png');
    
    // TODO: 根据实际页面找到 AI 写作入口
    // 需要用户提供具体的操作步骤
    
    console.log('⚠️ 请查看截图，告诉我下一步点击哪里');
    
    return { success: true, message: '浏览器已连接，请查看截图' };
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    await page.screenshot({ path: '/workspace/projects/output/error.png' });
    return { success: false, error: error.message };
  }
}

// 主函数
async function main() {
  const prompt = process.argv.slice(2).join(' ') || '写一篇关于人工智能的文章';
  
  const result = await generateArticleWithExistingBrowser(prompt);
  
  if (result.success) {
    console.log('🎉', result.message);
  } else {
    console.log('💥 失败:', result.error);
    process.exit(1);
  }
}

main().catch(console.error);
