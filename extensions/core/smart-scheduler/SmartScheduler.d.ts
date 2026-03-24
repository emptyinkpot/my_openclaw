/**
 * 智能调度器 - 统一管理 Content Craft 和审核自动处理服务
 *
 * 功能：
 * 1. 统一的开关控制
 * 2. 智能调度两个服务，避免冲突
 * 3. 实时日志记录
 * 4. 状态管理
 *
 * @module smart-scheduler
 */
export interface SchedulerStatus {
    running: boolean;
    lastRunTime: string | null;
    currentTask: string | null;
    contentCraftStatus: any;
    auditStatus: any;
}
export interface SchedulerConfig {
    enabled: boolean;
    processInterval: number;
    maxChaptersPerRun: number;
    contentCraft: {
        relatedChapterCount: number;
        autoPolish: boolean;
    };
    audit: {
        autoFix: boolean;
    };
}
export declare class SmartScheduler {
    private contentCraftService;
    private auditService;
    private activityLog;
    private running;
    private timer;
    private lastRunTime;
    private currentTask;
    private config;
    constructor();
    /**
     * 获取当前状态
     */
    getStatus(): SchedulerStatus;
    /**
     * 获取配置
     */
    getConfig(): SchedulerConfig;
    /**
     * 更新配置
     */
    updateConfig(newConfig: Partial<SchedulerConfig>): void;
    /**
     * 启动智能调度器
     */
    start(): void;
    /**
     * 停止智能调度器
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
     * 执行调度任务
     */
    private runScheduledTask;
    /**
     * 辅助函数：sleep
     */
    private sleep;
}
export declare function getSmartScheduler(): SmartScheduler;
