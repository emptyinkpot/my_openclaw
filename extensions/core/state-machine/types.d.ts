/**
 * 状态机模块 - 类型定义
 */
export type ChapterStatus = 'outline' | 'first_draft' | 'polished' | 'audited' | 'published';
export type StateTransitionReason = 'content_generated' | 'content_polished' | 'audit_passed' | 'audit_failed' | 'published' | 'content_cleared' | 'manual_adjustment' | 'system_migration';
export interface StateTransitionEvent {
    chapterId: number;
    workId: number;
    chapterNumber: number;
    fromState: ChapterStatus;
    toState: ChapterStatus;
    reason: StateTransitionReason;
    timestamp: Date;
    operator?: string;
    metadata?: Record<string, any>;
}
export interface StateTransitionRule {
    from: ChapterStatus;
    to: ChapterStatus[];
    description: string;
}
export interface StateMachineConfig {
    strictMode: boolean;
    logTransitions: boolean;
}
