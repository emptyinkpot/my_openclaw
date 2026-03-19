/**
 * @fileoverview WebsiteAutomation 核心自动化类
 * @module @openclaw-modules/website-automation/core
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * 网站自动化核心类
 * @class
 */
class WebsiteAutomation {
  /**
   * @param {Object} config - 配置对象
   * @param {string} config.name - 网站标识名
   * @param {string} config.baseUrl - 网站首页URL
   * @param {Object} config.selectors - CSS选择器配置
   * @param {string} config.stateDir - 状态保存目录
   * @param {string} config.screenshotDir - 截图保存目录
   */
  constructor(config) {
    this._validateConfig(config);
    
    this.config = {
      maxScreenshots: 5,
      headless: true,
      timeout: 60000,
      waitTime: 2000,
      ...config
    };
    
    this._browser = null;
    this._page = null;
    this._context = null;
    this._initialized = false;
    
    this._ensureDirs();
  }

  // ============ 属性访问器 ============
  get browser() { return this._browser; }
  get page() { return this._page; }
  get context() { return this._context; }
  get initialized() { return this._initialized; }

  // ============ 状态管理 ============
  
  /**
   * 获取状态文件路径
   * @returns {string}
   */
  getStateFilePath() {
    return path.join(this.config.stateDir, `${this.config.name}_state.json`);
  }

  /**
   * 检查是否有保存的登录状态
   * @returns {boolean}
   */
  hasSavedState() {
    try {
      const stateFile = this.getStateFilePath();
      return fs.existsSync(stateFile);
    } catch {
      return false;
    }
  }

  /**
   * 获取状态文件信息
   * @returns {Object|null}
   */
  getStateInfo() {
    const stateFile = this.getStateFilePath();
    if (!fs.existsSync(stateFile)) return null;
    
    const stats = fs.statSync(stateFile);
    return {
      path: stateFile,
      size: stats.size,
      modified: stats.mtime,
      created: stats.birthtime
    };
  }

  // ============ 生命周期 ============

  /**
   * 初始化浏览器
   * @param {Object} [options]
   * @param {boolean} [options.force=false]
   * @returns {Promise<void>}
   */
  async init(options = {}) {
    const { force = false } = options;
    
    if (this._initialized && !force) return;
    if (this._browser) await this.close();

    const launchOptions = {
      headless: this.config.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    };

    this._browser = await chromium.launch(launchOptions);

    const contextOptions = {
      viewport: { width: 1280, height: 800 }
    };
    
    if (this.hasSavedState()) {
      contextOptions.storageState = this.getStateFilePath();
    }

    this._context = await this._browser.newContext(contextOptions);
    this._page = await this._context.newPage();
    this._page.setDefaultTimeout(this.config.timeout);
    
    this._initialized = true;
  }

  /**
   * 保存登录状态
   * @returns {Promise<Object>}
   */
  async saveState() {
    if (!this._context) {
      throw new Error('浏览器上下文未初始化');
    }
    
    const stateFile = this.getStateFilePath();
    await this._context.storageState({ path: stateFile });
    const stats = fs.statSync(stateFile);
    
    return {
      success: true,
      path: stateFile,
      size: stats.size
    };
  }

