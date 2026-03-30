/**
 * OpenClaw 公共工具库 - 统一入口
 * 
 * @package @openclaw/common-utils
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════════
// 数据库模块
// ═══════════════════════════════════════════════════════════════

export {
  // 连接池管理
  getPool,
  closePool,
  closeAllPools,
  // 连接获取
  getConnection,
  // 事务管理
  withTransaction,
  // 配置
  defaultDbConfig,
} from './database';

export type {
  DatabaseConfig,
  Pool,
  PoolConnection,
  QueryResult,
  FieldPacket,
  RowDataPacket,
  OkPacket,
} from './database';

// ═══════════════════════════════════════════════════════════════
// 配置模块
// ═══════════════════════════════════════════════════════════════

export {
  // 路径配置
  PROJECT_PATHS,
  getProjectRoot,
  getModulePaths,
  ensurePaths,
  ensureModulePaths,
} from './config';

// ═══════════════════════════════════════════════════════════════
// HTTP模块 (占位 - 后续实现)
// ═══════════════════════════════════════════════════════════════

// export { createHttpClient, HttpClient } from './http';

// ═══════════════════════════════════════════════════════════════
// 浏览器模块 (占位 - 后续实现)
// ═══════════════════════════════════════════════════════════════

// export { createBrowser, BrowserManager } from './browser';

// ═══════════════════════════════════════════════════════════════
// 缓存模块 (占位 - 后续实现)
// ═══════════════════════════════════════════════════════════════

// export { CacheManager, createFileCache } from './cache';

// ═══════════════════════════════════════════════════════════════
// 日志模块 (占位 - 后续实现)
// ═══════════════════════════════════════════════════════════════

// export { logger, createLogger, LogLevel } from './logger';

// ═══════════════════════════════════════════════════════════════
// 类型模块 (占位 - 后续实现)
// ═══════════════════════════════════════════════════════════════

// export type { CommonResponse, PaginationParams } from './types';
