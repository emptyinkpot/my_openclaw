/**
 * 内容处理流水线
 * 协调检测 → 润色 → 审核 → 发布的完整流程
 *
 * 这是核心编排层，统筹整个内容发布流水线
 */
import { ScanResult, ScannedWork } from './pipeline/FanqieScanner';
export type PipelineStep = 'init' | 'scan' | 'audit' | 'detect' | 'polish' | 'publish' | 'done';
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
    platforms?: string[];
    dryRun?: boolean;
    headless?: boolean;
    skipAudit?: boolean;
    maxConcurrent?: number;
    onProgress?: (event: PipelineProgressEvent) => void;
}
/**
 * 内容处理流水线
 */
export declare class ContentPipeline {
    private state;
    private monitor;
    private detector;
    private auditService;
    private fanqiePublisher;
    private scanner;
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
     * 添加结果
     */
    private addResult;
    /**
     * 直接发布到番茄（简化流程）
     */
    publishToFanqie(options: {
        workId: number;
        chapterNumber?: number;
        headless?: boolean;
        dryRun?: boolean;
        onProgress?: (event: PipelineProgressEvent) => void;
    }): Promise<TaskResult[]>;
    /**
     * 运行完整流程：检测 → 润色 → 审核 → 发布
     */
    runSchedule(options?: PipelineOptions): Promise<TaskResult[]>;
    run(options?: PipelineOptions): Promise<TaskResult[]>;
    /**
     * 发布单个章节
     */
    private publishChapter;
    /**
     * 获取待处理章节
     */
    private getPendingChapters;
    private runAuditTask;
    start(): Promise<void>;
    stop(): Promise<void>;
    getState(): {
        running: boolean;
        pipeline: import("./pipeline/StateService").PipelineState;
        failures: {
            total: number;
            external: number;
            critical: number;
            internal: number;
        };
    };
    getEfficiencyReport(): import("./pipeline/StateService").EfficiencyReport;
    getFailureReport(): string | null;
    /**
     * 扫描番茄作品列表
     */
    scanFanqieWorks(options?: {
        accountId?: string;
        headed?: boolean;
    }): Promise<ScanResult>;
    /**
     * 获取扫描缓存
     */
    getScanCache(accountId?: string): ScannedWork[];
}
//# sourceMappingURL=ContentPipeline.d.ts.map