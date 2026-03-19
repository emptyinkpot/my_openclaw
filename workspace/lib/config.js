/**
 * OpenClaw Workspace - 共享配置
 * 
 * 统一管理所有路径和配置，避免硬编码
 * 
 * @module lib/config
 */

const path = require('path');

// ============================================================
// 根路径
// ============================================================

const ROOT = {
  workspace: '/workspace/projects/workspace',
  autoScripts: '/workspace/projects/auto-scripts',
  browser: '/workspace/projects/browser',
  storage: '/workspace/projects/storage',
  output: '/workspace/projects/output',
};

// ============================================================
// 平台模块路径
// ============================================================

const PLATFORMS = {
  baimeng: {
    module: path.join(ROOT.autoScripts, 'src/platforms/baimeng'),
    browserDir: path.join(ROOT.browser, 'baimeng-default'),
    backupFile: path.join(ROOT.storage, 'accounts/baimeng/default.json'),
  },
  fanqie: {
    module: path.join(ROOT.autoScripts, 'src/platforms/fanqie'),
    browserDir: path.join(ROOT.browser, 'fanqie-default'),
    backupFile: path.join(ROOT.storage, 'accounts/fanqie/default.json'),
  },
};

// ============================================================
// URLs
// ============================================================

const URLS = {
  baimeng: {
    home: 'https://www.baimengxiezuo.com',
    library: 'https://www.baimengxiezuo.com/zh-Hans/library/',
    editor: 'https://www.baimengxiezuo.com/zh-Hans/editor/',
  },
  fanqie: {
    home: 'https://fanqienovel.com',
    workbench: 'https://fanqienovel.com/page/workbench',
  },
};

// ============================================================
// 工具模块路径
// ============================================================

const UTILS = {
  taskRunner: path.join(ROOT.autoScripts, 'src/utils/task-runner'),
  logger: path.join(ROOT.autoScripts, 'src/utils/logger'),
  debugger: path.join(ROOT.autoScripts, 'src/utils/debugger'),
};

// ============================================================
// Hooks 配置
// ============================================================

const HOOKS = {
  logDir: path.join(ROOT.storage, 'hooks'),
  experienceDir: path.join(ROOT.autoScripts, 'storage/experience'),
  healthDir: path.join(ROOT.autoScripts, 'storage/health'),
  taskLogDir: path.join(ROOT.autoScripts, 'logs'),
  outputDir: path.join(ROOT.autoScripts, 'storage/task-logs'),
};

// ============================================================
// Skills 配置
// ============================================================

const SKILLS = {
  runnerPath: path.join(ROOT.autoScripts, 'logs/runner.js'),
  autoLoggerPath: path.join(ROOT.autoScripts, 'logs/auto-logger.js'),
};

// ============================================================
// 视口配置
// ============================================================

const VIEWPORT = {
  default: { width: 1400, height: 850 },
  wide: { width: 1920, height: 1080 },
  mobile: { width: 375, height: 667 },
};

// ============================================================
// 超时配置
// ============================================================

const TIMEOUTS = {
  pageLoad: 30000,
  navigationDelay: 2000,
  action: 5000,
  heartbeat: 60000,
  debounce: 2000,
};

// ============================================================
// PATHS 别名（便捷访问）
// ============================================================

const PATHS = {
  LOGS: HOOKS.logDir,
  HOOKS: HOOKS.logDir,
  SKILLS: path.join(ROOT.workspace, 'skills'),
  STORAGE: ROOT.storage,
  OUTPUT: ROOT.output,
};

// ============================================================
// 导出
// ============================================================

module.exports = {
  ROOT,
  PLATFORMS,
  URLS,
  UTILS,
  HOOKS,
  SKILLS,
  VIEWPORT,
  TIMEOUTS,
  PATHS,
  
  // 便捷方法
  getPlatformModule(platform) {
    return PLATFORMS[platform]?.module;
  },
  
  getBrowserDir(platform) {
    return PLATFORMS[platform]?.browserDir;
  },
  
  getBackupFile(platform, account = 'default') {
    return path.join(ROOT.storage, 'accounts', platform, `${account}.json`);
  },
};
