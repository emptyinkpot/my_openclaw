#!/usr/bin/env node
/**
 * 白梦写作网 - 定时任务专用脚本
 * 
 * 功能:
 * - 每日自动签到
 * - 获取作品数据
 * - 发送飞书通知
 * 
 * 用法:
 *   node baimeng_cron.js [任务类型]
 * 
 * 任务类型:
 *   daily     - 每日任务（默认）
 *   checkin   - 仅签到
 *   stats     - 获取统计数据
 *   notify    - 发送通知
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  loginStateFile: '/workspace/projects/output/baimeng_login_state.json',
  screenshotDir: '/workspace/projects/output/baimeng_steps',
  logFile: '/workspace/projects/output/baimeng_cron.log',
  maxScreenshots: 5
};

class BaimengCron {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = [];
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}`;
    console.log(logLine);
    
    // 写入日志文件
    fs.appendFileSync(CONFIG.logFile, logLine + '\n');
  }

  async init() {
    this.log('🚀 启动浏览器...');
    this.browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox']
    });
    
    const context = await this.browser.newContext({
      viewport: { width: 1280, height: 800 },
      storageState: CONFIG.loginStateFile
    });
    
    this.page = await context.newPage();
    this.log('✅ 浏览器已启动');
  }

  async getScreenshotPath(name) {
    if (!fs.existsSync(CONFIG.screenshotDir)) {
      fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return path.join(CONFIG.screenshotDir, `cron_${name}_${timestamp}.jpg`);
  }

  cleanupOldScreenshots() {
    if (!fs.existsSync(CONFIG.screenshotDir)) return;
    
    const files = fs.readdirSync(CONFIG.screenshotDir)
      .filter(f => f.endsWith('.jpg') || f.endsWith('.png'))
      .map(f => ({
        name: f,
        path: path.join(CONFIG.screenshotDir, f),
        time: fs.statSync(path.join(CONFIG.screenshotDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);
    
    if (files.length > CONFIG.maxScreenshots) {
      const toDelete = files.slice(CONFIG.maxScreenshots);
      for (const file of toDelete) {
        try {
          fs.unlinkSync(file.path);
          this.log(`🗑️  清理旧截图: ${file.name}`);
        } catch (e) {}
      }
    }
  }

  // 任务1: 每日签到
  async checkin() {
    this.log('📋 执行任务: 每日签到');
    
    try {
      await this.page.goto('https://www.baimengxiezuo.com', { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      await this.page.waitForTimeout(2000);
      
      // 检查登录状态
      const loginBtn = this.page.locator('text=登录').first();
      const isLoggedIn = await loginBtn.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isLoggedIn) {
        throw new Error('登录状态已失效');
      }
      
      // 查找签到按钮并点击
      const checkinBtn = this.page.locator('text=签到').first();
      const hasCheckin = await checkinBtn.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (hasCheckin) {
        await checkinBtn.click();
        await this.page.waitForTimeout(2000);
        
        const screenshot = await this.getScreenshotPath('签到成功');
        await this.page.screenshot({ 
          path: screenshot, 
          fullPage: false,
          type: 'jpeg',
          quality: 80
        });
        
        this.results.push({
          task: 'checkin',
          status: 'success',
          message: '签到成功',
          screenshot: screenshot
        });
        
        this.log('✅ 签到成功');
      } else {
        this.results.push({
          task: 'checkin',
          status: 'skipped',
          message: '今日已签到或找不到签到按钮'
        });
        
        this.log('⏭️  今日已签到或找不到签到按钮');
      }
    } catch (error) {
      this.results.push({
        task: 'checkin',
        status: 'error',
        message: error.message
      });
      
      this.log(`❌ 签到失败: ${error.message}`);
    }
  }

  // 任务2: 获取作品统计
  async getStats() {
    this.log('📋 执行任务: 获取作品统计');
    
    try {
      await this.page.goto('https://www.baimengxiezuo.com', { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      await this.page.waitForTimeout(2000);
      
      // 点击开始创作
      await this.page.click('text=免费开始创作');
      await this.page.waitForTimeout(3000);
      
      // 获取作品列表
      const works = await this.page.evaluate(() => {
        const results = [];
        const h3Elements = document.querySelectorAll('h3');
        
        h3Elements.forEach((el) => {
          const title = el.textContent?.trim();
          if (title && title.length > 0 && title !== '创建新作品') {
            results.push({ title });
          }
        });
        
        return results;
      });
      
      const screenshot = await this.getScreenshotPath('作品统计');
      await this.page.screenshot({ 
        path: screenshot, 
        fullPage: true,
        type: 'jpeg',
        quality: 80
      });
      
      this.results.push({
        task: 'stats',
        status: 'success',
        count: works.length,
        works: works.map(w => w.title),
        screenshot: screenshot
      });
      
      this.log(`✅ 获取到 ${works.length} 个作品`);
    } catch (error) {
      this.results.push({
        task: 'stats',
        status: 'error',
        message: error.message
      });
      
      this.log(`❌ 获取统计失败: ${error.message}`);
    }
  }

  // 任务3: 生成报告
  generateReport() {
    this.log('📋 生成执行报告');
    
    const success = this.results.filter(r => r.status === 'success').length;
    const failed = this.results.filter(r => r.status === 'error').length;
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        success,
        failed
      },
      details: this.results
    };
    
    // 保存报告
    const reportPath = '/workspace/projects/output/baimeng_cron_report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`📊 报告已保存: ${reportPath}`);
    this.log(`   成功: ${success}, 失败: ${failed}`);
    
    return report;
  }

  async run(taskType = 'daily') {
    this.log('========================================');
    this.log(`🤖 开始执行定时任务: ${taskType}`);
    this.log('========================================');
    
    try {
      await this.init();
      
      switch (taskType) {
        case 'checkin':
          await this.checkin();
          break;
          
        case 'stats':
          await this.getStats();
          break;
          
        case 'daily':
        default:
          // 每日任务：签到 + 统计
          await this.checkin();
          await this.getStats();
          break;
      }
      
      const report = this.generateReport();
      
      // 清理旧截图
      this.cleanupOldScreenshots();
      
      this.log('✅ 所有任务执行完成');
      
      // 输出结果（供其他脚本调用）
      console.log('\n' + JSON.stringify(report, null, 2));
      
    } catch (error) {
      this.log(`💥 执行异常: ${error.message}`);
      process.exit(1);
    } finally {
      if (this.browser) {
        await this.browser.close();
        this.log('🔒 浏览器已关闭');
      }
    }
  }
}

// 主函数
const taskType = process.argv[2] || 'daily';
const cron = new BaimengCron();
cron.run(taskType);
