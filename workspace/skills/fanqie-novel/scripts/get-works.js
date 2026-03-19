#!/usr/bin/env node
/**
 * 番茄小说获取作品列表
 * 
 * 直接使用 Playwright，可靠稳定
 */

const { chromium } = require('playwright');
const fs = require('fs');

const BROWSER_DIR = '/workspace/projects/browser/default';
const BACKUP_FILE = '/workspace/projects/cookies-accounts/fanqie-default-full.json';

async function main() {
  let browser = null;
  
  try {
    // 清理锁文件
    ['SingletonLock', 'SingletonSocket', 'SingletonCookie'].forEach(f => {
      const p = require('path').join(BROWSER_DIR, f);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });
    
    // 启动浏览器
    browser = await chromium.launchPersistentContext(BROWSER_DIR, {
      headless: true,
      viewport: null,
      args: ['--no-sandbox']
    });
    
    const page = browser.pages()[0] || await browser.newPage();
    
    // 恢复登录状态
    if (fs.existsSync(BACKUP_FILE)) {
      const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'));
      
      await page.goto('https://fanqienovel.com', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      
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
    }
    
    // 访问作品管理页
    await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // 提取作品 - 使用精确的 home-book-item 选择器
    const works = await page.evaluate(() => {
      const results = [];
      
      // 只查找 home-book-item 类的元素（真正的作品卡片）
      document.querySelectorAll('.home-book-item').forEach(el => {
        // 获取标题（第一行文字）
        const titleEl = el.querySelector('.book-item-info [class*="title"], .book-item-info h3, .book-item-info h4');
        let title = titleEl?.innerText?.trim()?.split('\n')[0];
        
        // 如果没找到，尝试其他方式
        if (!title) {
          const infoEl = el.querySelector('.book-item-info');
          title = infoEl?.innerText?.trim()?.split('\n')[0];
        }
        
        // 获取状态信息
        const text = el.innerText || '';
        const status = text.includes('连载中') ? '连载中' : 
                       text.includes('已完结') ? '已完结' : 
                       text.includes('待审核') ? '待审核' : '';
        
        // 获取章节数
        const chapterMatch = text.match(/(\d+)\s*章/);
        const chapters = chapterMatch ? chapterMatch[1] : '0';
        
        if (title && title.length > 0 && title !== '我的小说') {
          results.push({ 
            title,
            status,
            chapters: chapters + ' 章'
          });
        }
      });
      
      // 去重
      const seen = new Set();
      return results.filter(w => seen.has(w.title) ? false : (seen.add(w.title), true));
    });
    
    console.log(JSON.stringify({
      success: true,
      platform: 'fanqie',
      count: works.length,
      works: works,
      message: `找到 ${works.length} 部作品`
    }));
    
  } catch (error) {
    console.log(JSON.stringify({ success: false, error: error.message }));
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

main();