  /**
   * 清除登录状态
   * @returns {boolean}
   */
  clearState() {
    try {
      const stateFile = this.getStateFilePath();
      if (fs.existsSync(stateFile)) {
        fs.unlinkSync(stateFile);
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 关闭浏览器
   * @returns {Promise<void>}
   */
  async close() {
    if (this._browser) {
      await this._browser.close();
      this._browser = null;
      this._context = null;
      this._page = null;
      this._initialized = false;
    }
  }

  // ============ 页面导航 ============

  /**
   * 导航到指定URL
   * @param {string} [url]
   * @param {Object} [options]
   * @returns {Promise<void>}
   */
  async goto(url, options = {}) {
    await this.init();
    
    const targetUrl = url || this.config.baseUrl;
    const { 
      waitUntil = 'domcontentloaded',
      wait = true
    } = options;
    
    await this._page.goto(targetUrl, { waitUntil, timeout: this.config.timeout });
    if (wait) await this.sleep(this.config.waitTime);
  }

  /**
   * 重新加载页面
   * @param {Object} [options]
   * @returns {Promise<void>}
   */
  async reload(options = {}) {
    const { waitUntil = 'domcontentloaded' } = options;
    await this._page.reload({ waitUntil });
    await this.sleep(this.config.waitTime);
  }

  // ============ 登录检测 ============

  /**
   * 检查登录状态
   * @param {Object} [options]
   * @returns {Promise<boolean>}
   */
  async checkLogin(options = {}) {
    const { refresh = true, timeout = 5000 } = options;
    
    if (refresh) {
      await this.goto(this.config.baseUrl, { wait: false });
    }
    
    try {
      let isLoggedIn = false;
      
      if (this.config.selectors.loginCheck) {
        const loginBtn = this._page.locator(this.config.selectors.loginCheck).first();
        const isVisible = await loginBtn.isVisible({ timeout }).catch(() => false);
        isLoggedIn = !isVisible;
      }
      
      if (this.config.selectors.userElement) {
        const userEl = this._page.locator(this.config.selectors.userElement).first();
        const hasUser = await userEl.isVisible({ timeout }).catch(() => false);
        isLoggedIn = isLoggedIn || hasUser;
      }
      
      return isLoggedIn;
    } catch {
      return false;
    }
  }

  /**
   * 等待用户登录完成
   * @param {Object} [options]
   * @returns {Promise<boolean>}
   */
  async waitForLogin(options = {}) {
    const {
      maxWaitMs = 180000,
      checkIntervalMs = 1000,
      onProgress
    } = options;
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      const elapsed = Date.now() - startTime;
      if (onProgress) onProgress(elapsed);
      
      if (await this.checkLogin({ refresh: false })) {
        return true;
      }
      
      await this.sleep(checkIntervalMs);
    }
    
    return false;
  }

  // ============ 页面操作 ============

  /**
   * 点击元素
   * @param {string} selector
   * @param {Object} [options]
   * @returns {Promise<void>}
   */
  async click(selector, options = {}) {
    const { wait = true, waitTime } = options;
    await this._page.click(selector);
    if (wait) await this.sleep(waitTime || this.config.waitTime);
  }

  /**
   * 填充表单
   * @param {string} selector
   * @param {string} value
   * @returns {Promise<void>}
   */
  async fill(selector, value) {
    await this._page.fill(selector, value);
  }

  /**
   * 获取元素文本
   * @param {string} selector
   * @param {Object} [options]
   * @returns {Promise<string|null>}
   */
  async getText(selector, options = {}) {
    const { timeout = 5000 } = options;
    try {
      const element = this._page.locator(selector).first();
      return await element.textContent({ timeout });
    } catch {
      return null;
    }
  }

  /**
   * 获取多个元素文本
   * @param {string} selector
   * @returns {Promise<string[]>}
   */
  async getTexts(selector) {
    try {
      const elements = this._page.locator(selector);
      const count = await elements.count();
      const texts = [];
      
      for (let i = 0; i < count; i++) {
        const text = await elements.nth(i).textContent();
        if (text) texts.push(text.trim());
      }
      
      return texts;
    } catch {
      return [];
    }
  }

  /**
   * 在页面执行JS
   * @param {Function} fn
   * @param {...any} args
   * @returns {Promise<any>}
   */
  async evaluate(fn, ...args) {
    return await this._page.evaluate(fn, ...args);
  }

  /**
   * 查询元素并提取数据
   * @param {string} selector
   * @param {Function} [extractFn]
   * @returns {Promise<Array>}
   */
  async queryElements(selector, extractFn) {
    return await this._page.evaluate((sel, fnString) => {
      const elements = document.querySelectorAll(sel);
      return Array.from(elements).map(el => {
        if (fnString) {
          try {
            const fn = new Function('el', fnString);
            return fn(el);
          } catch (e) {
            return { text: el.textContent?.trim(), error: e.message };
          }
        }
        return { text: el.textContent?.trim() };
      });
    }, selector, extractFn?.toString());
  }

  // ============ 截图管理 ============

  /**
   * 截图
   * @param {string} [name='screenshot']
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async screenshot(name = 'screenshot', options = {}) {
    const {
      fullPage = false,
      type = 'jpeg',
      quality = 80
    } = options;
    
    const screenshotPath = this._generateScreenshotPath(name);
    
    await this._page.screenshot({
      path: screenshotPath,
      fullPage,
      type,
      quality: type === 'jpeg' ? quality : undefined
    });
    
    this._cleanupScreenshots();
    
    return {
      path: screenshotPath,
      filename: path.basename(screenshotPath)
    };
  }

  /**
   * 获取截图列表
   * @returns {Array<Object>}
   */
  getScreenshotList() {
    const dir = this.config.screenshotDir;
    if (!fs.existsSync(dir)) return [];
    
    return fs.readdirSync(dir)
      .filter(f => f.startsWith(`${this.config.name}_`) && f.endsWith('.jpg'))
      .map(f => {
        const fullPath = path.join(dir, f);
        const stats = fs.statSync(fullPath);
        return {
          filename: f,
          path: fullPath,
          size: stats.size,
          created: stats.birthtime
        };
      })
      .sort((a, b) => b.created - a.created);
  }

  /**
   * 清空截图
   * @returns {number}
   */
  clearScreenshots() {
    const screenshots = this.getScreenshotList();
    let count = 0;
    
    for (const screenshot of screenshots) {
      try {
        fs.unlinkSync(screenshot.path);
        count++;
      } catch {}
    }
    
    return count;
  }

  // ============ 工具方法 ============

  /**
   * 延迟
   * @param {number} ms
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 等待元素
   * @param {string} selector
   * @param {Object} [options]
   * @returns {Promise<boolean>}
   */
  async waitFor(selector, options = {}) {
    const { timeout = this.config.timeout } = options;
    try {
      await this._page.waitForSelector(selector, { timeout });
      return true;
    } catch {
      return false;
    }
  }

  // ============ 私有方法 ============

  _validateConfig(config) {
    const required = ['name', 'baseUrl', 'selectors', 'stateDir', 'screenshotDir'];
    const missing = required.filter(key => !config[key]);
    
    if (missing.length > 0) {
      throw new Error(`缺少必填配置: ${missing.join(', ')}`);
    }
    
    const selectorRequired = ['loginBtn', 'loginCheck'];
    const missingSelectors = selectorRequired.filter(key => !config.selectors[key]);
    
    if (missingSelectors.length > 0) {
      throw new Error(`缺少选择器: ${missingSelectors.join(', ')}`);
    }
  }

  _ensureDirs() {
    const dirs = [this.config.stateDir, this.config.screenshotDir];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  _generateScreenshotPath(name) {
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19);
    const safeName = name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').slice(0, 30);
    
    return path.join(
      this.config.screenshotDir,
      `${this.config.name}_${safeName}_${timestamp}.jpg`
    );
  }

  _cleanupScreenshots() {
    const maxCount = this.config.maxScreenshots;
    
    const files = fs.readdirSync(this.config.screenshotDir)
      .filter(f => f.startsWith(`${this.config.name}_`) && f.endsWith('.jpg'))
      .map(f => ({
        path: path.join(this.config.screenshotDir, f),
        time: fs.statSync(path.join(this.config.screenshotDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > maxCount) {
      for (const file of files.slice(maxCount)) {
        try { fs.unlinkSync(file.path); } catch {}
      }
    }
  }
}

module.exports = WebsiteAutomation;
