/**
 * 通用工具函数
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
/**
 * 延迟执行
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * 重试函数
 */
export function retry(fn_1) {
    return __awaiter(this, arguments, void 0, function* (fn, options = {}) {
        const { attempts = 3, delay: delayMs = 1000 } = options;
        let lastError = null;
        for (let i = 0; i < attempts; i++) {
            try {
                return yield fn();
            }
            catch (e) {
                lastError = e;
                if (i < attempts - 1) {
                    yield delay(delayMs);
                }
            }
        }
        throw lastError;
    });
}
/**
 * 格式化日期
 */
export function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
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
export function safeJsonParse(str, fallback) {
    try {
        return JSON.parse(str);
    }
    catch (_a) {
        return fallback;
    }
}
/**
 * 生成唯一 ID
 */
export function createId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
