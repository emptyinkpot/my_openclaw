/**
 * PublishAutoService - 自动发布服务
 * 
 * 正确的发布逻辑：
 * 1. 先去番茄获取所有作品及最新章节
 * 2. 对每个作品，计算下一章（最新章节 + 1）
 * 3. 去数据库查该章节是否存在且状态为 'audited'
 * 4. 满足条件才执行发布
 * 
 * @module publish-auto
 */

import { logger } from '../utils/logger';
import { getDatabaseManager } from '../../../core/database';
import { getActivityLog, ActivityLog } from '../smart-scheduler';
import { FanqieSimplePipeline } from './FanqieSimplePipeline';
import { getChapterRepository } from './ChapterRepository';
import { getConfig } from '../../../core/config';
import { FanqiePublisher, FanqieAccount } from './FanqiePublisher';

export interface PublishAutoServiceStatus {
  running: boolean;
  lastRunTime: string | null;
  currentTask: string | null;
  processedCount: number;
  errorCount: number;
  missingWorksCount: number;
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
  private missingWorksCache = new Set<string>(); // 缓存番茄中不存在的作品，避免重复检查
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
      errorCount: this.errorCount,
      missingWorksCount: this.missingWorksCache.size
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
   * 清除不存在作品的缓存
   * 让用户可以手动刷新，重新检查作品是否存在
   */
  clearMissingWorksCache(): void {
    const count = this.missingWorksCache.size;
    this.missingWorksCache.clear();
    logger.info(`[PublishAutoService] 已清除 ${count} 个不存在作品的缓存`);
    this.activityLog.log('system', `已清除 ${count} 个不存在作品的缓存，将重新检查`);
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
   * 在本地数据库中查找匹配的作品
   */
  private async findLocalWorkByTitle(fanqieTitle: string): Promise<any> {
    try {
      const db = getDatabaseManager();
      
      // 先尝试精确匹配
      let works = await db.query(`
        SELECT id, title FROM works WHERE title = ?
      `, [fanqieTitle]);
      
      if (works && works.length > 0) {
        return works[0];
      }
      
      // 尝试包含匹配
      works = await db.query(`
        SELECT id, title FROM works WHERE title LIKE ? OR ? LIKE CONCAT('%', title, '%')
      `, [`%${fanqieTitle}%`, fanqieTitle]);
      
      if (works && works.length > 0) {
        return works[0];
      }
      
      // 清理标点符号后匹配
      const cleanFanqieTitle = fanqieTitle.replace(/[？?！!。，,、]/g, '');
      works = await db.query(`
        SELECT id, title FROM works 
        WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(title, '？', ''), '?', ''), '！', ''), '!', ''), '。', ''), '，', '') = ?
      `, [cleanFanqieTitle]);
      
      if (works && works.length > 0) {
        return works[0];
      }
      
      return null;
    } catch (error: any) {
      logger.error('[PublishAutoService] 查找本地作品失败:', error.message);
      return null;
    }
  }

  /**
   * 检查本地数据库中是否有特定章节且状态为 audited
   */
  private async checkLocalChapter(workId: number, chapterNumber: number): Promise<any> {
    try {
      const db = getDatabaseManager();
      
      const chapters = await db.query(`
        SELECT 
          c.id,
          c.work_id,
          w.title as work_title,
          c.chapter_number,
          c.title,
          c.status
        FROM chapters c
        JOIN works w ON c.work_id = w.id
        WHERE c.work_id = ? AND c.chapter_number = ? AND c.status = 'audited'
      `, [workId, chapterNumber]);
      
      if (chapters && chapters.length > 0) {
        return chapters[0];
      }
      
      return null;
    } catch (error: any) {
      logger.error('[PublishAutoService] 检查本地章节失败:', error.message);
      return null;
    }
  }

  /**
   * 处理单个章节
   */
  private async processSingleChapter(chapter: any, fanqieAccount: FanqieAccount): Promise<void> {
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
   * 获取今日计划
   */
  private async getTodayPlan(): Promise<Map<number, Set<number>>> {
    const db = getDatabaseManager();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    const plan = new Map<number, Set<number>>();
    
    try {
      const plans = await db.query(
        'SELECT work_id, chapter_number FROM daily_plans WHERE plan_date = ?',
        [todayStr]
      );
      
      plans.forEach((p: any) => {
        if (!plan.has(p.work_id)) {
          plan.set(p.work_id, new Set());
        }
        plan.get(p.work_id)!.add(p.chapter_number);
      });
      
      logger.info(`[PublishAutoService] 今日计划: ${plan.size} 个作品`);
    } catch (e) {
      logger.warn('[PublishAutoService] 获取今日计划失败:', e);
    }
    
    return plan;
  }

  /**
   * 处理章节（正确逻辑）
   * 
   * 1. 先去番茄获取所有作品及最新章节
   * 2. 获取今日计划
   * 3. 对每个作品，检查今日计划中的章节
   * 4. 只有在今日计划中、且状态为 'audited' 的章节才发布
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
      this.activityLog.log('progress', '🚀 自动发布开始检查...');
      
      // 获取今日计划
      const todayPlan = await this.getTodayPlan();
      
      // 获取配置
      const config = getConfig();
      const accounts = config.scheduler.fanqieAccounts;
      
      if (!accounts || accounts.length === 0) {
        logger.warn('[PublishAutoService] 未配置番茄账号');
        this.activityLog.log('warn', '未配置番茄账号');
        this.currentTask = null;
        return;
      }
      
      // 使用第一个账号
      const account = accounts[0];
      logger.info(`[PublishAutoService] 使用账号: ${account.name}`);
      this.activityLog.log('progress', `使用账号: ${account.name}`);
      
      // 步骤1: 从番茄获取所有作品及最新章节
      this.currentTask = '正在从番茄获取作品列表...';
      this.activityLog.log('progress', '正在登录番茄，获取作品列表...');
      const fanqiePublisher = new FanqiePublisher();
      const fanqieWorks = await fanqiePublisher.getAllFanqieWorksWithLatestChapters(account, this.config.headless);
      
      if (!fanqieWorks || fanqieWorks.length === 0) {
        logger.info('[PublishAutoService] 番茄中没有作品');
        this.activityLog.log('progress', '番茄中没有作品');
        this.currentTask = null;
        return;
      }
      
      logger.info(`[PublishAutoService] 从番茄获取到 ${fanqieWorks.length} 个作品`);
      this.activityLog.log('progress', `✅ 从番茄获取到 ${fanqieWorks.length} 个作品`);
      
      // 步骤2: 对每个番茄作品，查找本地匹配并检查今日计划中的章节
      const chaptersToPublish: any[] = [];
      
      for (const fanqieWork of fanqieWorks) {
        // 检查是否在缓存中标记为不存在
        const cacheKey = `fanqie-${fanqieWork.title}`;
        if (this.missingWorksCache.has(cacheKey)) {
          logger.info(`[PublishAutoService] 作品「${fanqieWork.title}」在缓存中，跳过`);
          this.activityLog.log('progress', `跳过作品「${fanqieWork.title}」（缓存中标记为不存在）`);
          continue;
        }
        
        this.currentTask = `正在检查作品「${fanqieWork.title}」...`;
        this.activityLog.log('progress', `正在检查作品「${fanqieWork.title}」...`);
        
        // 查找本地匹配的作品
        const localWork = await this.findLocalWorkByTitle(fanqieWork.title);
        
        if (!localWork) {
          logger.info(`[PublishAutoService] 本地没有找到匹配作品「${fanqieWork.title}」`);
          this.missingWorksCache.add(cacheKey);
          this.activityLog.log('warn', `作品「${fanqieWork.title}」本地无匹配，已加入跳过缓存`);
          continue;
        }
        
        logger.info(`[PublishAutoService] 本地找到匹配作品: ${localWork.title} (ID: ${localWork.id})`);
        this.activityLog.log('progress', `✅ 本地找到匹配作品: ${localWork.title}`);
        
        // 获取这个作品的今日计划
        const workPlan = todayPlan.get(localWork.id);
        if (!workPlan || workPlan.size === 0) {
          logger.info(`[PublishAutoService] 作品「${localWork.title}」今日无计划章节`);
          this.activityLog.log('progress', `作品「${localWork.title}」今日无计划章节，跳过`);
          continue;
        }
        
        logger.info(`[PublishAutoService] 作品「${localWork.title}」今日计划章节: ${Array.from(workPlan).join(', ')}`);
        this.activityLog.log('progress', `今日计划章节: ${Array.from(workPlan).join(', ')}`);
        
        // 检查今日计划中的每个章节
        for (const chapterNumber of workPlan) {
          // 检查本地是否有这一章且状态为 audited
          const chapter = await this.checkLocalChapter(localWork.id, chapterNumber);
          
          if (chapter) {
            logger.info(`[PublishAutoService] 找到待发布章节: 第${chapterNumber}章「${chapter.title}」`);
            this.activityLog.log('progress', `✅ 找到待发布章节: 第${chapterNumber}章「${chapter.title}」`);
            chaptersToPublish.push(chapter);
          } else {
            logger.info(`[PublishAutoService] 本地没有第${chapterNumber}章，或状态不是 audited`);
            this.activityLog.log('progress', `本地没有第${chapterNumber}章，或状态不是 audited，跳过`);
          }
          
          // 限制每次处理的章节数
          if (chaptersToPublish.length >= this.config.maxChaptersPerRun) {
            logger.info(`[PublishAutoService] 已达到最大处理数 ${this.config.maxChaptersPerRun}`);
            this.activityLog.log('progress', `已达到最大处理数 ${this.config.maxChaptersPerRun}`);
            break;
          }
        }
        
        // 限制每次处理的章节数
        if (chaptersToPublish.length >= this.config.maxChaptersPerRun) {
          break;
        }
      }
      
      if (chaptersToPublish.length === 0) {
        logger.info('[PublishAutoService] 没有需要发布的章节');
        this.activityLog.log('progress', '没有需要发布的章节，等待中...');
        this.currentTask = null;
        return;
      }
      
      logger.info(`[PublishAutoService] 找到 ${chaptersToPublish.length} 个需要发布的章节`);
      this.activityLog.log('progress', `🚀 找到 ${chaptersToPublish.length} 个需要发布的章节，开始发布...`);
      
      // 步骤3: 发布章节
      for (const chapter of chaptersToPublish) {
        await this.processSingleChapter(chapter, account);
      }
      
      this.currentTask = null;
      logger.info('[PublishAutoService] 发布处理完成');
      this.activityLog.log('progress', '✅ 发布处理完成');
    } catch (error: any) {
      this.errorCount++;
      logger.error('[PublishAutoService] 处理过程出错:', error.message);
      this.activityLog.log('error', `❌ 处理过程出错: ${error.message}`);
      this.currentTask = null;
    } finally {
      // 释放锁
      this.isProcessing = false;
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
