"use strict";
/**
 * 数据库模块 - 统一入口
 *
 * 新位置：extensions/core/database/
 * 职责：集中管理所有数据库相关功能
 *
 * 导出内容：
 * - getPool() - 获取 MySQL 连接池
 * - getConnection() - 获取数据库连接
 * - withTransaction() - 事务包装器
 * - DatabaseManager - 统一数据库管理器
 * - SqliteManager - SQLite 管理器
 * - getDatabaseManager() - 获取单例数据库管理器
 * - ChapterTitleManager - 章节标题管理器（新增）
 * - getChapterTitleManager() - 获取章节标题管理器单例（新增）
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChapterTitleManager = exports.ChapterTitleManager = exports.getDatabaseManager = exports.SqliteManager = exports.DatabaseManager = exports.withTransaction = exports.getConnection = exports.getPool = void 0;
var manager_1 = require("./manager");
Object.defineProperty(exports, "getPool", { enumerable: true, get: function () { return manager_1.getPool; } });
Object.defineProperty(exports, "getConnection", { enumerable: true, get: function () { return manager_1.getConnection; } });
Object.defineProperty(exports, "withTransaction", { enumerable: true, get: function () { return manager_1.withTransaction; } });
Object.defineProperty(exports, "DatabaseManager", { enumerable: true, get: function () { return manager_1.DatabaseManager; } });
Object.defineProperty(exports, "SqliteManager", { enumerable: true, get: function () { return manager_1.SqliteManager; } });
Object.defineProperty(exports, "getDatabaseManager", { enumerable: true, get: function () { return manager_1.getDatabaseManager; } });
var chapter_title_manager_1 = require("./chapter-title-manager");
Object.defineProperty(exports, "ChapterTitleManager", { enumerable: true, get: function () { return chapter_title_manager_1.ChapterTitleManager; } });
Object.defineProperty(exports, "getChapterTitleManager", { enumerable: true, get: function () { return chapter_title_manager_1.getChapterTitleManager; } });
//# sourceMappingURL=index.js.map