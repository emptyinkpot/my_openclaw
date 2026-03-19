"use strict";
/**
 * OpenClaw 公共工具库 - 统一入口
 *
 * @package @openclaw/common-utils
 * @version 1.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureModulePaths = exports.ensurePaths = exports.getModulePaths = exports.getProjectRoot = exports.PROJECT_PATHS = exports.defaultDbConfig = exports.withTransaction = exports.getConnection = exports.closeAllPools = exports.closePool = exports.getPool = void 0;
// ═══════════════════════════════════════════════════════════════
// 数据库模块
// ═══════════════════════════════════════════════════════════════
var database_1 = require("./database");
// 连接池管理
Object.defineProperty(exports, "getPool", { enumerable: true, get: function () { return database_1.getPool; } });
Object.defineProperty(exports, "closePool", { enumerable: true, get: function () { return database_1.closePool; } });
Object.defineProperty(exports, "closeAllPools", { enumerable: true, get: function () { return database_1.closeAllPools; } });
// 连接获取
Object.defineProperty(exports, "getConnection", { enumerable: true, get: function () { return database_1.getConnection; } });
// 事务管理
Object.defineProperty(exports, "withTransaction", { enumerable: true, get: function () { return database_1.withTransaction; } });
// 配置
Object.defineProperty(exports, "defaultDbConfig", { enumerable: true, get: function () { return database_1.defaultDbConfig; } });
// ═══════════════════════════════════════════════════════════════
// 配置模块
// ═══════════════════════════════════════════════════════════════
var config_1 = require("./config");
// 路径配置
Object.defineProperty(exports, "PROJECT_PATHS", { enumerable: true, get: function () { return config_1.PROJECT_PATHS; } });
Object.defineProperty(exports, "getProjectRoot", { enumerable: true, get: function () { return config_1.getProjectRoot; } });
Object.defineProperty(exports, "getModulePaths", { enumerable: true, get: function () { return config_1.getModulePaths; } });
Object.defineProperty(exports, "ensurePaths", { enumerable: true, get: function () { return config_1.ensurePaths; } });
Object.defineProperty(exports, "ensureModulePaths", { enumerable: true, get: function () { return config_1.ensureModulePaths; } });
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
//# sourceMappingURL=index.js.map