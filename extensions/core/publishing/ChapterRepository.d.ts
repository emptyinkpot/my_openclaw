/**
 * 章节数据仓库
 * 统一章节相关的数据访问逻辑
 *
 * 职责：封装所有章节相关的数据库操作
 */
export interface ChapterFilter {
    workId?: number;
    chapterNumber?: number;
    chapterRange?: [number, number];
    polishStatus?: string;
    auditStatus?: string;
    publishStatus?: string;
    hasContent?: boolean;
    limit?: number;
}
export interface ChapterData {
    workId: number;
    workTitle: string;
    chapterNumber: number;
    chapterTitle: string;
    content: string | null;
    wordCount: number;
    polishStatus: string | null;
    auditStatus: string | null;
    publishStatus: string | null;
}
export declare class ChapterRepository {
    private db;
    /**
     * 获取作品信息
     */
    getWorkInfo(workId: number): Promise<{
        id: number;
        title: string;
    } | null>;
    /**
     * 按章节号获取章节内容（用于发布，不管发布状态）
     */
    getChapterByNumber(workId: number, chapterNumber: number): Promise<ChapterData | null>;
    /**
     * 获取待发布章节
     * 条件：有内容 + status = 'audited' + 未发布
     */
    getPendingPublish(filter?: ChapterFilter): Promise<ChapterData[]>;
    /**
     * 获取待处理章节（流水线用）
     * 条件：有内容 + 未发布
     */
    getPendingProcess(filter?: ChapterFilter): Promise<ChapterData[]>;
    /**
     * 更新发布状态
     */
    updatePublishStatus(workId: number, chapterNumber: number, status: string): Promise<void>;
    /**
     * 更新审核状态
     */
    updateAuditStatus(workId: number, chapterNumber: number, status: string, issues?: string): Promise<void>;
    /**
     * 更新润色状态
     */
    updatePolishStatus(workId: number, chapterNumber: number, status: string, polishedContent?: string): Promise<void>;
    /**
     * 获取章节内容
     */
    getChapterContent(workId: number, chapterNumber: number): Promise<string | null>;
}
export declare function getChapterRepository(): ChapterRepository;
