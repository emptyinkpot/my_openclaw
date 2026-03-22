/**
 * 章节标题管理器
 * 功能：
 * 1. 根据卷纲自动补充章节标题
 * 2. 确保不会出现没有标题的章节
 * 3. 完善大纲匹配功能
 */
export interface VolumeOutline {
    id: number;
    workId: number;
    volumeNumber: number;
    title: string;
    description?: string;
    chapterCount: number;
}
export interface ChapterOutline {
    id: number;
    workId: number;
    chapterNumber: number;
    title?: string;
    summary?: string;
    keyEvents?: string;
    volumeId?: number;
}
export interface Chapter {
    id: number;
    workId: number;
    chapterNumber: number;
    title?: string;
    content?: string;
}
/**
 * 章节标题管理器
 */
export declare class ChapterTitleManager {
    private db;
    /**
     * 自动补充所有缺失标题的章节
     */
    autoFillAllMissingTitles(): Promise<{
        total: number;
        updated: number;
        failed: number;
    }>;
    /**
     * 自动补充单个章节的标题
     */
    autoFillChapterTitle(workId: number, chapterNumber: number, volumes?: VolumeOutline[]): Promise<boolean>;
    /**
     * 根据卷纲生成标题
     */
    private generateTitleByVolume;
    /**
     * 完善大纲匹配功能
     */
    improveOutlineMatching(workId: number): Promise<{
        total: number;
        matched: number;
        improved: number;
    }>;
    private getVolumesForWork;
    private getChaptersForWork;
    private getChapterOutline;
    private getChapterOutlinesForWork;
    private findVolumeForChapter;
    private getVolumeStartChapter;
    private checkIfNeedsImprovement;
    private improveChapterOutlineMatch;
    private generateSummaryFromContent;
}
export declare function getChapterTitleManager(): ChapterTitleManager;
