/**
 * 审核自动处理服务
 *
 * 自动处理章节审核：
 * - 自动审核状态为 `polished`（润色完成）的章节，审核通过后标记为 `audited`
 * - 支持自动修复可修复的问题
 *
 * @module audit-auto
 */
export interface AuditAutoServiceStatus {
    running: boolean;
    lastRunTime: string | null;
    currentTask: string | null;
    processedCount: number;
    errorCount: number;
}
export interface AuditAutoServiceConfig {
    enabled: boolean;
    processInterval: number;
    maxChaptersPerRun: number;
    autoFix: boolean;
}
export declare class AuditAutoService {
    private novelService;
    private activityLog;
    private running;
    private timer;
    private lastRunTime;
    private currentTask;
    private processedCount;
    private errorCount;
    private isProcessing;
    private config;
    constructor();
    /**
     * 获取当前状态
     */
    getStatus(): AuditAutoServiceStatus;
    /**
     * 获取配置
     */
    getConfig(): AuditAutoServiceConfig;
    /**
     * 更新配置
     */
    updateConfig(newConfig: Partial<AuditAutoServiceConfig>): void;
    /**
     * 启动自动审核服务
     */
    start(): void;
    /**
     * 停止自动审核服务
     */
    stop(): void;
    /**
     * 启动定时器
     */
    private startTimer;
    /**
     * 停止定时器
     */
    private stopTimer;
    /**
     * 重启定时器
     */
    private restartTimer;
    /**
     * 处理章节
     */
    private processChapters;
    /**
     * 获取需要审核的章节
     */
    private getChaptersToProcess;
    /**
     * 审核单个章节（完整流程）
     */
    private auditChapter;
}
export declare function getAuditAutoService(): AuditAutoService;
