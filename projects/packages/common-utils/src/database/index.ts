/**
 * 鏁版嵁搴撹繛鎺ョ鐞?- 鍏叡妯″潡
 * @module @openclaw/common-utils/database
 */

import * as mysql from 'mysql2/promise';

/**
 * 鏁版嵁搴撻厤缃? */
export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  charset: 'utf8mb4';
}

/**
 * 榛樿鏁版嵁搴撻厤缃紙浠庣幆澧冨彉閲忚鍙栵級
 */
export const defaultDbConfig: DatabaseConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '22295'),
  user: process.env.DB_USER || 'openclaw',
  password: process.env.DB_PASSWORD || 'CHANGE_ME_DB_PASSWORD',
  database: process.env.DB_NAME || 'app_db',
  charset: 'utf8mb4',
};

// 杩炴帴姹犵紦瀛橈紙鎸夐厤缃垎缁勶級
const poolCache = new Map<string, mysql.Pool>();

/**
 * 鑾峰彇杩炴帴姹狅紙鏀寔鑷畾涔夐厤缃級
 * @param config - 鏁版嵁搴撻厤缃紙鍙€夛紝榛樿浣跨敤鐜鍙橀噺閰嶇疆锛? * @returns mysql.Pool 杩炴帴姹犲疄渚? */
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
 * 鑾峰彇杩炴帴
 * @param config - 鏁版嵁搴撻厤缃紙鍙€夛級
 * @returns Promise<mysql.PoolConnection>
 */
export async function getConnection(config?: Partial<DatabaseConfig>): Promise<mysql.PoolConnection> {
  return getPool(config).getConnection();
}

/**
 * 浜嬪姟鍖呰鍣? * @param fn - 浜嬪姟鍑芥暟
 * @param config - 鏁版嵁搴撻厤缃紙鍙€夛級
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
 * 鍏抽棴鎸囧畾杩炴帴姹? * @param config - 鏁版嵁搴撻厤缃紙鍙€夛級
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
 * 鍏抽棴鎵€鏈夎繛鎺ユ睜
 */
export async function closeAllPools(): Promise<void> {
  const promises: Promise<void>[] = [];
  for (const [key, pool] of poolCache.entries()) {
    promises.push(pool.end().then(() => { poolCache.delete(key); }));
  }
  await Promise.all(promises);
}

// 绫诲瀷閲嶆柊瀵煎嚭
export type { Pool, PoolConnection, QueryResult, FieldPacket, RowDataPacket, OkPacket } from 'mysql2/promise';

