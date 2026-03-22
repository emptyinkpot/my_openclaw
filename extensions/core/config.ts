/**
 * 模块配置管理
 * 自包含配置系统，支持环境变量覆盖
 */

import * as path from 'path';
import * as fs from 'fs';

/**
 * 模块配置接口
 */
export interface ModuleConfig {
  // 服务配置
  port: number;
  host: string;
  apiBase: string;
  
  // 数据库配置
  database: {
    type: 'mysql' | 'sqlite';
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
    sqlitePath?: string;
  };
  
  // 存储路径
  paths: {
    root: string;
    data: string;
    logs: string;
    cache: string;
    temp: string;
    storage: string;
    browser: string;
  };
  
  // 调度器配置
  scheduler: {
    enabled: boolean;
    stateFile: string;
    maxConcurrent: number;
    retryAttempts: number;
    retryInterval: number;
    polishUrl: string;
    fanqieAccounts: Array<{
      id: string;
      name: string;
      browserDir: string;
      cookiesFile: string;
    }>;
  };
  
  // AI配置
  ai: {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
  };
  
  // 日志配置
  log: {
    level: 'debug' | 'info' | 'warn' | 'error';
    file: string;
    maxSize: number;
    maxFiles: number;
  };
}

// 默认配置
const defaultConfig: ModuleConfig = {
  port: parseInt(process.env.NOVEL_MANAGER_PORT || '3001'),
  host: process.env.NOVEL_MANAGER_HOST || '0.0.0.0',
  apiBase: process.env.NOVEL_MANAGER_API_BASE || '/api',
  
  database: {
    type: (process.env.DB_TYPE as 'mysql' | 'sqlite') || 'mysql',
    host: process.env.DB_HOST || 'sh-cynosdbmysql-grp-1kbg1xh0.sql.tencentcdb.com',
    port: parseInt(process.env.DB_PORT || '22295'),
    user: process.env.DB_USER || 'openclaw',
    password: process.env.DB_PASSWORD || 'Lgp15237257500',
    database: process.env.DB_NAME || 'cloudbase-4glvyyq9f61b19cd',
    sqlitePath: process.env.SQLITE_PATH || '/workspace/projects/apps/novel-manager/data/novel.db',
  },
  
  paths: getDefaultPaths(),
  
  scheduler: {
    enabled: process.env.SCHEDULER_ENABLED !== 'false',
    stateFile: process.env.SCHEDULER_STATE_FILE || '/tmp/openclaw/scheduler-state.json',
    maxConcurrent: parseInt(process.env.SCHEDULER_MAX_CONCURRENT || '1'),
    retryAttempts: parseInt(process.env.SCHEDULER_RETRY_ATTEMPTS || '3'),
    retryInterval: parseInt(process.env.SCHEDULER_RETRY_INTERVAL || '5000'),
    polishUrl: process.env.POLISH_URL || 'https://7d4jcknzqk.coze.site',
    fanqieAccounts: [
      {
        id: 'account_1',
        name: '番茄账号1',
        browserDir: '/workspace/projects/browser/fanqie-account-1',
        cookiesFile: '/workspace/projects/cookies-accounts/fanqie-20260314-030709.json',
      },
      {
        id: 'account_2',
        name: '番茄账号2',
        browserDir: '/workspace/projects/browser/fanqie-account-2',
        cookiesFile: '/workspace/projects/cookies-accounts/fanqie-20260314-112322.json',
      },
    ],
  },
  
  ai: {
    model: process.env.AI_MODEL || 'deepseek-chat',
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4000'),
    systemPrompt: process.env.AI_SYSTEM_PROMPT || `你是一位资深网络小说作家，擅长创作爽文小说。`,
  },
  
  log: {
    level: (process.env.LOG_LEVEL as any) || 'info',
    file: process.env.LOG_FILE || '/tmp/openclaw/novel-manager.log',
    maxSize: parseInt(process.env.LOG_MAX_SIZE || '10485760'), // 10MB
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
  },
};

/**
 * 获取默认路径
 */
function getDefaultPaths() {
  const root = process.env.NOVEL_MANAGER_ROOT || path.resolve(__dirname);
  return {
    root,
    data: path.join(root, 'data'),
    logs: path.join(root, 'logs'),
    cache: path.join(root, 'cache'),
    temp: path.join(root, 'temp'),
    storage: path.join(root, 'storage'),
    browser: path.join(root, 'browser'),
  };
}

// 全局配置缓存
let cachedConfig: ModuleConfig | null = null;

/**
 * 加载配置
 * 优先顺序：环境变量 > 配置文件 > 默认值
 */
export function loadConfig(): ModuleConfig {
  if (cachedConfig) {
    return cachedConfig;
  }
  
  const configPath = process.env.NOVEL_MANAGER_CONFIG || 
    path.join(defaultConfig.paths.root, 'config', 'module.json');
  
  let fileConfig: Partial<ModuleConfig> = {};
  
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      fileConfig = JSON.parse(content);
    } catch (e) {
      console.warn('配置文件加载失败，使用默认配置:', e);
    }
  }
  
  // 深度合并配置
  cachedConfig = deepMerge(defaultConfig, fileConfig);
  
  // 确保目录存在
  ensureDirectories(cachedConfig.paths);
  
  return cachedConfig;
}

/**
 * 重新加载配置
 */
export function reloadConfig(): ModuleConfig {
  cachedConfig = null;
  return loadConfig();
}

/**
 * 保存配置到文件
 */
export function saveConfig(config: ModuleConfig): void {
  const configPath = process.env.NOVEL_MANAGER_CONFIG || 
    path.join(config.paths.root, 'config', 'module.json');
  
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  cachedConfig = config;
}

/**
 * 获取当前配置（快捷方式）
 */
export function getConfig(): ModuleConfig {
  return loadConfig();
}

// 导出配置对象（向后兼容）
export const config = loadConfig();

/**
 * 深度合并对象
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] !== undefined) {
      if (isObject(result[key]) && isObject(source[key])) {
        result[key] = deepMerge(result[key], source[key]!);
      } else {
        result[key] = source[key]!;
      }
    }
  }
  
  return result;
}

function isObject(item: any): item is Record<string, any> {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * 确保目录存在
 */
function ensureDirectories(paths: ModuleConfig['paths']): void {
  Object.values(paths).forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}
