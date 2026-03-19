/**
 * 平台管理器 - 统一入口
 * 
 * 所有平台操作的统一入口，支持：
 * - 飞书机器人
 * - CLI 命令行
 * - API 接口
 * - 定时任务
 * 
 * @module lib/SiteManager
 */

const path = require('path');
const fs = require('fs');

// 平台模块缓存
const siteModules = new Map();

// 已注册的平台
const registeredSites = new Map();

/**
 * 平台管理器
 */
class SiteManager {
  /**
   * 注册平台
   * @param {string} siteName - 平台名称
   * @param {Function} SiteClass - 平台类
   * @param {Object} config - 平台配置
   */
  static register(siteName, SiteClass, config = {}) {
    registeredSites.set(siteName, { SiteClass, config });
    console.log(`✅ 注册平台: ${siteName}`);
  }
  
  /**
   * 获取平台实例
   * @param {string} siteName - 平台名称
   * @param {Object} options - 选项
   * @returns {BaseSite} 平台实例
   */
  static get(siteName, options = {}) {
    // 检查是否已注册
    if (!registeredSites.has(siteName)) {
      // 尝试动态加载
      this.loadSiteModule(siteName);
    }
    
    const { SiteClass, config } = registeredSites.get(siteName) || {};
    
    if (!SiteClass) {
      throw new Error(`未知平台: ${siteName}，可用平台: ${this.getAvailableSites().join(', ')}`);
    }
    
    // 合并配置
    const mergedOptions = { ...config, ...options };
    
    // 创建实例
    return new SiteClass(mergedOptions.accountId || null);
  }
  
  /**
   * 动态加载平台模块
   */
  static loadSiteModule(siteName) {
    if (siteModules.has(siteName)) {
      return siteModules.get(siteName);
    }
    
    const modulePath = path.join(__dirname, 'sites', `${siteName}.js`);
    
    if (fs.existsSync(modulePath)) {
      try {
        const module = require(modulePath);
        const SiteClass = module[Object.keys(module)[0]]; // 获取第一个导出的类
        
        if (SiteClass) {
          this.register(siteName, SiteClass);
          siteModules.set(siteName, module);
          return module;
        }
      } catch (e) {
        console.error(`加载平台模块失败: ${siteName}`, e.message);
      }
    }
    
    return null;
  }
  
  /**
   * 获取所有可用平台
   */
  static getAvailableSites() {
    // 从 sites 目录扫描
    const sitesDir = path.join(__dirname, 'sites');
    const sites = ['default'];
    
    if (fs.existsSync(sitesDir)) {
      fs.readdirSync(sitesDir)
        .filter(f => f.endsWith('.js') && f !== 'base.js')
        .forEach(f => {
          const siteName = f.replace('.js', '');
          sites.push(siteName);
        });
    }
    
    return sites;
  }
  
  /**
   * 获取平台信息
   */
  static getSiteInfo(siteName) {
    const site = this.get(siteName);
    
    return {
      name: siteName,
      accountId: site.accountId,
      browserDir: site.browserDataDir,
      hasAuth: site.auth ? site.auth.hasBackup() : false,
    };
  }
  
  /**
   * 批量操作多个平台
   */
  static async batch(sites, action, ...args) {
    const results = {};
    
    for (const siteName of sites) {
      try {
        const site = this.get(siteName);
        results[siteName] = {
          success: true,
          data: await site[action](...args),
        };
      } catch (e) {
        results[siteName] = {
          success: false,
          error: e.message,
        };
      }
    }
    
    return results;
  }
}

// ============================================================
// 自动加载并注册所有平台模块
// ============================================================

const sitesDir = path.join(__dirname, 'sites');
if (fs.existsSync(sitesDir)) {
  fs.readdirSync(sitesDir)
    .filter(f => f.endsWith('.js') && f !== 'base.js')
    .forEach(f => {
      const siteName = f.replace('.js', '');
      SiteManager.loadSiteModule(siteName);
    });
}

// ============================================================
// 平台别名映射
// ============================================================

const siteAliases = {
  // 白梦写作
  '白梦': 'baimeng',
  '白梦写作': 'baimeng',
  'baimeng': 'baimeng',
  
  // 番茄小说
  '番茄': 'fanqie',
  '番茄小说': 'fanqie',
  'fanqie': 'fanqie',
  'fanqienovel': 'fanqie',
  
  // Coze 扣子
  '扣子': 'coze',
  '扣子编程': 'coze',
  'coze': 'coze',
};

/**
 * 通过别名获取平台
 */
function getSiteByAlias(alias) {
  const normalizedName = (alias || '').toLowerCase().trim();
  const siteName = siteAliases[normalizedName] || normalizedName;
  return SiteManager.get(siteName);
}

/**
 * 解析用户消息，提取平台和操作
 */
function parseMessage(message) {
  const msg = (message || '').toLowerCase().trim();
  
  // 查找平台
  let siteName = null;
  for (const [alias, site] of Object.entries(siteAliases)) {
    if (msg.includes(alias.toLowerCase())) {
      siteName = site;
      break;
    }
  }
  
  // 查找操作
  const actionPatterns = {
    '作品': 'works',
    '列表': 'works',
    '多少': 'works',
    '进入': 'enter',
    '打开': 'enter',
    '登录': 'login',
    '扫码': 'login',
    '状态': 'check',
    '检查': 'check',
    '截图': 'screenshot',
    '看看': 'screenshot',
  };
  
  let action = null;
  for (const [pattern, act] of Object.entries(actionPatterns)) {
    if (msg.includes(pattern)) {
      action = act;
      break;
    }
  }
  
  // 提取参数（如编号）
  const numberMatch = message.match(/(\d+)/);
  const number = numberMatch ? parseInt(numberMatch[1], 10) : null;
  
  return { siteName, action, number, original: message };
}

// ============================================================
// 导出
// ============================================================

module.exports = {
  SiteManager,
  getSiteByAlias,
  parseMessage,
  siteAliases,
};
