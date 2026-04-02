const express = require('express');
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ScreenshotManager = require('../scripts/screenshot_manager');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// 全局浏览器实例
let browser = null;
let page = null;
let screenshotMgr = null;

const CONFIG = {
  loginStateFile: '/workspace/projects/output/baimeng_login_state.json',
  screenshotDir: '/workspace/projects/output/baimeng_steps'
};

// 初始化截图管理器
screenshotMgr = new ScreenshotManager({
  outputDir: CONFIG.screenshotDir,
  maxAge: 3 * 24 * 60 * 60 * 1000,
  maxCount: 20,
  prefix: 'baimeng_'
});

// 启动浏览器
app.post('/api/start', async (req, res) => {
  try {
    if (!browser) {
      browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox']
      });
    }
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      storageState: CONFIG.loginStateFile
    });
    
    page = await context.newPage();
    
    res.json({ success: true, message: '浏览器已启动' });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 打开首页
app.post('/api/open-home', async (req, res) => {
  try {
    if (!page) throw new Error('浏览器未启动');
    
    await page.goto('https://www.baimengxiezuo.com', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    await page.waitForTimeout(2000);
    
    // 截图
    const screenshotPath = screenshotMgr.getScreenshotPath('01_首页');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    
    res.json({ 
      success: true, 
      screenshot: path.basename(screenshotPath),
      message: '已打开首页'
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 点击开始创作
app.post('/api/start-creating', async (req, res) => {
  try {
    if (!page) throw new Error('浏览器未启动');
    
    await page.click('text=免费开始创作');
    await page.waitForTimeout(3000);
    
    // 截图
    const screenshotPath = screenshotMgr.getScreenshotPath('02_开始创作');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    
    // 获取作品列表
    const works = await page.evaluate(() => {
      const results = [];
      const h3Elements = document.querySelectorAll('h3');
      
      h3Elements.forEach((el) => {
        const title = el.textContent?.trim();
        if (title && title.length > 0 && title !== '创建新作品') {
          let description = '';
          const parent = el.closest('[class*="card"]') || el.closest('[class*="item"]') || el.parentElement;
          if (parent) {
            const descEl = parent.querySelector('p');
            if (descEl) description = descEl.textContent?.trim();
          }
          
          results.push({
            title: title,
            description: description
          });
        }
      });
      
      return results;
    });
    
    // 截图作品列表
    const listScreenshotPath = screenshotMgr.getScreenshotPath('03_作品列表');
    await page.screenshot({ path: listScreenshotPath, fullPage: true });
    
    res.json({ 
      success: true, 
      screenshot: path.basename(listScreenshotPath),
      works: works,
      message: `找到 ${works.length} 个作品`
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 进入作品
app.post('/api/enter-work', async (req, res) => {
  try {
    const { title } = req.body;
    if (!page) throw new Error('浏览器未启动');
    if (!title) throw new Error('请提供作品名称');
    
    // 点击作品
    await page.evaluate((workTitle) => {
      const h3Elements = document.querySelectorAll('h3');
      for (const el of h3Elements) {
        if (el.textContent.trim() === workTitle) {
          el.click();
          break;
        }
      }
    }, title);
    
    await page.waitForTimeout(3000);
    
    // 截图
    const safeTitle = title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').slice(0, 20);
    const screenshotPath = screenshotMgr.getScreenshotPath(`04_进入作品_${safeTitle}`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    
    res.json({ 
      success: true, 
      screenshot: path.basename(screenshotPath),
      message: `已进入作品: ${title}`
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 获取截图列表
app.get('/api/screenshots', (req, res) => {
  const list = screenshotMgr.getScreenshotList();
  res.json({ screenshots: list.map(s => path.basename(s.path)) });
});

// 查看截图
app.get('/screenshots/:name', (req, res) => {
  const filePath = path.join(CONFIG.screenshotDir, req.params.name);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('截图不存在');
  }
});

// 关闭浏览器
app.post('/api/close', async (req, res) => {
  try {
    if (browser) {
      await browser.close();
      browser = null;
      page = null;
    }
    res.json({ success: true, message: '浏览器已关闭' });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🌐 可视化UI已启动: http://localhost:${PORT}`);
  console.log('请用浏览器打开上述地址');
});
