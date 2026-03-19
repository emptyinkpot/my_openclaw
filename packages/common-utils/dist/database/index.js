"use strict";
/**
 * 数据库连接管理 - 公共模块
 * @module @openclaw/common-utils/database
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultDbConfig = void 0;
exports.getPool = getPool;
exports.getConnection = getConnection;
exports.withTransaction = withTransaction;
exports.closePool = closePool;
exports.closeAllPools = closeAllPools;
const mysql = __importStar(require("mysql2/promise"));
/**
 * 默认数据库配置（从环境变量读取）
 */
exports.defaultDbConfig = {
    host: process.env.DB_HOST || 'sh-cynosdbmysql-grp-1kbg1xh0.sql.tencentcdb.com',
    port: parseInt(process.env.DB_PORT || '22295'),
    user: process.env.DB_USER || 'openclaw',
    password: process.env.DB_PASSWORD || 'Lgp15237257500',
    database: process.env.DB_NAME || 'cloudbase-4glvyyq9f61b19cd',
    charset: 'utf8mb4',
};
// 连接池缓存（按配置分组）
const poolCache = new Map();
/**
 * 获取连接池（支持自定义配置）
 * @param config - 数据库配置（可选，默认使用环境变量配置）
 * @returns mysql.Pool 连接池实例
 */
function getPool(config) {
    const mergedConfig = { ...exports.defaultDbConfig, ...config };
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
    return poolCache.get(cacheKey);
}
/**
 * 获取连接
 * @param config - 数据库配置（可选）
 * @returns Promise<mysql.PoolConnection>
 */
async function getConnection(config) {
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
async function withTransaction(fn, config) {
    const conn = await getConnection(config);
    try {
        await conn.beginTransaction();
        const result = await fn(conn);
        await conn.commit();
        return result;
    }
    catch (error) {
        await conn.rollback();
        throw error;
    }
    finally {
        conn.release();
    }
}
/**
 * 关闭指定连接池
 * @param config - 数据库配置（可选）
 */
async function closePool(config) {
    const mergedConfig = { ...exports.defaultDbConfig, ...config };
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
async function closeAllPools() {
    const promises = [];
    for (const [key, pool] of poolCache.entries()) {
        promises.push(pool.end().then(() => { poolCache.delete(key); }));
    }
    await Promise.all(promises);
}
//# sourceMappingURL=index.js.map