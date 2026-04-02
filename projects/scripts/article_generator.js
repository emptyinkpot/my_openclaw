/**
 * 自动化文章生成脚本
 * 使用 Playwright 控制浏览器自动登录并生成文章
 * 
 * 使用方法:
 * node article_generator.js <site_url> <username> <password> <prompt>
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function generateArticle(siteUrl, username, password, prompt) {
  console.log('🚀 启动浏览器...');
  
  const browser = await chromium.launch({
    headless: false, // 设为 true 可无界面运行
    slowMo: 100, // 放慢操作便于观察
    executablePath: '/opt/google/chrome/chrome' // 使用系统 Chrome
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });

  const page = await context.newPage();
  
  try {
    // 1. 访问登录页
    console.log('📱 访问网站:', siteUrl);
    await page.goto(siteUrl, { waitUntil: 'networkidle' });
    
    // 2. 登录（需要根据实际网站调整选择器）
    console.log('🔑 执行登录...');
    // 示例：等待登录表单出现
    await page.waitForSelector('input[type="text"], input[name="username"], input[name="email"]', { timeout: 10000 });
    
    // 填写用户名（根据实际网站修改选择器）
    await page.fill('input[type="text"], input[name="username"], input[name="email"]', username);
    
    // 填写密码
    await page.fill('input[type="password"]', password);
    
    // 点击登录按钮
    await page.click('button[type="submit"], .login-btn, .submit');
    
    // 等待登录成功（根据实际网站判断）
    await page.waitForTimeout(3000);
    
    // 3. 导航到 AI 写作页面（根据实际 URL 修改）
    console.log('📝 进入 AI 写作页面...');
    // await page.goto('https://your-site.com/ai-write');
    
    // 4. 输入提示词生成文章
    console.log('🤖 发送提示词:', prompt);
    // 等待输入框
    await page.waitForSelector('textarea, .ai-input, [contenteditable="true"]', { timeout: 10000 });
    
    // 输入提示词
    await page.fill('textarea, .ai-input, [contenteditable="true""]', prompt);
    
    // 点击生成按钮
    await page.click('button:has-text("生成"), button:has-text("Generate"), .generate-btn');
    
    // 5. 等待生成完成
    console.log('⏳ 等待 AI 生成文章...');
    await page.waitForTimeout(30000); // 等待 30 秒
    
    // 6. 获取文章内容（根据实际网站调整选择器）
    console.log('📋 复制文章内容...');
    const articleContent = await page.$eval('.article-content, .result, .content, .output', el => el.innerText);
    
    // 7. 保存到文件
    const outputFile = `/workspace/projects/output/article_${Date.now()}.txt`;
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, articleContent);
    
    console.log('✅ 文章已保存到:', outputFile);
    console.log('\n📝 文章内容预览:');
    console.log(articleContent.substring(0, 500) + '...');
    
    return {
      success: true,
      content: articleContent,
      file: outputFile
    };
    
  } catch (error) {
    console.error('❌ 执行出错:', error.message);
    // 截图保存错误现场
    await page.screenshot({ path: `/workspace/projects/output/error_${Date.now()}.png` });
    return { success: false, error: error.message };
  } finally {
    await browser.close();
    console.log('🔒 浏览器已关闭');
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 4) {
    console.log('使用方法:');
    console.log('node article_generator.js <网站URL> <用户名> <密码> <提示词>');
    console.log('');
    console.log('示例:');
    console.log('node article_generator.js https://example.com/login user pass "写一篇关于AI的文章"');
    process.exit(1);
  }
  
  const [siteUrl, username, password, ...promptParts] = args;
  const prompt = promptParts.join(' ');
  
  const result = await generateArticle(siteUrl, username, password, prompt);
  
  if (result.success) {
    console.log('\n🎉 任务完成！');
    process.exit(0);
  } else {
    console.log('\n💥 任务失败:', result.error);
    process.exit(1);
  }
}

main().catch(console.error);
