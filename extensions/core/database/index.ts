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

export {
  getPool,
  getConnection,
  withTransaction,
  DatabaseManager,
  SqliteManager,
  getDatabaseManager,
  QueryResult
} from './manager';

export {
  ChapterTitleManager,
  getChapterTitleManager,
  VolumeOutline,
  ChapterOutline,
  Chapter
} from './chapter-title-manager';
