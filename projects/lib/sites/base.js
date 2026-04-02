/**
 * 网站操作基类
 * 所有网站模块都应继承此类
 * 
 * 支持两种浏览器模式：
 * 1. 共享模式（accountId = null）：使用 default 浏览器
 * 2. 独立模式（accountId = '1'）：使用 {site}-{accountId} 浏览器
 */

const { BrowserManager } = require('../browser/manager');
const { AuthManager } = require('../browser/auth');
const { ScrollUtils } = require('../utils/scroll');
const yaml = require('js-yaml');
const fs = require('fs-extra');
const path = require('path');

const KNOWLEDGE_BASE = path.join(
  process.env.COZE_WORKSPACE_PATH || '/workspace/projects',
  'knowledge'
);

class BaseSite {
  /**
   * @param {string} siteName - 网站标识
   * @param {string|null} accountId - 账号ID（null 表示共享模式）
   */
  constructor(siteName, accountId = null) {
    this.siteName = siteName;
    this.accountId = accountId;
    this.browser = null;
    this.page = null;
    this.context = null;
    // 如果 accountId 是 undefined/null，使用 'default' 作为默认账号
    this.auth = new AuthManager(siteName, accountId || 'default');
    this.config = this.loadConfig();
  }
  
  /**
   * 加载网站配置
   */
  loadConfig() {
    const configPath = path.join(KNOWLEDGE_BASE, this.siteName, 'site.yaml');
    
    if (fs.existsSync(configPath)) {
      return yaml.load(fs.readFileSync(configPath, 'utf8'));
    }
    
    return {};
  }
  
  /**
   * 初始化浏览器（子类应重写此方法）
   */
  async initBrowser() {
    if (this.accountId === null) {
      return await BrowserManager.getDefaultBrowser();
    } else {
      return await BrowserManager.getSiteBrowser(this.siteName, this.accountId);
    }
  }
  
  /**
   * 恢复登录状态
   */
  async restoreAuth() {
    if (!this.page) {
      await this.initBrowser();
    }
    
    const homeUrl = this.config.site?.urls?.home;
    if (!homeUrl) {
      throw new Error(`未配置网站首页 URL: ${this.siteName}`);
    }
    
    if (this.auth && this.auth.hasBackup()) {
      return await this.auth.restore(this.page, this.context, homeUrl);
    } else {
      // 没有备份，直接访问首页（依赖浏览器已有登录状态）
      await this.page.goto(homeUrl);
      await this.page.waitForLoadState('networkidle');
    }
  }
  
  /**
   * 备份登录状态
   */
  async backupAuth() {
    if (!this.page || !this.context) {
      throw new Error('浏览器未初始化');
    }
    
    // 如果没有 auth 管理器，创建一个临时的
    const auth = this.auth || new AuthManager(this.siteName, 'default');
    return await auth.backup(this.page, this.context);
  }
  
  /**
   * 滚动区域
   */
  async scrollArea(selector, direction = 'down', distance = 100) {
    await ScrollUtils.scroll(this.page, selector, direction, distance);
  }
  
  /**
   * 慢速滚动查找
   */
  async slowScrollFind(containerSelector, callback, options = {}) {
    return await ScrollUtils.slowScrollFind(
      this.page,
      containerSelector,
      callback,
      options
    );
  }
  
  /**
   * JS 点击元素
   */
  async jsClick(selector) {
    await this.page.evaluate((sel) => {
      const el = document.querySelector(sel);
      el?.click();
    }, selector);
  }
  
  /**
   * 等待页面加载
   */
  async waitForPage(url, options = {}) {
    await this.page.goto(url, options);
    await this.page.waitForLoadState('networkidle');
  }
  
  /**
   * 截图调试
   */
  async screenshot(filename) {
    const screenshotDir = path.join(
      process.env.COZE_WORKSPACE_PATH || '/workspace/projects',
      'output',
      'screenshots'
    );
    
    // 确保目录存在
    await fs.ensureDir(screenshotDir);
    
    // 添加时间戳和扩展名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(screenshotDir, `${filename}_${timestamp}.png`);
    
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    return screenshotPath;
  }
  
  // ============ 标准方法（子类应实现）============
  
  /**
   * 获取作品列表
   * 子类应重写此方法
   */
  async getWorks() {
    throw new Error(`${this.siteName} 未实现 getWorks() 方法`);
  }
  
  /**
   * 打开作品
   * 子类应重写此方法
   */
  async openWork(workId) {
    throw new Error(`${this.siteName} 未实现 openWork() 方法`);
  }
  
  /**
   * 检查登录状态
   */
  async checkLogin() {
    const homeUrl = this.config.site?.urls?.home;
    if (!homeUrl) {
      return { isLoggedIn: false, message: '未配置首页 URL' };
    }
    
    await this.page.goto(homeUrl);
    await this.page.waitForTimeout(2000);
    
    // 默认检查方式：查找登录按钮
    const hasLoginBtn = await this.page.locator('text=登录').first().isVisible().catch(() => false);
    
    return {
      isLoggedIn: !hasLoginBtn,
      message: !hasLoginBtn ? '已登录' : '未登录',
    };
  }
  
  /**
   * 登录（等待扫码）
   */
  async login() {
    const homeUrl = this.config.site?.urls?.home;
    if (homeUrl) {
      await this.page.goto(homeUrl);
    }
    
    // 点击登录按钮
    const loginBtn = this.page.locator('text=登录').first();
    if (await loginBtn.isVisible().catch(() => false)) {
      await loginBtn.click();
    }
    
    // 等待用户扫码
    await this.page.waitForTimeout(60000);
    
    // 备份登录状态
    await this.backupAuth();
    
    return { success: true, message: '登录完成' };
  }
}

module.exports = { BaseSite, KNOWLEDGE_BASE };
