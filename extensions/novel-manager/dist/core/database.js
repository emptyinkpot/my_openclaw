"use strict";
/**
 * 数据库管理器 - 完全自包含版本
 * 支持 MySQL 和 SQLite，无需外部依赖
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
exports.DatabaseManager = exports.SqliteManager = void 0;
exports.getPool = getPool;
exports.getConnection = getConnection;
exports.withTransaction = withTransaction;
exports.getDatabaseManager = getDatabaseManager;
const mysql = __importStar(require("mysql2/promise"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const config_1 = require("./config");
// 连接池实例
let pool = null;
/**
 * 获取 MySQL 连接池
 */
function getPool() {
    if (!pool) {
        const config = (0, config_1.getConfig)();
        if (config.database.type === 'sqlite') {
            throw new Error('SQLite 不支持连接池，请使用 getSqliteConnection()');
        }
        pool = mysql.createPool({
            host: config.database.host,
            port: config.database.port,
            user: config.database.user,
            password: config.database.password,
            database: config.database.database,
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0,
            connectTimeout: 10000,
        });
    }
    return pool;
}
/**
 * 获取数据库连接（事务用）
 */
async function getConnection() {
    return await getPool().getConnection();
}
/**
 * 事务包装器
 */
async function withTransaction(callback) {
    const conn = await getConnection();
    try {
        await conn.beginTransaction();
        const result = await callback(conn);
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
 * SQLite 简单封装（用于轻量级部署）
 */
class SqliteManager {
    constructor(dbPath) {
        this.busyTimeout = 5000;
        const config = (0, config_1.getConfig)();
        this.dbPath = dbPath || config.database.sqlitePath;
        this.init();
    }
    init() {
        // 确保目录存在
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
    /**
     * 执行 SQL（使用 child_process 调用 sqlite3 CLI）
     */
    execute(sql, params = []) {
        const { execSync } = require('child_process');
        let lastError = null;
        const maxRetries = 10;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                // 参数转义
                const escapedParams = params.map(p => {
                    if (p === null || p === undefined)
                        return 'NULL';
                    if (typeof p === 'string')
                        return `'${p.replace(/'/g, "''")}'`;
                    return p;
                });
                // 替换参数
                let finalSql = sql;
                escapedParams.forEach(param => {
                    finalSql = finalSql.replace('?', param);
                });
                const result = execSync(`sqlite3 "${this.dbPath}" "${finalSql}"`, { encoding: 'utf8', timeout: 10000 });
                return result.trim();
            }
            catch (e) {
                lastError = e;
                if (e.message.includes('database is locked')) {
                    const delay = 100 * (attempt + 1);
                    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay);
                }
                else {
                    throw e;
                }
            }
        }
        throw new Error(`数据库操作失败: ${lastError?.message}`);
    }
    /**
     * 查询单行
     */
    queryOne(sql, params = []) {
        const result = this.execute(sql, params);
        if (!result)
            return null;
        const lines = result.split('\n');
        if (lines.length === 0)
            return null;
        const columns = lines[0].split('|');
        const values = lines[1] ? lines[1].split('|') : columns;
        const row = {};
        columns.forEach((col, i) => {
            row[col] = values[i] !== undefined ? values[i] : null;
        });
        return row;
    }
    /**
     * 查询多行
     */
    query(sql, params = []) {
        const result = this.execute(sql, params);
        if (!result)
            return [];
        const lines = result.split('\n').filter(l => l.trim());
        if (lines.length < 2)
            return [];
        const columns = lines[0].split('|');
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split('|');
            const row = {};
            columns.forEach((col, idx) => {
                row[col] = values[idx] !== undefined ? values[idx] : null;
            });
            rows.push(row);
        }
        return rows;
    }
}
exports.SqliteManager = SqliteManager;
/**
 * 统一数据库管理器
 * 根据配置自动选择 MySQL 或 SQLite
 */
class DatabaseManager {
    constructor() {
        this.sqlite = null;
        const config = (0, config_1.getConfig)();
        if (config.database.type === 'sqlite') {
            this.sqlite = new SqliteManager();
        }
    }
    /**
     * 执行查询
     */
    async query(sql, params = []) {
        const config = (0, config_1.getConfig)();
        if (config.database.type === 'sqlite' && this.sqlite) {
            return this.sqlite.query(sql, params);
        }
        const [rows] = await getPool().execute(sql, params);
        return rows;
    }
    /**
     * 查询单行
     */
    async queryOne(sql, params = []) {
        const results = await this.query(sql, params);
        return results[0] || null;
    }
    /**
     * 执行更新/插入
     */
    async execute(sql, params = []) {
        const config = (0, config_1.getConfig)();
        if (config.database.type === 'sqlite' && this.sqlite) {
            return this.sqlite.execute(sql, params);
        }
        const [result] = await getPool().execute(sql, params);
        return result;
    }
    /**
     * 事务执行
     */
    async transaction(callback) {
        return withTransaction(callback);
    }
    /**
     * 健康检查
     */
    async healthCheck() {
        const start = Date.now();
        try {
            await this.queryOne('SELECT 1 as ping');
            return { ok: true, latency: Date.now() - start };
        }
        catch (e) {
            return { ok: false, latency: Date.now() - start, error: e.message };
        }
    }
}
exports.DatabaseManager = DatabaseManager;
// 单例导出
let dbManagerInstance = null;
function getDatabaseManager() {
    if (!dbManagerInstance) {
        dbManagerInstance = new DatabaseManager();
    }
    return dbManagerInstance;
}
/*
// 重新导出兼容函数 - 已在前方定义
export { getPool, getConnection, withTransaction };
*/
//# sourceMappingURL=database.js.map