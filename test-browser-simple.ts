#!/usr/bin/env node

console.log('🚀 开始测试浏览器...');

async function testBrowser() {
  try {
    console.log('📦 加载 playwright...');
    const { chromium } = require('playwright');
    
    console.log('🌐 启动浏览器 (headless: false)...');
    console.log('📍 注意：如果你在无头环境中运行，headless: false 可能无效！');
    
    const browser = await chromium.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    console.log('✅ 浏览器已启动！');
    
    console.log('📄 创建新页面...');
    const page = await browser.newPage();
    
    console.log('🔗 访问百度...');
    await page.goto('https://www.baidu.com');
    
    console.log('📸 截图保存到 /tmp/test-screenshot.png...');
    await page.screenshot({ path: '/tmp/test-screenshot.png' });
    console.log('✅ 截图已保存！');
    
    console.log('\n🎉 测试成功！');
    console.log('📊 总结：');
    console.log('   - 浏览器已启动');
    console.log('   - 页面已加载');
    console.log('   - 截图已保存到 /tmp/test-screenshot.png');
    
    console.log('\n⏰ 浏览器将在 30 秒后自动关闭...');
    console.log('   如果你看到浏览器窗口，现在可以手动操作它！');
    
    setTimeout(async () => {
      console.log('\n👋 关闭浏览器...');
      await browser.close();
      console.log('✅ 浏览器已关闭');
    }, 30000);
    
  } catch (error) {
    console.error('\n❌ 测试失败！');
    console.error('📛 错误信息:', error.message);
    console.error('\n🔍 完整错误堆栈:');
    console.error(error.stack);
    
    console.log('\n💡 可能的原因:');
    console.log('   1. 这是一个无头环境，不支持显示图形界面');
    console.log('   2. Playwright 浏览器没有正确安装');
    console.log('   3. 缺少必要的系统依赖');
    
    console.log('\n🔧 尝试运行: npx playwright install chromium');
  }
}

testBrowser();
