/**
 * 通用工具函数
 */
/**
 * 延迟执行
 */
export declare function delay(ms: number): Promise<void>;
/**
 * 重试函数
 */
export declare function retry<T>(fn: () => Promise<T>, options?: {
    attempts?: number;
    delay?: number;
}): Promise<T>;
/**
 * 格式化日期
 */
export declare function formatDate(date: Date | string | number, format?: string): string;
/**
 * 安全解析 JSON
 */
export declare function safeJsonParse<T = any>(str: string, fallback: T): T;
/**
 * 生成唯一 ID
 */
export declare function createId(): string;
//# sourceMappingURL=helpers.d.ts.map