/**
 * 状态管理服务
 * 负责流水线状态的持久化、恢复和监控
 */
export interface DailyStats {
    date: string;
    polished: number;
    generated: number;
    published: number;
    audited: number;
    errors: number;
}
export interface WorkStats {
    polished: number;
    generated: number;
    published: number;
    audited: number;
}
export interface PipelineState {
    lastRunTime: string | null;
    lastProcessedIndex: number;
    isRunning: boolean;
    stats: {
        totalRuns: number;
        totalPolished: number;
        totalGenerated: number;
        totalPublished: number;
        totalAudited: number;
        totalErrors: number;
        today: DailyStats;
        avgPolishTime: number;
        avgGenerateTime: number;
        avgPublishTime: number;
        avgAuditTime: number;
        polishTimes: number[];
        generateTimes: number[];
        publishTimes: number[];
        auditTimes: number[];
    };
    works: Record<string, WorkStats>;
    recentErrors: Array<{
        time: string;
        action: string;
        workName: string;
        chapterNum: number;
        error: string;
    }>;
}
export interface EfficiencyReport {
    totalRuns: number;
    total: {
        polished: number;
        generated: number;
        published: number;
        audited: number;
        errors: number;
    };
    today: DailyStats;
    avgTime: {
        polish: string;
        generate: string;
        publish: string;
        audit: string;
    };
    recentErrors: Array<any>;
}
export declare class StateService {
    private stateFilePath;
    private state;
    constructor(stateFilePath?: string);
    private getDefaultState;
    private load;
    save(): void;
    getState(): PipelineState;
    setRunning(running: boolean): void;
    setProcessedIndex(index: number): void;
    recordAction(action: 'polish' | 'generate' | 'publish' | 'audit', workName: string, chapterNum: number, duration?: number, success?: boolean): void;
    private updateAvgTime;
    private addError;
    getTodayStats(): DailyStats;
    getEfficiencyReport(): EfficiencyReport;
    getProcessedIndex(): number;
    isRunning(): boolean;
    reset(): void;
}
