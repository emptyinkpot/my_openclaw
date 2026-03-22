/**
 * 审稿模块 - 数据访问层
 * 负责所有数据库操作，低耦合
 */
import { ChapterData, WorkData, AuditStatus, SuggestedAction, AuditIssue } from './types';
/**
 * 获取待审核的章节列表
 */
export declare function getPendingAuditChapters(options: {
    workId?: number;
    chapterRange?: [number, number];
}): Promise<ChapterData[]>;
/**
 * 获取章节详情
 */
export declare function getChapter(workId: number, chapterNumber: number): Promise<ChapterData | null>;
/**
 * 获取作品信息
 */
export declare function getWork(workId: number): Promise<WorkData | null>;
/**
 * 更新章节状态
 */
export declare function updateChapterStatus(workId: number, chapterNumber: number, status: string): Promise<void>;
/**
 * 保存审核结果
 */
export declare function saveAuditResult(workId: number, chapterNumber: number, auditStatus: AuditStatus, auditIssues: AuditIssue[], suggestedAction: SuggestedAction): Promise<void>;
/**
 * 获取审核结果
 */
export declare function getAuditResult(workId: number, chapterNumber: number): Promise<{
    auditStatus: AuditStatus;
    auditIssues: AuditIssue[];
    suggestedAction: SuggestedAction;
} | null>;
/**
 * 更新章节内容
 */
export declare function updateChapterContent(workId: number, chapterNumber: number, content: string): Promise<void>;
