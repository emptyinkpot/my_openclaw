"use strict";
/**
 * 发布服务
 * 处理小说内容发布到各种平台
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublishService = void 0;
const database_1 = require("../database");
const config_1 = require("../config");
const logger_1 = require("../../utils/logger");
const FanqiePublisher_1 = require("./FanqiePublisher");
class PublishService {
    constructor() {
        this.platforms = new Map();
        this.db = (0, database_1.getDatabaseManager)();
        this.loadPlatformsFromConfig();
    }
    loadPlatformsFromConfig() {
        // 从配置加载平台
    }
    registerPlatform(config) {
        this.platforms.set(config.name, config);
        logger_1.logger.info(`注册发布平台: ${config.name} (${config.type})`);
    }
    getPlatforms() {
        return Array.from(this.platforms.values());
    }
    async publish(options) {
        const startTime = Date.now();
        try {
            const chapter = await this.db.queryOne(`
        SELECT c.*, w.title as work_title 
        FROM chapters c 
        JOIN works w ON c.work_id = w.id 
        WHERE c.work_id = ? AND c.chapter_number = ?
      `, [options.workId, options.chapterNumber]);
            if (!chapter) {
                return {
                    success: false, platform: options.platform,
                    chapterNumber: options.chapterNumber, error: '章节不存在', retryable: false,
                };
            }
            if (!chapter.content || chapter.content.length < 100) {
                return {
                    success: false, platform: options.platform,
                    chapterNumber: options.chapterNumber, error: '章节内容不足', retryable: false,
                };
            }
            if (options.dryRun) {
                logger_1.logger.info(`[DRY RUN] 将发布: ${chapter.work_title} 第${options.chapterNumber}章到 ${options.platform}`);
                return {
                    success: true, platform: options.platform,
                    chapterNumber: options.chapterNumber,
                    publishedAt: new Date().toISOString(),
                    url: `https://example.com/${options.platform}/${options.workId}/${options.chapterNumber}`,
                };
            }
            const result = await this.doPublish(chapter, options);
            if (result.success) {
                await this.db.execute(`
          UPDATE chapters SET status = 'published', published_at = NOW() 
          WHERE work_id = ? AND chapter_number = ?
        `, [options.workId, options.chapterNumber]);
            }
            const duration = Date.now() - startTime;
            logger_1.logger.info(`发布完成: ${chapter.work_title} 第${options.chapterNumber}章, 耗时${duration}ms`);
            return result;
        }
        catch (error) {
            logger_1.logger.error('发布失败:', error);
            return {
                success: false, platform: options.platform,
                chapterNumber: options.chapterNumber, error: error.message,
                retryable: this.isRetryableError(error),
            };
        }
    }
    async doPublish(chapter, options) {
        if (options.platform === 'fanqie') {
            return await this.publishToFanqie(chapter, options);
        }
        return {
            success: false, platform: options.platform,
            chapterNumber: options.chapterNumber, error: `平台 ${options.platform} 尚未实现`,
            retryable: false,
        };
    }
    async publishToFanqie(chapter, options) {
        const config = (0, config_1.getConfig)();
        const accounts = config.scheduler.fanqieAccounts;
        if (!accounts || accounts.length === 0) {
            return {
                success: false, platform: 'fanqie',
                chapterNumber: options.chapterNumber, error: '未配置番茄账号', retryable: false,
            };
        }
        const account = accounts[0];
        const publisher = new FanqiePublisher_1.FanqiePublisher();
        const chapterData = {
            workId: chapter.work_id,
            workTitle: chapter.work_title,
            chapterNumber: chapter.chapter_number,
            chapterTitle: chapter.title || `第${chapter.chapter_number}章`,
            content: chapter.content,
            wordCount: chapter.word_count || chapter.content?.length || 0,
        };
        logger_1.logger.info(`[发布] 开始发布到番茄: ${chapter.work_title} 第${chapter.chapter_number}章`);
        try {
            const result = await publisher.publishChapter(chapterData, account, {
                headless: options.headless ?? true
            });
            return {
                success: result.success, platform: 'fanqie',
                chapterNumber: options.chapterNumber, publishedAt: result.publishedAt,
                error: result.error,
                retryable: result.error === 'CHAPTER_NOT_CONTINUOUS' ? false : true,
            };
        }
        catch (error) {
            return {
                success: false, platform: 'fanqie',
                chapterNumber: options.chapterNumber, error: error.message, retryable: true,
            };
        }
    }
    async batchPublish(workId, chapterNumbers, platform) {
        const results = [];
        for (const chapterNumber of chapterNumbers) {
            const result = await this.publish({ workId, chapterNumber, platform });
            results.push(result);
            if (results.length < chapterNumbers.length) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        return results;
    }
    isRetryableError(error) {
        const msg = error.message.toLowerCase();
        return msg.includes('timeout') || msg.includes('econnrefused') ||
            msg.includes('econnreset') || msg.includes('503') || msg.includes('502');
    }
    async getPublishStats(workId) {
        const result = await this.db.queryOne(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published,
        SUM(CASE WHEN status != 'published' THEN 1 ELSE 0 END) as pending
      FROM chapters WHERE work_id = ?
    `, [workId]);
        return {
            total: parseInt(result?.total || '0'),
            published: parseInt(result?.published || '0'),
            pending: parseInt(result?.pending || '0'),
        };
    }
}
exports.PublishService = PublishService;
//# sourceMappingURL=PublishService.js.map