/**
 * PublishAutoService - 自动发布服务
 * 
 * 自动发布状态为 `audited`（已审核）的章节到番茄小说
 * 
 * @module publish-auto
 */

import { logger } from '../../plugins/novel-manager/utils/logger';
import { getDatabaseManager } from '../database';
import { getActivityLog, ActivityLog } from '../smart-scheduler';
import { FanqieSimplePipeline } from './FanqieSimplePipeline';
import { getChapterRepository } from './ChapterRepository';
import { getConfig } from '../config';

export interface PublishAutoServiceStatus {
  running: boolean;
  lastRunTime: string | null;
  currentTask: string | null;
  processedCount: number;
  errorCount: number;
}

export interface PublishAutoServiceConfig {
  enabled: boolean;
  processInterval: number; // 处理间隔（秒）
  maxChaptersPerRun: number; // 每次最多处理的章节数
  headless: boolean; // 是否无头模式
  dryRun: boolean; // 是否模拟模式
}

export class PublishAutoService {
  private activityLog: ActivityLog;
  private chapterRepository: any;
  
  private running = false;
  private timer: NodeJS.Timeout | null = null;
  private lastRunTime: Date | null = null;
  private currentTask: string | null = null;
  private processedCount = 0;
  private errorCount = 0;
  private isProcessing = false; // 并发锁：防止同时执行多个处理流程
  private chapterLocks = new Set<number>(); // 章节级别的锁
  private readonly MAX_PARALLEL_WORKS = 1; // 发布服务一次只处理一个作品
  private config: PublishAutoServiceConfig = {
    enabled: false,
    processInterval: 300, // 默认 5 分钟
    maxChaptersPerRun: 1,
    headless: true,
    dryRun: false
  };

  constructor() {
    this.activityLog = getActivityLog();
    this.chapterRepository = getChapterRepository();
  }

  /**
   * 获取当前状态
   */
  getStatus(): PublishAutoServiceStatus {
    return {
      running: this.running,
      lastRunTime: this.lastRunTime?.toISOString() || null,
      currentTask: this.currentTask,
      processedCount: this.processedCount,
      errorCount: this.errorCount
    };
  }

  /**
   * 获取配置
   */
  getConfig(): PublishAutoServiceConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<PublishAutoServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('[PublishAutoService] 配置已更新:', this.config);
    
