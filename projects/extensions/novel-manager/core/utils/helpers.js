"use strict";
/**
 * 通用工具函数
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.delay = delay;
exports.retry = retry;
exports.formatDate = formatDate;
exports.safeJsonParse = safeJsonParse;
exports.createId = createId;
/**
 * 延迟执行
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * 重试函数
 */
async function retry(fn, options = {}) {
    const { attempts = 3, delay: delayMs = 1000 } = options;
    let lastError = null;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        }
        catch (e) {
            lastError = e;
            if (i < attempts - 1) {
                await delay(delayMs);
            }
        }
    }
    throw lastError;
}
/**
 * 格式化日期
 */
function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    const second = String(d.getSeconds()).padStart(2, '0');
    return format
        .replace('YYYY', String(year))
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hour)
        .replace('mm', minute)
        .replace('ss', second);
}
/**
 * 安全解析 JSON
 */
function safeJsonParse(str, fallback) {
    try {
        return JSON.parse(str);
    }
    catch {
        return fallback;
    }
}
/**
 * 生成唯一 ID
 */
function createId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
//# sourceMappingURL=helpers.js.map