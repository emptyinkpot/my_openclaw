#!/usr/bin/env node
/**
 * 番茄小说数据扫描脚本
 * 
 * 功能：
 * - 扫描所有番茄账号的作品列表
 * - 获取每部作品的章节数量
 * - 保存到缓存文件供前端使用
 * 
 * 执行方式：
 *   node scripts/scan/fanqie.js
 * 
 * 调度配置：每30分钟执行一次
 */

const fs = require('fs');
const path = require('path');

// 路径配置
const STORAGE_DIR = '/workspace/projects/auto-scripts/storage';
const CACHE_DIR = path.join(STORAGE_DIR, 'cache');
const ACCOUNTS_DIR = path.join(STORAGE_DIR, 'accounts/fanqie');

// 确保目录存在
[STORAGE_DIR, CACHE_DIR, ACCOUNTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 缓存文件路径
const CHAPTERS_CACHE_FILE_1 = path.join(CACHE_DIR, 'fanqie-account-1-chapters.json');
const CHAPTERS_CACHE_FILE_2 = path.join(CACHE_DIR, 'fanqie-account-2-chapters.json');
const WORKS_CACHE_FILE_1 = path.join(CACHE_DIR, 'fanqie-account-1-works.json');
const WORKS_CACHE_FILE_2 = path.join(CACHE_DIR, 'fanqie-account-2-works.json');

// 账号配置
const FANQIE_ACCOUNTS = {
  account_1: {
    name: '番茄账号1',
    browserDir: '/workspace/projects/browser/fanqie-account-1',
    cookiesFile: '/workspace/projects/cookies-accounts/fanqie-20260314-030709.json',
    chaptersCache: CHAPTERS_CACHE_FILE_1,
    worksCache: WORKS_CACHE_FILE_1
  },
  account_2: {
    name: '番茄账号2',
    browserDir: '/workspace/projects/browser/fanqie-account-2',
    cookiesFile: '/workspace/projects/cookies-accounts/fanqie-20260314-112322.json',
    chaptersCache: CHAPTERS_CACHE_FILE_2,
    worksCache: WORKS_CACHE_FILE_2
  }
};

// 工具函数
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const timestamp = () => new Date().toLocaleTimeString('zh-CN');

/**
 * 中文数字转阿拉伯数字
 */
function chineseToNum(chinese) {
  const map = { '零':0, '一':1, '二':2, '三':3, '四':4, '五':5, '六':6, '七':7, '八':8, '九':9, '十':10, '百':100, '千':1000 };
  let result = 0;
  let temp = 0;
  
  for (const char of chinese) {
    if (map[char] !== undefined) {
      if (map[char] < 10) {
        temp = temp * 10 + map[char];
      } else {
        if (temp === 0) temp = 1;
        result += temp * map[char];
        temp = 0;
      }
    }
  }
  return result + temp;
}

/**
 * 从卡片文本提取章节数
 */
function extractChapterCount(text) {
  // 支持多种格式
  const patterns = [
    /第\s*([零一二三四五六七八九十百千\d]+)\s*章/,
    /更新至\s*第?\s*([零一二三四五六七八九十百千\d]+)\s*章?/,
    /已发布\s*([零一二三四五六七八九十百千\d]+)\s*章/,
    /共\s*([零一二三四五六七八九十百千\d]+)\s*章/,
    /(\d+)\s*章/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const num = match[1];
      if (/^\d+$/.test(num)) {
        return parseInt(num);
      } else {
        return chineseToNum(num);
      }
    }
  }
  return 0;
}

/**
 * 清理浏览器锁文件
 */
function cleanLocks(browserDir) {
  ['SingletonLock', 'SingletonSocket', 'SingletonCookie', 'Lock'].forEach(f => {
    try { fs.unlinkSync(path.join(browserDir, f)); } catch (e) {}
  });
}

/**
 * 扫描单个账号
 */