    // 如果启用状态改变，重启服务
    if (newConfig.enabled !== undefined && newConfig.enabled !== this.running) {
      if (newConfig.enabled) {
        this.start();
      } else {
        this.stop();
      }
    } else if (newConfig.processInterval !== undefined && this.running) {
      // 如果只是间隔改变，重启定时器
      this.restartTimer();
    }
  }

  /**
   * 启动自动发布服务
   */
  start(): void {
    if (this.running) {
      logger.warn('[PublishAutoService] 服务已在运行中');
      return;
    }

    this.running = true;
    this.config.enabled = true;
    this.isProcessing = false; // 重置处理标志
    logger.info('[PublishAutoService] 自动发布服务已启动');
    this.activityLog.logPublishServiceStart();
    
    // 启动定时处理（不立即执行，避免重复）
    this.startTimer();
    
    // 延迟一小会儿后执行第一次处理
    setTimeout(() => {
      this.processChapters();
    }, 2000);
  }

  /**
   * 停止自动发布服务
   */
  stop(): void {
    if (!this.running) {
      logger.warn('[PublishAutoService] 服务未在运行');
      return;
    }

    this.running = false;
    this.config.enabled = false;
    this.stopTimer();
    logger.info('[PublishAutoService] 自动发布服务已停止');
    this.activityLog.logPublishServiceStop();
  }

  /**
   * 启动定时器
   */
  private startTimer(): void {
    this.stopTimer();
    
    this.timer = setInterval(() => {
      this.processChapters();
    }, this.config.processInterval * 1000);
    
    logger.info(`[PublishAutoService] 定时器已启动，间隔: ${this.config.processInterval}秒`);
  }

  /**
   * 停止定时器
   */
  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * 重启定时器
   */
  private restartTimer(): void {
    this.stopTimer();
    if (this.running) {
      this.startTimer();
    }
  }

  /**
   * 辅助函数：按属性分组
   */
  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((result, item) => {
      const groupKey = String(item[key]);
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    }, {} as Record<string, T[]>);
  }

  /**
   * 处理单个章节
   */
  private async processSingleChapter(chapter: any): Promise<void> {
    // 检查章节锁
    if (this.chapterLocks.has(chapter.id)) {
      logger.info(`[PublishAutoService] 章节 ${chapter.id} 已在处理中，跳过`);
      return;
    }
    
    // 加章节锁
    this.chapterLocks.add(chapter.id);
    
    try {
      this.currentTask = `正在发布章节: ${chapter.title || chapter.chapter_number}`;
      logger.info(`[PublishAutoService] ${this.currentTask}`);
      this.activityLog.logChapterPublishStart(
        chapter.work_id,
        chapter.work_title || '未知作品',
        chapter.chapter_number,
        chapter.title,
        '番茄小说',
        '自动'
      );
      
      // 使用 FanqieSimplePipeline 发布章节
      const pipeline = new FanqieSimplePipeline();
      const startTime = Date.now();
      
      const results = await pipeline.publishToFanqie({
        workId: chapter.work_id,
        chapterNumber: chapter.chapter_number,
        headless: this.config.headless,
        dryRun: this.config.dryRun,
        onProgress: (event) => {
          logger.info(`[PublishAutoService] [发布进度] ${event.stepLabel}: ${event.task} (${event.percent}%)`);
          this.activityLog.log('publish', `[发布] ${event.stepLabel}: ${event.task}`);
        }
      });
      
      const duration = Date.now() - startTime;
      
      if (results.length > 0 && results[0].success) {
        this.processedCount++;
        logger.info(`[PublishAutoService] 章节发布成功: ${chapter.title || chapter.chapter_number}`);
        this.activityLog.logChapterPublishSuccess(
          chapter.work_id,
          chapter.work_title || '未知作品',
          chapter.chapter_number,
          chapter.title,
          duration,
          '番茄小说',
          '自动'
        );
      } else {
        throw new Error(results.length > 0 ? results[0].error || '发布失败' : '发布失败');
      }
      
    } catch (error: any) {
      this.errorCount++;
      logger.error(`[PublishAutoService] 章节发布失败: ${chapter.title || chapter.chapter_number}`, error.message);
      this.activityLog.logChapterPublishError(
        chapter.work_id,
        chapter.work_title || '未知作品',
        chapter.chapter_number,
        error.message,
        chapter.title,
        '番茄小说',
        '自动'
      );
    } finally {
      // 释放章节锁
      this.chapterLocks.delete(chapter.id);
    }
  }

  /**
   * 处理章节
   */
  private async processChapters(): Promise<void> {
    // 检查是否正在运行
    if (!this.running) {
      return;
    }

    // 检查是否已经在处理中（并发锁）
    if (this.isProcessing) {
      logger.info('[PublishAutoService] 上一次处理尚未完成，跳过本次执行');
      return;
    }

    // 加锁
    this.isProcessing = true;

    try {
      this.lastRunTime = new Date();
      logger.info('[PublishAutoService] 开始处理发布...');
      this.activityLog.log('progress', '自动发布开始检查待发布章节...');
      
      // 获取需要发布的章节
      const chaptersToPublish = await this.getChaptersToPublish();
      
      if (chaptersToPublish.length === 0) {
        logger.info('[PublishAutoService] 没有需要发布的章节');
        this.activityLog.log('progress', '没有需要发布的章节，等待中...');
        this.currentTask = null;
        return;
      }

      logger.info(`[PublishAutoService] 找到 ${chaptersToPublish.length} 个需要发布的章节`);
      this.activityLog.log('progress', `找到 ${chaptersToPublish.length} 个需要发布的章节`);
      
      // 按作品分组
      const chaptersByWork = this.groupBy(chaptersToPublish, 'work_id');
      const workIds = Object.keys(chaptersByWork);
      
      logger.info(`[PublishAutoService] 涉及 ${workIds.length} 个作品，将逐个处理`);
      
      // 逐个作品处理，确保顺序
      for (const workId of workIds) {
        const chapters = chaptersByWork[workId];
        // 单个作品内的章节串行处理
        for (const chapter of chapters) {
          await this.processSingleChapter(chapter);
        }
      }
      
      this.currentTask = null;
      logger.info('[PublishAutoService] 发布处理完成');
    } catch (error: any) {
      this.errorCount++;
      logger.error('[PublishAutoService] 处理过程出错:', error.message);
      this.activityLog.log('error', `处理过程出错: ${error.message}`);
      this.currentTask = null;
    } finally {
      // 释放锁
      this.isProcessing = false;
    }
  }

  /**
   * 获取需要发布的章节
   */
  private async getChaptersToPublish(): Promise<any[]> {
    try {
      const db = getDatabaseManager();
      
      // 查询状态为 audited 的章节
      // 优先按作品序号（work_id）升序，再按章节序号（chapter_number）升序
      const limit = Math.max(1, Math.min(10, this.config.maxChaptersPerRun));
      const chapters = await db.query(`
        SELECT 
          c.id,
          c.work_id,
          w.title as work_title,
          c.chapter_number,
          c.title
        FROM chapters c
        JOIN works w ON c.work_id = w.id
        WHERE c.status = 'audited'
        ORDER BY c.work_id ASC, c.chapter_number ASC
        LIMIT ${limit}
      `);
      
      return chapters;
    } catch (error: any) {
      logger.error('[PublishAutoService] 获取需要发布的章节失败:', error.message);
      this.activityLog.log('error', `获取章节失败: ${error.message}`);
      return [];
    }
  }
}

// 单例实例
let publishAutoServiceInstance: PublishAutoService | null = null;

export function getPublishAutoService(): PublishAutoService {
  if (!publishAutoServiceInstance) {
    publishAutoServiceInstance = new PublishAutoService();
  }
  return publishAutoServiceInstance;
}
