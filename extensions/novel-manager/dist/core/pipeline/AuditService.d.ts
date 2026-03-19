/**
 * 审核服务
 * 负责章节审核状态检查、自动修复
 */
export type AuditStatus = 'pending' | 'passed' | 'failed';
export type SuggestedAction = 'none' | 'autofix' | 'manual';
export interface AuditIssue {
    type: 'content' | 'format' | 'length' | 'sensitive' | 'other';
    message: string;
    severity: 'warning' | 'error';
    position?: {
        start: number;
        end: number;
    };
}
export interface AuditResult {
    status: AuditStatus;
    issues: AuditIssue[];
    score: number;
    suggestedAction: SuggestedAction;
    canAutoFix: boolean;
}
export interface ChapterAuditStatus {
    workId: number;
    chapterNumber: number;
    exists: boolean;
    status: string;
    auditStatus: AuditStatus | null;
    auditIssues: AuditIssue[];
    suggestedAction: SuggestedAction;
    canPublish: boolean;
}
export interface AuditConfig {
    minWordCount: number;
    maxWordCount: number;
    checkSensitiveWords: boolean;
    checkFormat: boolean;
    sensitiveWords: string[];
}
export declare class AuditService {
    private db;
    private config;
    constructor(config?: Partial<AuditConfig>);
    initializeTables(): Promise<void>;
    getChapterAuditStatus(workId: number, chapterNumber: number): Promise<ChapterAuditStatus>;
    auditChapter(workId: number, chapterNumber: number): Promise<AuditResult>;
    getAuditStats(workId?: number): Promise<{
        total: number;
        pending: number;
        passed: number;
        failed: number;
        autoFixable: number;
    }>;
    /**
     * 获取待审核章节列表
     */
    getPendingAuditChapters(workId?: number): Promise<ChapterAuditStatus[]>;
    /**
     * 获取审核失败的章节
     */
    getFailedAuditChapters(workId?: number): Promise<ChapterAuditStatus[]>;
    /**
     * 批量审核章节
     */
    auditChapters(workId?: number, options?: {
        chapterRange?: [number, number];
        onlyPending?: boolean;
    }): Promise<{
        total: number;
        passed: number;
        failed: number;
        results: AuditResult[];
    }>;
    /**
     * 重置审核状态
     */
    resetAuditStatus(workId: number, chapterNumber: number): Promise<void>;
    private saveAuditResult;
    private parseAuditIssues;
    private countWords;
    private checkFormat;
    private checkSensitiveWords;
}
//# sourceMappingURL=AuditService.d.ts.map