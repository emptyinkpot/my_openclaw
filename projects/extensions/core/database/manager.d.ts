/**
 * 数据库管理器 - 完全自包含版本
 * 支持 MySQL 和 SQLite，无需外部依赖
 *
 * 新位置：extensions/database/manager.ts
 * 旧位置：extensions/core/storage/database.ts（兼容层仍保留）
 */
import * as mysql from 'mysql2/promise';
export interface QueryResult<T = any> {
    rows: T[];
    fields: any[];
}
/**
 * 获取 MySQL 连接池
 */
export declare function getPool(): mysql.Pool;
/**
 * 获取数据库连接（事务用）
 */
export declare function getConnection(): Promise<mysql.PoolConnection>;
/**
 * 事务包装器
 */
export declare function withTransaction<T>(callback: (conn: mysql.PoolConnection) => Promise<T>): Promise<T>;
/**
 * SQLite 简单封装（用于轻量级部署）
 */
export declare class SqliteManager {
    private dbPath;
    private busyTimeout;
    constructor(dbPath?: string);
    private init;
    /**
     * 执行 SQL（使用 child_process 调用 sqlite3 CLI）
     */
    execute(sql: string, params?: any[]): string;
    /**
     * 查询单行
     */
    queryOne<T = any>(sql: string, params?: any[]): T | null;
    /**
     * 查询多行
     */
    query<T = any>(sql: string, params?: any[]): T[];
}
/**
 * 统一数据库管理器
 * 根据配置自动选择 MySQL 或 SQLite
 */
export declare class DatabaseManager {
    private sqlite;
    constructor();
    /**
     * 执行查询
     */
    query<T = any>(sql: string, params?: any[]): Promise<T[]>;
    /**
     * 查询单行
     */
    queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
    /**
     * 执行更新/插入
     */
    execute(sql: string, params?: any[]): Promise<any>;
    /**
     * 事务执行
     */
    transaction<T>(callback: (conn: mysql.PoolConnection) => Promise<T>): Promise<T>;
    /**
     * 健康检查
     */
    healthCheck(): Promise<{
        ok: boolean;
        latency: number;
        error?: string;
    }>;
}
export declare function getDatabaseManager(): DatabaseManager;
