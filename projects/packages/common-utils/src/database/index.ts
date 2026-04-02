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
export const defaultDbConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'sh-cynosdbmysql-grp-1kbg1xh0.sql.tencentcdb.com',
  port: parseInt(process.env.DB_PORT || '22295'),
  user: process.env.DB_USER || 'openclaw',
  password: process.env.DB_PASSWORD || 'Lgp15237257500',
  database: process.env.DB_NAME || 'cloudbase-4glvyyq9f61b19cd',
  charset: 'utf8mb4',
};

// 连接池缓存（按配置分组）
const poolCache = new Map<string, mysql.Pool>();

/**
 * 获取连接池（支持自定义配置）
 * @param config - 数据库配置（可选，默认使用环境变量配置）
 * @returns mysql.Pool 连接池实例
 */
export function getPool(config?: Partial<DatabaseConfig>): mysql.Pool {
  const mergedConfig = { ...defaultDbConfig, ...config };
  const cacheKey = `${mergedConfig.host}:${mergedConfig.port}/${mergedConfig.database}`;
  
  if (!poolCache.has(cacheKey)) {
    poolCache.set(cacheKey, mysql.createPool({
      host: mergedConfig.host,
      port: mergedConfig.port,
      user: mergedConfig.user,
      password: mergedConfig.password,
      database: mergedConfig.database,
      charset: mergedConfig.charset,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    }));
  }
  
  return poolCache.get(cacheKey)!;
}

/**
 * 获取连接
 * @param config - 数据库配置（可选）
 * @returns Promise<mysql.PoolConnection>
 */
export async function getConnection(config?: Partial<DatabaseConfig>): Promise<mysql.PoolConnection> {
  return getPool(config).getConnection();
}

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
export async function withTransaction<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>,
  config?: Partial<DatabaseConfig>
): Promise<T> {
  const conn = await getConnection(config);
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

/**
 * 关闭指定连接池
 * @param config - 数据库配置（可选）
 */
export async function closePool(config?: Partial<DatabaseConfig>): Promise<void> {
  const mergedConfig = { ...defaultDbConfig, ...config };
  const cacheKey = `${mergedConfig.host}:${mergedConfig.port}/${mergedConfig.database}`;
  
  const pool = poolCache.get(cacheKey);
  if (pool) {
    await pool.end();
    poolCache.delete(cacheKey);
  }
}

/**
 * 关闭所有连接池
 */
export async function closeAllPools(): Promise<void> {
  const promises: Promise<void>[] = [];
  for (const [key, pool] of poolCache.entries()) {
    promises.push(pool.end().then(() => { poolCache.delete(key); }));
  }
  await Promise.all(promises);
}

// 类型重新导出
export type { Pool, PoolConnection, QueryResult, FieldPacket, RowDataPacket, OkPacket } from 'mysql2/promise';
