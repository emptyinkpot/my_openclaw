// 把这个文件保存为 save_login.js，本地运行
const { chromium } = require('playwright');
const fs = require('fs');

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('https://www.baimengxiezuo.com');
  await page.click('button:has-text("登录")');
  
  console.log('请扫码登录...');
  console.log('登录成功后，在这里按回车键保存状态');
  
  process.stdin.once('data', async () => {
    await context.storageState({ path: 'baimeng_login_state.json' });
    console.log('已保存到 baimeng_login_state.json');
    await browser.close();
  });
}

main();
