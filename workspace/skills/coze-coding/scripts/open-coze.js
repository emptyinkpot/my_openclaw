#!/usr/bin/env node
/**
 * 打开扣子编程
 * 
 * 用法: node open-coze.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BROWSER_DIR = '/workspace/projects/browser/default';
const BACKUP_FILE = '/workspace/projects/cookies-accounts/coze-account-1-full.json';
const COZE_HOME = 'https://www.coze.cn';
const COZE_CODE = 'https://code.coze.cn/home';

async function main() {
  // 清理锁文件
  ['SingletonLock', 'SingletonSocket', 'SingletonCookie'].forEach(f => {
    const p = path.join(BROWSER_DIR, f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });
  
  const browser = await chromium.launchPersistentContext(BROWSER_DIR, {
    headless: false,
    viewport: null,
    args: ['--no-sandbox', '--start-maximized']
  });
  
  const page = browser.pages()[0] || await browser.newPage();
  
  // 恢复登录状态
  if (fs.existsSync(BACKUP_FILE)) {
    const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'));
    
    // 步骤1: 先访问主站设置登录状态
    await page.goto(COZE_HOME, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    
    if (backup.localStorage) {
      await page.evaluate(items => {
        for (const [k, v] of Object.entries(items)) {
          localStorage.setItem(k, v);
        }
      }, backup.localStorage);
    }
    
    if (backup.cookies) {
      await browser.addCookies(backup.cookies);
    }
    
    // 步骤2: 跳转扣子编程
    await page.goto(COZE_CODE, { waitUntil: 'networkidle' });
  } else {
    await page.goto(COZE_CODE, { waitUntil: 'networkidle' });
  }
  
  console.log(JSON.stringify({
    success: true,
    url: page.url(),
    message: '扣子编程已打开'
  }));
}

main().catch(e => {
  console.log(JSON.stringify({ success: false, error: e.message }));
  process.exit(1);
});
