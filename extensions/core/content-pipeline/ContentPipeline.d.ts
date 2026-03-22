/**
 * 审稿模块 - 章节审核调度
 * 协调待审核章节的审核流程
 *
 * 这是核心编排层，统筹整个审稿流程
 */
export type PipelineStep = 'init' | 'scan' | 'audit' | 'done';
export interface PipelineProgressEvent {
    status: 'idle' | 'running' | 'completed' | 'error';
    step: PipelineStep;
    stepLabel: string;
    current: number;
    total: number;
    task: string;
    detail?: string;
    percent: number;
    results: ProgressResult[];
    startTime?: number;
    elapsed?: number;
    error?: string;
}
export interface ProgressResult {
    success: boolean;
    workTitle: string;
    chapterNumber: number;
    chapterTitle: string;
    message: string;
    duration?: number;
}
export interface PipelineTask {
    workId: number;
    workName: string;
    chapterNumber: number;
    chapterTitle: string;
    content: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    result?: string;
    error?: string;
}
export interface TaskResult {
    success: boolean;
    task: any;
    duration: number;
    error?: string;
}
export interface PipelineOptions {
    workId?: number;
    chapterRange?: [number, number];
    dryRun?: boolean;
    maxConcurrent?: number;
    onProgress?: (event: PipelineProgressEvent) => void;
}
export type WorkStatus = 'outline' | 'pending' | 'audited' | 'published';
export type ChapterStatus = 'outline' | 'pending' | 'audited' | 'published';
/**
 * 审稿模块 - 审核调度
 */
export declare class ContentPipeline {
    private state;
    private monitor;
    private auditService;
    private db;
    private running;
    private abortController;
    private progressCallback?;
    private startTime?;
    private progressResults;
    constructor();
    /**
     * 发出进度事件
     */
    private emitProgress;
    /**
     * 运行完整流程：检测 → 润色 → 审核 → 发布
     */
    runSchedule(options?: PipelineOptions): Promise<TaskResult[]>;
    /**
     * 审稿调度主函数
     * 审核所有待审核章节，审核通过后状态变为 audited
     */
    run(options?: PipelineOptions): Promise<TaskResult[]>;
    /**
     * 获取待审核章节
     */
    private getPendingAuditChapters;
    /**
     * 执行审核任务
     */
    private runAuditTask;
    /**
     * 更新章节状态
     */
    private updateChapterStatus;
    start(): Promise<void>;
    stop(): Promise<void>;
    getState(): {
        running: boolean;
        pipeline: import("./StateService").PipelineState;
        failures: {
            total: number;
            external: number;
            critical: number;
            internal: number;
        };
    };
    getEfficiencyReport(): import("./StateService").EfficiencyReport;
    getFailureReport(): string | null;
}
