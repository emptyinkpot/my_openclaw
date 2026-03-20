/**
 * 数据库管理器 - 完全自包含版本
 * 支持 MySQL 和 SQLite，无需外部依赖
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as mysql from 'mysql2/promise';
import * as path from 'path';
import * as fs from 'fs';
import { getConfig } from './config';
// 连接池实例
let pool = null;
/**
 * 获取 MySQL 连接池
 */
export function getPool() {
    if (!pool) {
        const config = getConfig();
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
export function getConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        return yield getPool().getConnection();
    });
}
/**
 * 事务包装器
 */
export function withTransaction(callback) {
    return __awaiter(this, void 0, void 0, function* () {
        const conn = yield getConnection();
        try {
            yield conn.beginTransaction();
            const result = yield callback(conn);
            yield conn.commit();
            return result;
        }
        catch (error) {
            yield conn.rollback();
            throw error;
        }
        finally {
            conn.release();
        }
    });
}
/**
 * SQLite 简单封装（用于轻量级部署）
 */
export class SqliteManager {
    constructor(dbPath) {
        this.busyTimeout = 5000;
        const config = getConfig();
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
        throw new Error(`数据库操作失败: ${lastError === null || lastError === void 0 ? void 0 : lastError.message}`);
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
/**
 * 统一数据库管理器
 * 根据配置自动选择 MySQL 或 SQLite
 */
export class DatabaseManager {
    constructor() {
        this.sqlite = null;
        const config = getConfig();
        if (config.database.type === 'sqlite') {
            this.sqlite = new SqliteManager();
        }
    }
    /**
     * 执行查询
     */
    query(sql_1) {
        return __awaiter(this, arguments, void 0, function* (sql, params = []) {
            const config = getConfig();
            if (config.database.type === 'sqlite' && this.sqlite) {
                return this.sqlite.query(sql, params);
            }
            const [rows] = yield getPool().execute(sql, params);
            return rows;
        });
    }
    /**
     * 查询单行
     */
    queryOne(sql_1) {
        return __awaiter(this, arguments, void 0, function* (sql, params = []) {
            const results = yield this.query(sql, params);
            return results[0] || null;
        });
    }
    /**
     * 执行更新/插入
     */
    execute(sql_1) {
        return __awaiter(this, arguments, void 0, function* (sql, params = []) {
            const config = getConfig();
            if (config.database.type === 'sqlite' && this.sqlite) {
                return this.sqlite.execute(sql, params);
            }
            const [result] = yield getPool().execute(sql, params);
            return result;
        });
    }
    /**
     * 事务执行
     */
    transaction(callback) {
        return __awaiter(this, void 0, void 0, function* () {
            return withTransaction(callback);
        });
    }
    /**
     * 健康检查
     */
    healthCheck() {
        return __awaiter(this, void 0, void 0, function* () {
            const start = Date.now();
            try {
                yield this.queryOne('SELECT 1 as ping');
                return { ok: true, latency: Date.now() - start };
            }
            catch (e) {
                return { ok: false, latency: Date.now() - start, error: e.message };
            }
        });
    }
}
// 单例导出
let dbManagerInstance = null;
export function getDatabaseManager() {
    if (!dbManagerInstance) {
        dbManagerInstance = new DatabaseManager();
    }
    return dbManagerInstance;
}
/*
// 重新导出兼容函数 - 已在前方定义
export { getPool, getConnection, withTransaction };
*/
