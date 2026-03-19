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
    /**
     * 获取所有作品
     */
    getWorks(filter?: NovelFilter): Promise<any[]>;
    /**
     * 获取作品详情
     */
    getWorkById(id: number): Promise<any>;
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
     * 更新章节
     */
    updateChapter(id: number, data: {
        title?: string;
        content?: string;
        status?: string;
    }): Promise<void>;
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
     * 启动番茄发布
     */
    startFanqiePublish(options: any): Promise<{
        success: boolean;
        message: string;
        note: string;
    }>;
    /**
     * 获取经验记录
     */
    getExperienceRecords(): Promise<any[]>;
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
}
//# sourceMappingURL=novel-service.d.ts.map