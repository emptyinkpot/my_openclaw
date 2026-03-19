/**
 * 番茄同步发布服务
 * 根据番茄作品名称匹配本地小说，同步最新章节（只发布润色且审核通过的）
 *
 * 改编自 task-planner/core/services/PublishService.js + ScanService.js
 */
export interface FanqieWork {
    title: string;
    latestChapter: string;
    latestChapterNum: number;
    totalChapters: number;
    accountId: string;
    accountName: string;
}
export interface MatchedWork {
    fanqie: FanqieWork;
    local: {
        id: number;
        title: string;
        current_chapters: number;
    };
    chaptersToPublish: Array<{
        chapterNum: number;
        chapterTitle: string;
        status: string;
        auditStatus: string;
        polished: boolean;
        passed: boolean;
    }>;
}
export interface SyncResult {
    matched: number;
    skipped: number;
    published: number;
    failed: number;
    details: Array<{
        workTitle: string;
        action: 'matched' | 'skipped' | 'published' | 'failed';
        message: string;
    }>;
}
export declare class FanqieSyncService {
    private db;
    private config;
    /**
     * 扫描番茄作品列表
     * 模拟 ScanService.scanFanqie() 的核心逻辑
     * 支持指定账号或扫描所有账号
     */
    scanFanqieWorks(accountId?: string, headed?: boolean): Promise<FanqieWork[]>;
    /**
     * 使用 Playwright 扫描番茄作品列表
     */
    private scanWithPlaywright;
    /**
     * 获取缓存的作品列表
     */
    getCachedWorks(accountId: string): Promise<any[]>;
    /**
     * 保存作品列表到缓存
     */
    private saveWorksCache;
    /**
     * 根据标题匹配本地作品
     */
    matchLocalWork(fanqieTitle: string): Promise<{
        id: number;
        title: string;
        current_chapters: number;
    } | null>;
    /**
     * 清理标题（移除标点符号）
     */
    private cleanTitle;
    /**
     * 检查章节是否可以发布
     * 条件：存在内容 + 已润色 + 审核通过
     */
    checkChapterPublishable(workId: number, chapterNum: number): Promise<{
        canPublish: boolean;
        status: string;
        auditStatus: string;
        chapterTitle: string;
        reason?: string;
    }>;
    /**
     * 获取可以发布的章节列表
     */
    getPublishableChapters(workId: number, fromChapter: number, toChapter: number): Promise<Array<{
        chapterNum: number;
        chapterTitle: string;
        status: string;
        auditStatus: string;
    }>>;
    /**
     * 执行同步
     * 核心逻辑：匹配 → 检查 → 发布
     */
    sync(options?: {
        dryRun?: boolean;
        maxChaptersPerWork?: number;
        headed?: boolean;
    }): Promise<SyncResult>;
    /**
     * 发布单个章节
     * 实际实现需要调用番茄API或模拟浏览器操作
     */
    private publishChapter;
    /**
     * 获取同步状态报告
     */
    getSyncReport(): Promise<{
        totalWorks: number;
        matchedWorks: number;
        pendingPublish: number;
        lastSyncAt: string;
    }>;
}
//# sourceMappingURL=fanqie-sync-service.d.ts.map