/**
 * 活动日志系统 - 记录所有自动化操作
 *
 * 功能：
 * 1. 记录所有章节处理操作
 * 2. 记录状态变化
 * 3. 提供日志查询接口
 * 4. 支持日志分页
 *
 * @module activity-log
 */
export interface LogEntry {
    id: string;
    type: 'system' | 'content-craft' | 'audit' | 'chapter';
    level: 'info' | 'success' | 'warning' | 'error';
    message: string;
    timestamp: string;
    details?: {
        workId?: number;
        workTitle?: string;
        chapterNumber?: number;
        chapterTitle?: string;
        fromState?: string;
        toState?: string;
        duration?: number;
        error?: string;
    };
}
export declare class ActivityLog {
    private logs;
    private maxLogs;
    private listeners;
    private nextId;
    constructor();
    /**
     * 简单的 log 方法（供前端和快速使用）
     */
    log(type: string, message: string): void;
    /**
     * 获取最近的日志（带简单 ID，供前端使用）
     */
    getRecentLogs(limit?: number): (LogEntry & {
        id: number;
    })[];
    /**
     * 清空日志
     */
    clear(): void;
    /**
     * 添加日志条目
     */
    addEntry(entry: Omit<LogEntry, 'id'>): void;
    /**
     * 获取所有日志
     */
    getLogs(limit?: number, offset?: number): LogEntry[];
    /**
     * 获取最新的日志
     */
    getLatestLogs(count?: number): LogEntry[];
    /**
     * 清除所有日志
     */
    clearLogs(): void;
    /**
     * 添加监听器
     */
    addListener(listener: (logs: LogEntry[]) => void): () => void;
    /**
     * 通知所有监听器
     */
    private notifyListeners;
    /**
     * 生成唯一 ID
     */
    private generateId;
    /**
     * 记录章节生成开始
     */
    logChapterGenerationStart(workId: number, workTitle: string, chapterNumber: number, chapterTitle?: string): void;
    /**
     * 记录章节生成成功
     */
    logChapterGenerationSuccess(workId: number, workTitle: string, chapterNumber: number, chapterTitle?: string, duration?: number): void;
    /**
     * 记录章节生成失败
     */
    logChapterGenerationError(workId: number, workTitle: string, chapterNumber: number, error: string, chapterTitle?: string): void;
    /**
     * 记录章节润色开始
     */
    logChapterPolishStart(workId: number, workTitle: string, chapterNumber: number, chapterTitle?: string): void;
    /**
     * 记录章节润色成功
     */
    logChapterPolishSuccess(workId: number, workTitle: string, chapterNumber: number, chapterTitle?: string, duration?: number): void;
    /**
     * 记录章节润色失败
     */
    logChapterPolishError(workId: number, workTitle: string, chapterNumber: number, error: string, chapterTitle?: string): void;
    /**
     * 记录章节审核开始
     */
    logChapterAuditStart(workId: number, workTitle: string, chapterNumber: number, chapterTitle?: string): void;
    /**
     * 记录章节审核通过
     */
    logChapterAuditSuccess(workId: number, workTitle: string, chapterNumber: number, chapterTitle?: string, duration?: number, autoFixed?: boolean): void;
    /**
     * 记录章节审核失败
     */
    logChapterAuditError(workId: number, workTitle: string, chapterNumber: number, error: string, chapterTitle?: string): void;
}
export declare function getActivityLog(): ActivityLog;
