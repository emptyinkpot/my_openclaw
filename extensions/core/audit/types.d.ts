/**
 * 审稿模块 - 类型定义
 * 集中管理所有类型，保证类型安全
 */
export type WorkStatus = 'outline' | 'pending' | 'audited' | 'published';
export type ChapterStatus = 'outline' | 'first_draft' | 'polished' | 'audited' | 'published';
export type AuditStatus = 'pending' | 'reviewing' | 'passed' | 'failed';
export type SuggestedAction = 'auto_fix' | 'manual' | 'none';
export type IssueSeverity = 'error' | 'warning' | 'info';
export interface AuditIssue {
    type: string;
    message: string;
    severity: IssueSeverity;
    position?: {
        line?: number;
        column?: number;
    };
}
export interface AuditResult {
    status: AuditStatus;
    issues: AuditIssue[];
    score: number;
    suggestedAction: SuggestedAction;
    canAutoFix: boolean;
}
export interface ChapterData {
    id: number;
    workId: number;
    chapterNumber: number;
    title: string;
    content: string;
    status: ChapterStatus;
}
export interface WorkData {
    id: number;
    title: string;
    status: WorkStatus;
}
export interface AuditProgressEvent {
    status: 'idle' | 'running' | 'completed' | 'error';
    current: number;
    total: number;
    task: string;
    detail?: string;
    percent: number;
    results: AuditProgressResult[];
    startTime?: number;
    elapsed?: number;
    error?: string;
}
export interface AuditProgressResult {
    success: boolean;
    workTitle: string;
    chapterNumber: number;
    chapterTitle: string;
    message: string;
    duration?: number;
}
export interface AuditOptions {
    workId?: number;
    chapterRange?: [number, number];
    dryRun?: boolean;
    autoFix?: boolean;
    onProgress?: (event: AuditProgressEvent) => void;
}
export interface AuditTaskResult {
    success: boolean;
    chapter: ChapterData;
    duration: number;
    error?: string;
}
