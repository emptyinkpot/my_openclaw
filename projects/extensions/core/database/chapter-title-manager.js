"use strict";
/**
 * 章节标题管理器
 * 功能：
 * 1. 根据卷纲自动补充章节标题
 * 2. 确保不会出现没有标题的章节
 * 3. 完善大纲匹配功能
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChapterTitleManager = void 0;
exports.getChapterTitleManager = getChapterTitleManager;
const manager_1 = require("./manager");
const logger_1 = require("../../novel-manager/core/utils/logger");
/**
 * 章节标题管理器
 */
class ChapterTitleManager {
    constructor() {
        this.db = (0, manager_1.getDatabaseManager)();
    }
    /**
     * 自动补充所有缺失标题的章节
     */
    async autoFillAllMissingTitles() {
        logger_1.logger.info('[ChapterTitleManager] 开始自动补充章节标题...');
        const result = {
            total: 0,
            updated: 0,
            failed: 0
        };
        try {
            // 1. 获取所有作品（即使表不存在也继续）
            let works = [];
            try {
                works = await this.db.query('SELECT id, title FROM works');
            }
            catch (e) {
                logger_1.logger.warn('[ChapterTitleManager] works 表可能不存在，跳过');
                return result;
            }
            for (const work of works) {
                logger_1.logger.info(`[ChapterTitleManager] 处理作品: ${work.title} (ID: ${work.id})`);
                // 2. 获取该作品的卷纲（表不存在时返回空数组）
                let volumes = [];
                try {
                    volumes = await this.getVolumesForWork(work.id);
                }
                catch (e) {
                    // 表不存在，继续使用空数组
                }
                // 3. 获取该作品的所有章节
                let chapters = [];
                try {
                    chapters = await this.getChaptersForWork(work.id);
                }
                catch (e) {
                    logger_1.logger.warn(`[ChapterTitleManager] 作品 ${work.id} 的 chapters 表访问失败`);
                    continue;
                }
                // 4. 对每个章节补充标题
                for (const chapter of chapters) {
                    result.total++;
                    if (!chapter.title || chapter.title.trim() === '') {
                        try {
                            const success = await this.autoFillChapterTitle(work.id, chapter.chapterNumber, volumes);
                            if (success) {
                                result.updated++;
                                logger_1.logger.info(`  ✅ 第${chapter.chapterNumber}章 - 标题已补充`);
                            }
                            else {
                                result.failed++;
                                logger_1.logger.warn(`  ⚠️  第${chapter.chapterNumber}章 - 标题补充失败`);
                            }
                        }
                        catch (e) {
                            result.failed++;
                            logger_1.logger.error(`  ❌ 第${chapter.chapterNumber}章 - 错误: ${e}`);
                        }
                    }
                }
            }
            logger_1.logger.info(`[ChapterTitleManager] 完成！总计: ${result.total}, 更新: ${result.updated}, 失败: ${result.failed}`);
            return result;
        }
        catch (error) {
            logger_1.logger.error('[ChapterTitleManager] 自动补充失败:', error);
            // 不抛出错误，避免影响启动
            return result;
        }
    }
    /**
     * 自动补充单个章节的标题
     */
    async autoFillChapterTitle(workId, chapterNumber, volumes) {
        // 1. 如果没有传入卷纲，先获取
        if (!volumes) {
            volumes = await this.getVolumesForWork(workId);
        }
        // 2. 查找该章节对应的卷纲
        const volume = this.findVolumeForChapter(chapterNumber, volumes);
        // 3. 查找该章节的大纲
        const chapterOutline = await this.getChapterOutline(workId, chapterNumber);
        // 4. 生成标题
        let title = '';
        // 优先级1：章节大纲标题
        if (chapterOutline?.title) {
            title = chapterOutline.title;
        }
        // 优先级2：根据卷纲 + 章节号生成
        else if (volume) {
            title = this.generateTitleByVolume(volume, chapterNumber);
        }
        // 优先级3：默认标题
        else {
            title = `第${chapterNumber}章`;
        }
        // 5. 更新数据库
        if (title && title.trim() !== '') {
            await this.db.execute('UPDATE chapters SET title = ?, updated_at = NOW() WHERE work_id = ? AND chapter_number = ?', [title, workId, chapterNumber]);
            return true;
        }
        return false;
    }
    /**
     * 根据卷纲生成标题
     */
    generateTitleByVolume(volume, chapterNumber) {
        // 计算该章节在卷中的序号
        const startChapter = this.getVolumeStartChapter(volume);
        const chapterInVolume = chapterNumber - startChapter + 1;
        if (volume.title) {
            return `${volume.title} - 第${chapterInVolume}章`;
        }
        return `第${volume.volumeNumber}卷 - 第${chapterInVolume}章`;
    }
    /**
     * 完善大纲匹配功能
     */
    async improveOutlineMatching(workId) {
        logger_1.logger.info(`[ChapterTitleManager] 完善作品 ${workId} 的大纲匹配...`);
        const result = {
            total: 0,
            matched: 0,
            improved: 0
        };
        try {
            // 1. 获取所有章节
            const chapters = await this.getChaptersForWork(workId);
            // 2. 获取所有章节大纲
            const chapterOutlines = await this.getChapterOutlinesForWork(workId);
            // 3. 创建大纲映射
            const outlineMap = new Map();
            chapterOutlines.forEach(outline => {
                outlineMap.set(outline.chapterNumber, outline);
            });
            for (const chapter of chapters) {
                result.total++;
                const outline = outlineMap.get(chapter.chapterNumber);
                if (outline) {
                    result.matched++;
                    // 检查是否需要改进
                    const needsImprovement = this.checkIfNeedsImprovement(chapter, outline);
                    if (needsImprovement) {
                        await this.improveChapterOutlineMatch(chapter, outline);
                        result.improved++;
                        logger_1.logger.info(`  ✅ 第${chapter.chapterNumber}章 - 大纲匹配已完善`);
                    }
                }
            }
            logger_1.logger.info(`[ChapterTitleManager] 大纲匹配完善完成！总计: ${result.total}, 已匹配: ${result.matched}, 已完善: ${result.improved}`);
            return result;
        }
        catch (error) {
            logger_1.logger.error('[ChapterTitleManager] 大纲匹配完善失败:', error);
            throw error;
        }
    }
    // ============== 辅助方法 ==============
    async getVolumesForWork(workId) {
        try {
            const rows = await this.db.query('SELECT * FROM volume_outlines WHERE work_id = ? ORDER BY volume_number', [workId]);
            return rows;
        }
        catch (e) {
            // 表不存在，返回空数组
            return [];
        }
    }
    async getChaptersForWork(workId) {
        try {
            const rows = await this.db.query('SELECT id, work_id, chapter_number, title, content FROM chapters WHERE work_id = ? ORDER BY chapter_number', [workId]);
            return rows.map((row) => ({
                id: row.id,
                workId: row.work_id,
                chapterNumber: row.chapter_number,
                title: row.title,
                content: row.content
            }));
        }
        catch (e) {
            // 表不存在，返回空数组
            return [];
        }
    }
    async getChapterOutline(workId, chapterNumber) {
        try {
            const row = await this.db.queryOne('SELECT * FROM chapter_outlines WHERE work_id = ? AND chapter_number = ?', [workId, chapterNumber]);
            return row;
        }
        catch (e) {
            // 表不存在，返回 null
            return null;
        }
    }
    async getChapterOutlinesForWork(workId) {
        try {
            const rows = await this.db.query('SELECT * FROM chapter_outlines WHERE work_id = ? ORDER BY chapter_number', [workId]);
            return rows;
        }
        catch (e) {
            // 表不存在，返回空数组
            return [];
        }
    }
    findVolumeForChapter(chapterNumber, volumes) {
        // 假设卷纲是按顺序排列的，每卷有 chapterCount 章
        let currentStart = 1;
        for (const volume of volumes) {
            const currentEnd = currentStart + (volume.chapterCount || 10) - 1;
            if (chapterNumber >= currentStart && chapterNumber <= currentEnd) {
                return volume;
            }
            currentStart = currentEnd + 1;
        }
        return null;
    }
    getVolumeStartChapter(volume) {
        // 简单实现：第1卷从第1章开始，第2卷从第11章开始，依此类推
        return (volume.volumeNumber - 1) * 10 + 1;
    }
    checkIfNeedsImprovement(chapter, outline) {
        // 检查是否需要改进匹配
        // 1. 章节有内容但大纲没有 summary
        if (chapter.content && !outline.summary) {
            return true;
        }
        // 2. 章节有标题但大纲没有标题
        if (chapter.title && !outline.title) {
            return true;
        }
        return false;
    }
    async improveChapterOutlineMatch(chapter, outline) {
        const updates = [];
        const params = [];
        // 1. 如果章节有标题但大纲没有，同步标题
        if (chapter.title && !outline.title) {
            updates.push('title = ?');
            params.push(chapter.title);
        }
        // 2. 如果章节有内容但大纲没有摘要，生成摘要
        if (chapter.content && !outline.summary) {
            const summary = this.generateSummaryFromContent(chapter.content);
            updates.push('summary = ?');
            params.push(summary);
        }
        if (updates.length > 0) {
            params.push(outline.workId);
            params.push(outline.chapterNumber);
            await this.db.execute(`UPDATE chapter_outlines SET ${updates.join(', ')}, updated_at = NOW() WHERE work_id = ? AND chapter_number = ?`, params);
        }
    }
    generateSummaryFromContent(content) {
        // 简单实现：取前200字作为摘要
        const cleanContent = content.replace(/\s+/g, ' ').trim();
        return cleanContent.slice(0, 200) + (cleanContent.length > 200 ? '...' : '');
    }
}
exports.ChapterTitleManager = ChapterTitleManager;
// 单例
let managerInstance = null;
function getChapterTitleManager() {
    if (!managerInstance) {
        managerInstance = new ChapterTitleManager();
    }
    return managerInstance;
}
//# sourceMappingURL=chapter-title-manager.js.map
