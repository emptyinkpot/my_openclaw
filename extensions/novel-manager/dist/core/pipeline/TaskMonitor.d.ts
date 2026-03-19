/**
 * 任务监控服务
 * 监控流水线各阶段的失败原因
 */
export interface ErrorAnalysis {
    errorType: 'external' | 'critical' | 'internal' | 'unknown';
    isExternal: boolean;
    isCritical: boolean;
    shouldSkip: boolean;
    shouldNotify: boolean;
    summary: string;
}
export interface FailureRecord {
    workName: string;
    action: string;
    chapterNum: number;
    errorMessage: string;
    errorType: string;
    summary: string;
    timestamp: string;
    notified: boolean;
}
export declare class TaskMonitor {
    private externalErrorKeywords;
    private criticalErrorKeywords;
    private failedTasks;
    private maxRecords;
    analyzeError(errorMessage: string): ErrorAnalysis;
    recordFailure(workName: string, action: string, chapterNum: number, errorMessage: string, analysis: ErrorAnalysis): FailureRecord;
    markNotified(workName: string, action: string, chapterNum: number): void;
    getUnnotifiedFailures(): FailureRecord[];
    getRecentFailures(limit?: number): FailureRecord[];
    getStats(): {
        total: number;
        external: number;
        critical: number;
        internal: number;
    };
    generateFailureReport(): string | null;
    private summarizeError;
}
//# sourceMappingURL=TaskMonitor.d.ts.map