async function scanAccount(accountId, accountConfig) {
  console.log(`[${timestamp()}] [${accountConfig.name}] 开始扫描...`);
  
  const { chromium } = require('playwright');
  
  // 清理锁文件
  cleanLocks(accountConfig.browserDir);
  
  const works = [];
  const chapters = [];
  
  try {
    const browser = await chromium.launchPersistentContext(accountConfig.browserDir, {
      headless: true, // 后台运行
      channel: 'chrome',
      viewport: { width: 1400, height: 850 },
      args: ['--no-sandbox']
    });
    
    const page = browser.pages()[0] || await browser.newPage();
    
    // 加载 Cookie
    if (fs.existsSync(accountConfig.cookiesFile)) {
      try {
        const cookieData = JSON.parse(fs.readFileSync(accountConfig.cookiesFile, 'utf-8'));
        const cookies = cookieData.cookies || cookieData;
        if (Array.isArray(cookies) && cookies.length > 0) {
          await page.context().addCookies(cookies);
          console.log(`[${timestamp()}]   已加载 ${cookies.length} 个 Cookie`);
        }
      } catch (e) {
        console.log(`[${timestamp()}]   Cookie 加载失败: ${e.message}`);
      }
    }
    
    // 访问作品管理页面
    console.log(`[${timestamp()}]   获取作品列表...`);
    await page.goto('https://fanqienovel.com/main/writer/book-manage', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    await wait(5000);
    
    // 等待作品卡片加载
    await page.waitForSelector('[id^="long-article-table-item-"]', { 
      state: 'visible', 
      timeout: 20000 
    });
    
    // 获取作品卡片
    const cards = await page.locator('[id^="long-article-table-item-"]').all();
    console.log(`[${timestamp()}]   找到 ${cards.length} 个作品`);
    
    for (let i = 0; i < cards.length; i++) {
      try {
        const card = cards[i];
        
        // 获取标题
        const titleText = await card.locator('.hoverup').first().innerText().catch(() => '未知');
        const cleanTitle = titleText.split('\n')[0].trim();
        
        // 获取卡片ID
        const cardId = await card.getAttribute('id');
        const workId = cardId.replace('long-article-table-item-', '');
        
        // 获取卡片完整文本
        const cardText = await card.innerText();
        
        // 提取章节数
        let totalChapters = extractChapterCount(cardText);
        
        // 如果没提取到，尝试其他方式
        if (!totalChapters) {
          // 尝试从数字元素获取
          const numSelectors = ['.text-\\[12px\\]', '.text-xs', '.text-gray-500'];
          for (const selector of numSelectors) {
            try {
              const numText = await card.locator(selector).first().innerText({ timeout: 500 }).catch(() => '');
              const numMatch = numText.match(/(\d+)/);
              if (numMatch) {
                totalChapters = parseInt(numMatch[1]);
                break;
              }
            } catch (e) {}
          }
        }
        
        // 获取状态
        let status = '连载中';
        if (cardText.includes('已签约')) status = '已签约';
        else if (cardText.includes('已完结')) status = '已完结';
        else if (cardText.includes('停止推荐')) status = '已停止推荐';
        
        // 获取字数（从卡片文本匹配）
        let wordCount = '';
        const wordMatch = cardText.match(/(\d+\.?\d*)\s*[万字万]/);
        if (wordMatch) {
          wordCount = wordMatch[1] + '万字';
        }
        
        works.push({
          id: workId,
          bookId: workId,
          title: cleanTitle,
          status,
          index: i + 1
        });
        
        chapters.push({
          title: cleanTitle,
          totalChapters,
          latestChapter: totalChapters,
          wordCount,
          account: accountConfig.name
        });
        
        console.log(`[${timestamp()}]   ✓ ${cleanTitle}: ${totalChapters}章 ${wordCount}`);
        
      } catch (e) {
        console.log(`[${timestamp()}]   ✗ 作品${i+1}: ${e.message}`);
      }
    }
    
    await browser.close();
    console.log(`[${timestamp()}] [${accountConfig.name}] 扫描完成: ${works.length} 个作品`);
    
  } catch (e) {
    console.log(`[${timestamp()}] [${accountConfig.name}] 扫描失败: ${e.message}`);
  }
  
  return { works, chapters };
}

/**
 * 主函数
 */
async function main() {
  console.log(`\n=== 番茄小说数据扫描 ===`);
  console.log(`启动时间: ${new Date().toLocaleString('zh-CN')}\n`);
  
  const allWorks = [];
  const allChapters = [];
  
  // 扫描所有账号
  for (const [accountId, accountConfig] of Object.entries(FANQIE_ACCOUNTS)) {
    const result = await scanAccount(accountId, accountConfig);
    
    // 保存到缓存文件
    if (result.works.length > 0) {
      fs.writeFileSync(accountConfig.worksCache, JSON.stringify(result.works, null, 2));
      console.log(`[${timestamp()}]   作品缓存已保存: ${accountConfig.worksCache}`);
    }
    
    if (result.chapters.length > 0) {
      fs.writeFileSync(accountConfig.chaptersCache, JSON.stringify(result.chapters, null, 2));
      console.log(`[${timestamp()}]   章节缓存已保存: ${accountConfig.chaptersCache}`);
    }
    
    allWorks.push(...result.works);
    allChapters.push(...result.chapters);
    
    // 账号间等待
    await wait(2000);
  }
  
  console.log(`\n[${timestamp()}] === 扫描完成 ===`);
  console.log(`总计: ${allWorks.length} 个作品`);
  console.log(`下次扫描: 30分钟后\n`);
}

// 执行
main().catch(e => {
  console.error('扫描出错:', e);
  process.exit(1);
});
