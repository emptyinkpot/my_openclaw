/**
 * 番茄小说发布服务
 * 将润色并审核通过的章节发布到番茄平台
 *
 * 改编自 task-planner/scripts/publish-to-fanqie.js
 */
export interface FanqieAccount {
    id: string;
    name: string;
    browserDir: string;
    cookiesFile: string;
}
export interface ChapterToPublish {
    workId: number;
    workTitle: string;
    chapterNumber: number;
    chapterTitle: string;
    content: string;
    wordCount: number;
}
export interface PublishResult {
    success: boolean;
    workId: number;
    chapterNumber: number;
    chapterTitle: string;
    message: string;
    error?: string;
    publishedAt?: string;
}
export interface PublishProgress {
    action: string;
    detail?: string;
    percent?: number;
}
export declare class FanqiePublisher {
    private config;
    private browserContext;
    private page;
    /**
     * 获取所有待发布的章节
     * 条件：有内容 + 已润色(polished) + 审核通过(passed)
     */
    getPendingChapters(workId?: number, limit?: number): Promise<ChapterToPublish[]>;
    /**
     * 发布单章到番茄
     */
    publishChapter(chapter: ChapterToPublish, account: FanqieAccount, options?: {
        dryRun?: boolean;
        headless?: boolean;
        onProgress?: (progress: PublishProgress) => void;
    }): Promise<PublishResult>;
    /**
     * 初始化浏览器
     */
    private initBrowser;
    /**
     * 关闭浏览器
     */
    private closeBrowser;
    /**
     * 清理浏览器锁文件
     */
    private cleanBrowserLocks;
    /**
     * 在番茄找到对应作品
     */
    private findFanqieWork;
    /**
     * 获取番茄作品的最新章节号
     */
    private getFanqieLatestChapter;
    /**
     * 执行发布
     */
    private doPublishToFanqie;
    /**
     * 条件等待：等待自动保存完成
     * 通过检测保存状态文本或超时
     */
    private waitForAutoSave;
    /**
     * 条件等待：等待弹窗出现
     */
    private waitForDialog;
    /**
     * 条件等待：等待弹窗消失
     */
    private waitForDialogClosed;
    /**
     * 条件等待：等待页面跳转
     */
    private waitForNavigation;
    /**
     * 关闭弹窗
     */
    private closePopups;
    /**
     * 清理内容
     */
    private cleanContent;
    /**
     * 更新发布状态
     */
    private updatePublishStatus;
    /**
     * 获取番茄账号列表
     */
    getFanqieAccounts(): FanqieAccount[];
}
//# sourceMappingURL=FanqiePublisher.d.ts.map