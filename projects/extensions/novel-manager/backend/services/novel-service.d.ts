/**
 * 小说数据服务
 */
export interface NovelFilter {
    status?: string;
    platform?: string;
    search?: string;
}
export interface NovelStats {
    works: number;
    chapters: number;
    totalWords: number;
    has_content: number;
    outlines: number;
    characters: number;
}
export declare class NovelService {
    private db;
    private initialized;
    private contentPipeline;
    private getPipeline;
    /**
     * 初始化数据库表
     */
    initTables(): Promise<void>;
    /**
     * 获取所有作品
     */
    getWorks(filter?: NovelFilter): Promise<any[]>;
    /**
     * 获取作品详情
     */
    getWorkById(id: number): Promise<any>;
    /**
     * 获取章节详情
     */
    getChapterById(id: number): Promise<any>;
    /**
     * 获取作品的所有章节
     */
    getChaptersByWorkId(workId: number): Promise<any[]>;
    /**
     * 获取作品的所有角色
     */
    getCharactersByWorkId(workId: number): Promise<any[]>;
    /**
     * 获取作品的故事背景
     */
    getStoryBackgroundByWorkId(workId: number): Promise<any>;
    /**
     * 获取作品的大纲
     */
    getOutlineByWorkId(workId: number): Promise<any>;
    /**
     * 获取章节细纲
     */
    getChapterOutline(workId: number, chapterNumber: number): Promise<any>;
    /**
     * 获取关联章节（前面的章节）
     */
    getRelatedChapters(workId: number, chapterNumber: number, count?: number): Promise<any[]>;
    /**
     * 获取统计信息
     */
    getStats(): Promise<NovelStats>;
    /**
     * 导入章节
     */
    importChapters(workId: number, chapters: Array<{
        number: number;
        title: string;
        content: string;
        word_count?: number;
    }>): Promise<number>;
    /**
     * 删除作品
     */
    deleteWork(id: number): Promise<boolean>;
    /**
     * 更新作品信息
     */
    updateWork(id: number, data: {
        title?: string;
        author?: string;
        status?: string;
    }): Promise<void>;
    /**
     * 更新章节
     */
    updateChapter(id: number, data: {
        title?: string;
        content?: string;
        status?: string;
    }): Promise<void>;
    /**
     * 使用状态机更新章节状态（推荐方式）
     */
    updateChapterWithStateMachine(id: number, toState: any, reason: any, data?: {
        title?: string;
        content?: string;
    }): Promise<any>;
    /**
     * 根据卷纲生成章节
     */
    generateChaptersFromVolumes(workId: number): Promise<{
        generated: number;
        total: any;
    }>;
    /**
     * 获取番茄作品列表
     */
    getFanqieWorks(): Promise<any[]>;
    /**
     * 获取番茄作品列表（按账号）
     */
    getFanqieWorksByAccount(accountId: number): Promise<any[]>;
    /**
     * 扫描番茄作品 - 调用 FanqieScanner
     */
    scanFanqieWorks(accountId?: string): Promise<{
        success: any;
        message: any;
        works: any;
    }>;
    /**
     * 启动番茄发布（暂时禁用，需要更新到新的 FanqieSimplePipeline）
     */
    /**
     * 获取经验记录
     */
    getExperienceRecords(): Promise<any>;
    /**
     * 添加经验记录
     */
    addExperienceRecord(record: any): Promise<any>;
    /**
     * 获取缓存文件列表
     */
    getCacheFiles(): Promise<{
        name: string;
        path: string;
        size: number;
        modified: Date;
    }[]>;
    /**
     * 获取缓存文件内容
     */
    getCacheFileContent(name: string): Promise<string>;
    /**
     * 保存缓存文件内容
     */
    saveCacheFileContent(name: string, content: string): Promise<boolean>;
    /**
     * 调试：检查章节详情
     */
    debugChapter(workId: number, chapterNumber: number): Promise<any>;
    /**
     * 调试：测试查询待发布章节
     */
    debugPendingChapters(workId: number, startChapter: number, endChapter: number): Promise<{
        sql: string;
        params: number[];
        count: number;
        rows: any[];
    }>;
    /**
     * 测试浏览器（用截图来观察效果
     */
    testBrowser(): Promise<{
        success: boolean;
        message: string;
        screenshotPath: any;
        error?: undefined;
    } | {
        success: boolean;
        message: string;
        error: string;
        screenshotPath?: undefined;
    }>;
    /**
     * 启动内容流水线（发布某个作品的最新章节）
     */
    startPipeline(options?: {
        workId?: number;
        accountId?: string;
        dryRun?: boolean;
    }): Promise<{
        success: boolean;
        message: string;
        progressId: string;
        error?: undefined;
        stack?: undefined;
    } | {
        success: boolean;
        message: string;
        error: string;
        stack: any;
        progressId?: undefined;
    }>;
    /**
     * 停止内容流水线
     */
    stopPipeline(): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * 获取流水线状态
     */
    getPipelineStatus(): Promise<{
        running: boolean;
        status: string;
    }>;
    /**
     * 获取所有笔记
     */
    getNotes(category?: string): Promise<any[]>;
    /**
     * 获取笔记详情
     */
    getNoteById(id: number): Promise<any>;
    /**
     * 添加笔记
     */
    addNote(note: {
        title: string;
        content?: string;
        category?: string;
        tags?: string[];
    }): Promise<{
        title: string;
        content?: string;
        category?: string;
        tags?: string[];
        id: any;
    }>;
    /**
     * 更新笔记
     */
    updateNote(id: number, note: {
        title?: string;
        content?: string;
        category?: string;
        tags?: string[];
    }): Promise<void>;
    /**
     * 删除笔记
     */
    deleteNote(id: number): Promise<boolean>;
    /**
     * 获取笔记分类列表
     */
    getNoteCategories(): Promise<any[]>;
}
