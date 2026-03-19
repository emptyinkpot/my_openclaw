/**
 * 浏览器管理器 - 单例模式
 * 
 * 支持两种使用模式：
 * 1. 共享模式：使用 'default' 浏览器，可同时登录多个网站
 * 2. 独立模式：每个网站-账号独立浏览器目录
 * 
 * 命名规范：
 * - 'default' - 默认共享浏览器
 * - '{网站标识}' - 网站专用浏览器（如 'baimeng', 'fanqie'）
 * - '{网站标识}-{账号ID}' - 网站账号独立浏览器（如 'baimeng-1', 'fanqie-0'）
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// 浏览器数据根目录
const BROWSER_DATA_ROOT = path.join(
  process.env.COZE_WORKSPACE_PATH || '/workspace/projects',
  'browser'
);

class BrowserManager {
  static instances = new Map();
  
  /**
   * 清理浏览器锁文件
   * 必须在启动前调用，否则会报 "Failed to create a ProcessSingleton" 错误
   */
  static cleanLockFiles(browserDataDir) {
    const lockFiles = ['SingletonLock', 'SingletonSocket', 'SingletonCookie', 'Lock'];
    for (const file of lockFiles) {
      const filePath = path.join(browserDataDir, file);
      if (fs.existsSync(filePath)) {
        try { 
          fs.unlinkSync(filePath); 
          console.log(`[Browser] 已清理锁文件: ${file}`);
        } catch (e) {
          console.log(`[Browser] 清理锁文件失败: ${file}`, e.message);
        }
      }
    }
  }
  
  /**
   * 获取浏览器实例（单例）
   * @param {string} name - 实例名称
   *   - 'default': 默认共享浏览器（可登录多个网站）
   *   - '{网站}': 网站专用浏览器
   *   - '{网站}-{账号}': 账号独立浏览器
   * @param {object} options - 启动选项
   * @returns {Promise<{context, page, browserDataDir}>}
   */
  static async getInstance(name = 'default', options = {}) {
    // 如果已存在且未关闭，直接返回
    if (this.instances.has(name)) {
      const instance = this.instances.get(name);
      if (instance.context && !instance.context._closed) {
        return instance;
      }
      // 已关闭则移除
      this.instances.delete(name);
    }
    
    // 浏览器数据目录
    const browserDataDir = path.join(BROWSER_DATA_ROOT, name);
    
    // 确保目录存在
    if (!fs.existsSync(browserDataDir)) {
      fs.mkdirSync(browserDataDir, { recursive: true });
    }
    
    // ⚠️ 关键：清理锁文件，否则会报 "Failed to create a ProcessSingleton" 错误
    this.cleanLockFiles(browserDataDir);
    
    // 启动浏览器
    const context = await chromium.launchPersistentContext(browserDataDir, {
      headless: false,
      viewport: null,  // 让浏览器自动调整视口
      args: [
        '--start-maximized',
        '--disable-blink-features=AutomationControlled',
        ...(options.args || [])
      ],
      ...options
    });
    
    const page = context.pages()[0] || await context.newPage();
    
    const instance = { 
      context, 
      page, 
      browserDataDir,
      name 
    };
    this.instances.set(name, instance);
    
    return instance;
  }
  
  /**
   * 获取网站专用的浏览器实例
   * @param {string} siteName - 网站标识
   * @param {string} accountId - 账号ID（可选）
   */
  static async getSiteBrowser(siteName, accountId = null) {
    // 如果指定账号，使用独立模式
    // 否则使用网站专用模式
    const name = accountId ? `${siteName}-${accountId}` : siteName;
    return await this.getInstance(name);
  }
  
  /**
   * 获取默认共享浏览器
   * 可同时登录多个网站
   */
  static async getDefaultBrowser() {
    return await this.getInstance('default');
  }
  
  /**
   * 关闭指定实例
   */
  static async close(name = 'default') {
    if (this.instances.has(name)) {
      const { context } = this.instances.get(name);
      await context.close();
      this.instances.delete(name);
    }
  }
  
  /**
   * 关闭所有实例
   */
  static async closeAll() {
    for (const [name] of this.instances) {
      await this.close(name);
    }
  }
  
  /**
   * 获取所有实例名称
   */
  static getInstanceNames() {
    return Array.from(this.instances.keys());
  }
  
  /**
   * 列出所有可用的浏览器数据目录
   */
  static listAvailableBrowsers() {
    if (!fs.existsSync(BROWSER_DATA_ROOT)) return [];
    
    return fs.readdirSync(BROWSER_DATA_ROOT, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => {
        const name = dirent.name;
        let type = 'unknown';
        
        if (name === 'default') {
          type = 'shared';  // 共享模式
        } else if (name === 'openclaw') {
          type = 'system';  // 系统专用
        } else if (name.includes('-')) {
          type = 'isolated';  // 独立模式（网站-账号）
        } else {
          type = 'site';  // 网站专用
        }
        
        return { name, type };
      });
  }
  
  /**
   * 检查浏览器目录包含哪些网站的登录状态
   */
  static async checkLoggedInSites(browserName = 'default') {
    const browserDir = path.join(BROWSER_DATA_ROOT, browserName, 'Default');
    const cookiesPath = path.join(browserDir, 'Cookies');
    
    if (!fs.existsSync(cookiesPath)) {
      return [];
    }
    
    // 读取 cookies 数据库
    const sqlite3 = require('sqlite3');
    const db = new sqlite3.Database(cookiesPath, sqlite3.OPEN_READONLY);
    
    return new Promise((resolve, reject) => {
      db.all('SELECT DISTINCT host_key FROM cookies', (err, rows) => {
        db.close();
        if (err) {
          resolve([]);
        } else {
          const sites = rows.map(r => r.host_key.replace(/^\./, ''));
          resolve(sites);
        }
      });
    });
  }
}

module.exports = { BrowserManager, BROWSER_DATA_ROOT };
