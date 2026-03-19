/**
 * OpenClaw Workspace - 共享工具函数
 * 
 * 所有 Hooks 和 Skills 共用的工具函数
 * 
 * @module lib/utils
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// 目录操作
// ============================================================

/**
 * 确保目录存在
 * @param {string} dirPath - 目录路径
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 确保文件的父目录存在
 * @param {string} filePath - 文件路径
 */
function ensureFileDir(filePath) {
  ensureDir(path.dirname(filePath));
}

// ============================================================
// 时间格式化
// ============================================================

/**
 * 格式化 ISO 时间戳
 * @param {Date} date - 日期对象
 * @returns {string}
 */
function formatTimestamp(date = new Date()) {
  return date.toISOString();
}

/**
 * 格式化本地时间（北京时间）
 * @param {Date} date - 日期对象
 * @returns {string}
 */
function formatLocalTime(date = new Date()) {
  return date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
}

/**
 * 格式化日期（YYYY-MM-DD）
 * @param {Date} date - 日期对象
 * @returns {string}
 */
function formatDate(date = new Date()) {
  return date.toISOString().split('T')[0];
}

// ============================================================
// JSONL 操作
// ============================================================

/**
 * 追加 JSONL 记录
 * @param {string} filePath - 文件路径
 * @param {object} record - 记录对象
 */
function appendJsonl(filePath, record) {
  ensureFileDir(filePath);
  fs.appendFileSync(filePath, JSON.stringify(record) + '\n', 'utf-8');
}

/**
 * 读取 JSONL 文件
 * @param {string} filePath - 文件路径
 * @param {object} options - 选项
 * @param {number} options.limit - 限制条数
 * @param {number} options.maxAge - 最大年龄（毫秒）
 * @returns {Array<object>}
 */
function readJsonl(filePath, options = {}) {
  if (!fs.existsSync(filePath)) return [];
  
  const { limit, maxAge } = options;
  const cutoffTime = maxAge ? Date.now() - maxAge : 0;
  
  try {
    const lines = fs.readFileSync(filePath, 'utf-8')
      .trim()
      .split('\n')
      .filter(line => line.trim());
    
    let records = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);
    
    // 过滤过期记录
    if (maxAge) {
      records = records.filter(r => {
        const ts = new Date(r.timestamp).getTime();
        return ts > cutoffTime;
      });
    }
    
    // 限制条数
    if (limit) {
      records = records.slice(-limit);
    }
    
    return records;
  } catch {
    return [];
  }
}

/**
 * 清理过期的 JSONL 记录
 * @param {string} filePath - 文件路径
 * @param {number} maxAge - 最大年龄（毫秒）
 */
function cleanJsonl(filePath, maxAge) {
  if (!fs.existsSync(filePath)) return;
  
  const cutoffTime = Date.now() - maxAge;
  const records = readJsonl(filePath);
  const recentRecords = records.filter(r => {
    const ts = new Date(r.timestamp).getTime();
    return ts > cutoffTime;
  });
  
  if (recentRecords.length < records.length) {
    fs.writeFileSync(filePath, recentRecords.map(r => JSON.stringify(r)).join('\n') + '\n', 'utf-8');
  }
}

// ============================================================
// 哈希与 ID
// ============================================================

/**
 * 简单哈希函数
 * @param {string} str - 输入字符串
 * @returns {string}
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

/**
 * 生成追踪 ID
 * @param {string} prefix - 前缀
 * @returns {string}
 */
function generateTraceId(prefix = 'trace') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

// ============================================================
// 日志
// ============================================================

/**
 * 创建命名日志器
 * @param {string} name - 日志器名称
 * @returns {object}
 */
function createLogger(name) {
  const prefix = `[${name}]`;
  return {
    info: (msg, ...args) => console.log(`${prefix} ${msg}`, ...args),
    error: (msg, ...args) => console.error(`${prefix} ❌ ${msg}`, ...args),
    warn: (msg, ...args) => console.warn(`${prefix} ⚠️ ${msg}`, ...args),
    success: (msg, ...args) => console.log(`${prefix} ✅ ${msg}`, ...args),
    debug: (msg, ...args) => process.env.DEBUG && console.log(`${prefix} [DEBUG] ${msg}`, ...args),
  };
}

// ============================================================
// 错误处理
// ============================================================

/**
 * 安全执行函数
 * @param {Function} fn - 要执行的函数
 * @param {any} fallback - 失败时的返回值
 * @returns {any}
 */
async function safeCall(fn, fallback = null) {
  try {
    return await fn();
  } catch (e) {
    return fallback;
  }
}

/**
 * 带重试的执行
 * @param {Function} fn - 要执行的函数
 * @param {object} options - 选项
 * @param {number} options.retries - 重试次数
 * @param {number} options.delay - 重试间隔（毫秒）
 * @returns {any}
 */
async function withRetry(fn, options = {}) {
  const { retries = 3, delay = 1000 } = options;
  let lastError;
  
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i < retries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// ============================================================
// 导出
// ============================================================

module.exports = {
  // 目录操作
  ensureDir,
  ensureFileDir,
  
  // 时间格式化
  formatTimestamp,
  formatLocalTime,
  formatDate,
  
  // JSONL 操作
  appendJsonl,
  readJsonl,
  cleanJsonl,
  
  // 哈希与 ID
  simpleHash,
  generateTraceId,
  
  // 日志
  createLogger,
  
  // 错误处理
  safeCall,
  withRetry,
};
