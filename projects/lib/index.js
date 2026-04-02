/**
 * 统一核心库入口
 * 
 * 所有模块的统一导出点
 * 
 * @module lib
 */

// 平台管理
const { SiteManager, getSiteByAlias, parseMessage, siteAliases } = require('./SiteManager');

// 浏览器管理
const { BrowserManager, BROWSER_DATA_ROOT } = require('./browser/manager');

// 认证管理
const { AuthManager } = require('./browser/auth');

// 平台基类
const { BaseSite, KNOWLEDGE_BASE } = require('./sites/base');

// 工具
const { ScrollUtils } = require('./utils/scroll');

// 版本
const VERSION = '2.0.0';

module.exports = {
  // 版本
  VERSION,
  
  // 平台管理
  SiteManager,
  getSiteByAlias,
  parseMessage,
  siteAliases,
  
  // 浏览器
  BrowserManager,
  BROWSER_DATA_ROOT,
  
  // 认证
  AuthManager,
  
  // 平台基类
  BaseSite,
  KNOWLEDGE_BASE,
  
  // 工具
  ScrollUtils,
  
  // 快捷方法
  getSite: (name, options) => SiteManager.get(name, options),
  getAvailableSites: () => SiteManager.getAvailableSites(),
};
