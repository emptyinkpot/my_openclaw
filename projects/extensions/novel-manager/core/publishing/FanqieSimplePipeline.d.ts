/**
 * 番茄简化发布流水线
 * 专门用于：自动从番茄获取最新章节 → 找下一章 → 发布
 *
 * 这是简化版本，只做用户需要的事！
 */
export type PipelineStep = 'init' | 'scan' | 'publish' | 'done';
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
export interface TaskResult {
    success: boolean;
    task: any;
    duration: number;
    error?: string;
}
export interface PipelineOptions {
    workId?: number;
    chapterNumber?: number;
    headless?: boolean;
    dryRun?: boolean;
    onProgress?: (event: PipelineProgressEvent) => void;
}
/**
 * 番茄简化发布流水线
 */
export declare class FanqieSimplePipeline {
    private fanqiePublisher;
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
     * 发布到番茄（简化流程）
     *
     * 逻辑：
     * 1. 先从番茄获取最新章节号
     * 2. 从数据库找下一章
     * 3. 发布到番茄
     */
    publishToFanqie(options: PipelineOptions): Promise<TaskResult[]>;
}
