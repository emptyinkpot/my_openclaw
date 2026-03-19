/**
 * 登录状态管理器
 * 支持不同网站的登录状态备份和恢复
 */

const fs = require('fs');
const path = require('path');

class AuthManager {
  /**
   * @param {string} siteName - 网站名称
   * @param {string} accountId - 账号ID
   */
  constructor(siteName, accountId = 'default') {
    this.siteName = siteName;
    this.accountId = accountId;
    this.backupDir = path.join(
      process.env.COZE_WORKSPACE_PATH || '/workspace/projects',
      'cookies-accounts'
    );
  }
  
  /**
   * 获取备份文件路径
   * 支持两种格式：
   * 1. {site}-account-{id}-full.json - 完整备份（localStorage + cookies）
   * 2. {site}-account-{id}.json - 简单 cookies 备份
   */
  getBackupPath() {
    // 尝试多种可能的文件名格式
    const possibleNames = [
      `${this.siteName}-account-${this.accountId}-full.json`,
      `${this.siteName}-account-${this.accountId}.json`,
      // 如果 accountId 是 'default'，也尝试 '1'
      ...(this.accountId === 'default' ? [
        `${this.siteName}-account-1-full.json`,
        `${this.siteName}-account-1.json`,
      ] : []),
    ];
    
    for (const name of possibleNames) {
      const filePath = path.join(this.backupDir, name);
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }
    
    // 如果都不存在，返回默认路径（用于后续创建）
    return path.join(this.backupDir, `${this.siteName}-account-${this.accountId}-full.json`);
  }
  
  /**
   * 备份登录状态
   * @param {Page} page - Playwright page 对象
   * @param {BrowserContext} context - Playwright context 对象
   */
  async backup(page, context) {
    const backup = {
      siteName: this.siteName,
      accountId: this.accountId,
      timestamp: new Date().toISOString(),
      localStorage: await page.evaluate(() => {
        const items = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          items[key] = localStorage.getItem(key);
        }
        return items;
      }),
      cookies: await context.cookies()
    };
    
    const filePath = this.getBackupPath();
    fs.writeFileSync(filePath, JSON.stringify(backup, null, 2));
    
    return filePath;
  }
  
  /**
   * 恢复登录状态
   * @param {Page} page - Playwright page 对象
   * @param {BrowserContext} context - Playwright context 对象
   * @param {string} url - 目标网站 URL
   */
  async restore(page, context, url) {
    const filePath = this.getBackupPath();
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`备份文件不存在: ${filePath}`);
    }
    
    const rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // 兼容两种格式：
    // 1. 完整备份格式：{ localStorage, cookies, timestamp }
    // 2. 简单 cookies 格式：[{ name, value, domain, ... }]
    const backup = Array.isArray(rawData) 
      ? { cookies: rawData, localStorage: {} }  // 简单格式
      : rawData;  // 完整格式
    
    console.log(`[Auth] 恢复登录状态: ${filePath}`);
    console.log(`[Auth] Cookies: ${backup.cookies?.length || 0}, LocalStorage: ${Object.keys(backup.localStorage || {}).length}`);
    
    // 1. 访问网站（关键！必须先访问才能设置 localStorage）
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    
    // 2. 设置 localStorage（⚠️ 禁止使用 localStorage.clear()，直接覆盖）
    if (backup.localStorage && Object.keys(backup.localStorage).length > 0) {
      await page.evaluate((items) => {
        for (const [k, v] of Object.entries(items)) {
          localStorage.setItem(k, v);
        }
      }, backup.localStorage);
      console.log(`[Auth] 已恢复 ${Object.keys(backup.localStorage).length} 个 localStorage 项`);
    }
    
    // 3. 设置 cookies
    if (backup.cookies && backup.cookies.length > 0) {
      await context.addCookies(backup.cookies);
      console.log(`[Auth] 已恢复 ${backup.cookies.length} 个 cookies`);
    }
    
    // 4. 刷新页面（关键！使登录状态生效）
    await page.reload({ waitUntil: 'networkidle' });
    
    return backup;
  }
  
  /**
   * 检查备份是否存在
   */
  hasBackup() {
    return fs.existsSync(this.getBackupPath());
  }
  
  /**
   * 列出指定网站的所有账号备份
   */
  static listAccounts(siteName) {
    const backupDir = path.join(
      process.env.COZE_WORKSPACE_PATH || '/workspace/projects',
      'cookies-accounts'
    );
    
    if (!fs.existsSync(backupDir)) return [];
    
    const files = fs.readdirSync(backupDir);
    const pattern = new RegExp(`^${siteName}-account-(.+)-full\\.json$`);
    
    return files
      .filter(f => pattern.test(f))
      .map(f => f.match(pattern)[1]);
  }
}

module.exports = { AuthManager };
