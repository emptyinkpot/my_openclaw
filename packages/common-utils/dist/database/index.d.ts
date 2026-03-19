/**
 * 数据库连接管理 - 公共模块
 * @module @openclaw/common-utils/database
 */
import * as mysql from 'mysql2/promise';
/**
 * 数据库配置
 */
export interface DatabaseConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    charset: 'utf8mb4';
}
/**
 * 默认数据库配置（从环境变量读取）
 */
export declare const defaultDbConfig: DatabaseConfig;
/**
 * 获取连接池（支持自定义配置）
 * @param config - 数据库配置（可选，默认使用环境变量配置）
 * @returns mysql.Pool 连接池实例
 */
export declare function getPool(config?: Partial<DatabaseConfig>): mysql.Pool;
/**
 * 获取连接
 * @param config - 数据库配置（可选）
 * @returns Promise<mysql.PoolConnection>
 */
export declare function getConnection(config?: Partial<DatabaseConfig>): Promise<mysql.PoolConnection>;
/**
 * 事务包装器
 * @param fn - 事务函数
 * @param config - 数据库配置（可选）
 * @returns Promise<T>
 * @example
 * ```ts
 * const result = await withTransaction(async (conn) => {
 *   await conn.execute('INSERT INTO...');
 *   return { success: true };
 * });
 * ```
 */
export declare function withTransaction<T>(fn: (conn: mysql.PoolConnection) => Promise<T>, config?: Partial<DatabaseConfig>): Promise<T>;
/**
 * 关闭指定连接池
 * @param config - 数据库配置（可选）
 */
export declare function closePool(config?: Partial<DatabaseConfig>): Promise<void>;
/**
 * 关闭所有连接池
 */
export declare function closeAllPools(): Promise<void>;
export type { Pool, PoolConnection, QueryResult, FieldPacket, RowDataPacket, OkPacket } from 'mysql2/promise';
//# sourceMappingURL=index.d.ts.map