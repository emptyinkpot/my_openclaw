
/**
 * 审核自动处理服务
 * 
 * 自动处理章节审核：
 * - 自动审核状态为 `polished`（润色完成）的章节，审核通过后标记为 `audited`
 * - 支持自动修复可修复的问题
 * 
 * @module audit-auto
 */

import { logger } from '../utils/logger';
import { NovelService } from '../../backend/services/novel-service';
import { getDatabaseManager } from '../../../core/database';
import { ChapterStatus } from '../state-machine';
import { auditChapter, autoFixChapter } from './service';
import { updateChapterContent, updateChapterStatus } from './repository';
import { autoFixAll } from './rules';
import { getActivityLog, ActivityLog } from '../smart-scheduler';

export interface AuditAutoServiceStatus {
  running: boolean;
  lastRunTime: string | null;
  currentTask: string | null;
  processedCount: number;
  errorCount: number;
}

export interface AuditAutoServiceConfig {
  enabled: boolean;
  processInterval: number; // 处理间隔（秒）
  maxChaptersPerRun: number; // 每次最多处理的章节数
  autoFix: boolean; // 是否自动修复可修复的问题
}

export class AuditAutoService {
  private novelService: NovelService;
  private activityLog: ActivityLog;
  
  private running = false;
  private timer: NodeJS.Timeout | null = null;
  private lastRunTime: Date | null = null;
  private currentTask: string | null = null;
  private processedCount = 0;
  private errorCount = 0;
  private isProcessing = false; // 并发锁：防止同时执行多个处理流程
  private config: AuditAutoServiceConfig = {
    enabled: false,
    processInterval: 60, // 默认 60 秒
    maxChaptersPerRun: 3,
    autoFix: true // 默认自动修复
  };

  constructor() {
    this.novelService = new NovelService();
    this.activityLog = getActivityLog();
  }

  /**
   * 获取当前状态
   */
  getStatus(): AuditAutoServiceStatus {
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
  getConfig(): AuditAutoServiceConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<AuditAutoServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('[AuditAutoService] 配置已更新:', this.config);
    
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
   * 启动自动审核服务
   */
  start(): void {
    if (this.running) {
      logger.warn('[AuditAutoService] 服务已在运行中');
      return;
    }

    this.running = true;
    this.config.enabled = true;
    this.isProcessing = false; // 重置处理标志
    logger.info('[AuditAutoService] 自动审核服务已启动');
    
    // 启动定时处理（不立即执行，避免重复）
    this.startTimer();
    
    // 延迟一小会儿后执行第一次处理
    setTimeout(() => {
      this.processChapters();
    }, 2000);
  }

  /**
   * 停止自动审核服务
   */
  stop(): void {
    if (!this.running) {
      logger.warn('[AuditAutoService] 服务未在运行');
      return;
    }

    this.running = false;
    this.config.enabled = false;
    this.stopTimer();
    logger.info('[AuditAutoService] 自动审核服务已停止');
  }

  /**
   * 启动定时器
   */
  private startTimer(): void {
    this.stopTimer();
    
    this.timer = setInterval(() => {
      this.processChapters();
    }, this.config.processInterval * 1000);
    
    logger.info(`[AuditAutoService] 定时器已启动，间隔: ${this.config.processInterval}秒`);
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
   * 处理章节
   */
  private async processChapters(): Promise<void> {
    // 检查是否正在运行
    if (!this.running) {
      return;
    }

    // 检查是否已经在处理中（并发锁）
    if (this.isProcessing) {
      logger.info('[AuditAutoService] 上一次处理尚未完成，跳过本次执行');
      return;
    }

    // 加锁
    this.isProcessing = true;

    try {
      this.lastRunTime = new Date();
      logger.info('[AuditAutoService] 开始处理章节审核...');
      this.activityLog.log('progress', '审核服务开始检查待审核章节...');
      
      // 获取需要处理的章节
      const chaptersToProcess = await this.getChaptersToProcess();
      
      if (chaptersToProcess.length === 0) {
        logger.info('[AuditAutoService] 没有需要审核的章节');
        this.activityLog.log('progress', '没有需要审核的章节，等待中...');
        this.currentTask = null;
        return;
      }

      logger.info(`[AuditAutoService] 找到 ${chaptersToProcess.length} 个需要审核的章节`);
      this.activityLog.log('progress', `找到 ${chaptersToProcess.length} 个需要审核的章节`);
      
      // 只处理第一个章节（确保串行，避免并发问题）
      const chapter = chaptersToProcess[0];
      
      try {
        this.currentTask = `正在审核章节: ${chapter.title || chapter.chapter_number}`;
        logger.info(`[AuditAutoService] ${this.currentTask}`);
        this.activityLog.log('progress', `开始审核第 ${chapter.chapter_number} 章: ${chapter.title || '无标题'}`);
        
        await this.auditChapter(chapter.work_id, chapter.chapter_number);
        
        this.processedCount++;
        logger.info(`[AuditAutoService] 章节审核完成: ${chapter.title || chapter.chapter_number}`);
        this.activityLog.log('completed', `第 ${chapter.chapter_number} 章审核完成`);
      } catch (error: any) {
        this.errorCount++;
        logger.error(`[AuditAutoService] 章节审核失败: ${chapter.title || chapter.chapter_number}`, error.message);
        this.activityLog.log('error', `第 ${chapter.chapter_number} 章审核失败: ${error.message}`);
      }
      
      this.currentTask = null;
      logger.info('[AuditAutoService] 章节审核处理完成');
    } catch (error: any) {
      this.errorCount++;
      logger.error('[AuditAutoService] 审核处理过程出错:', error.message);
      this.activityLog.log('error', `审核处理过程出错: ${error.message}`);
      this.currentTask = null;
    } finally {
      // 释放锁
      this.isProcessing = false;
    }
  }

  /**
   * 获取需要审核的章节
   */
  private async getChaptersToProcess(): Promise<any[]> {
    try {
      // 直接查询数据库，不依赖 novelService
      const db = getDatabaseManager();
      
      // 直接查询状态为 polished 的章节
      const limit = Math.max(1, Math.min(10, this.config.maxChaptersPerRun));
      const chapters = await db.query(`
        SELECT * FROM chapters 
        WHERE status = 'polished'
        ORDER BY updated_at ASC
        LIMIT ${limit}
      `);
      
      logger.info(`[AuditAutoService] 找到 ${chapters.length} 个需要审核的章节`);
      this.activityLog.log('progress', `找到 ${chapters.length} 个需要审核的章节`);
      
      return chapters;
    } catch (error: any) {
      logger.error('[AuditAutoService] 获取需要审核的章节失败:', error.message);
      this.activityLog.log('error', `获取审核章节失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 审核单个章节（完整流程）
   */
  private async auditChapter(workId: number, chapterNumber: number): Promise<void> {
    logger.info(`[AuditAutoService] 审核章节 (workId: ${workId}, chapterNumber: ${chapterNumber})`);
    this.activityLog.log('auditing', `开始审核第 ${chapterNumber} 章内容`);
    
    const db = getDatabaseManager();
    
    // 1. 执行审核
    const auditResult = await auditChapter(workId, chapterNumber);
    this.activityLog.log('progress', `审核发现 ${auditResult.issues.length} 个问题`);
    
    let finalContent: string | null = null;
    let auditPassed = auditResult.status === 'passed';
    
    // 2. 如果开启了自动修复，并且审核失败或有问题，执行完整自动修复
    if (this.config.autoFix && (!auditPassed || auditResult.issues.length > 0)) {
      logger.info(`[AuditAutoService] 自动修复章节 (workId: ${workId}, chapterNumber: ${chapterNumber})`);
      this.activityLog.log('fixing', `开始自动修复第 ${chapterNumber} 章内容`);
      
      // 获取原始内容
      const chapter = await db.queryOne(
        'SELECT content FROM chapters WHERE work_id = ? AND chapter_number = ?', 
        [workId, chapterNumber]
      );
      
      if (chapter && chapter.content) {
        // 执行完整自动修复
        finalContent = autoFixAll(chapter.content);
        
        if (finalContent !== chapter.content) {
          // 更新审核后的内容到 MySQL
          await updateChapterContent(workId, chapterNumber, finalContent);
          logger.info(`[AuditAutoService] 审核后内容已替换到 MySQL (workId: ${workId}, chapterNumber: ${chapterNumber})`);
          auditPassed = true; // 修复后视为审核通过
          this.activityLog.log('progress', `第 ${chapterNumber} 章自动修复完成`);
        }
      }
    }
    
    // 3. 如果审核通过或已自动修复，更新状态为 audited（只有这个流程能赋予此状态）
    if (auditPassed) {
      logger.info(`[AuditAutoService] 审核通过，更新状态为 audited (workId: ${workId}, chapterNumber: ${chapterNumber})`);
      await updateChapterStatus(workId, chapterNumber, 'audited');
      this.activityLog.log('completed', `第 ${chapterNumber} 章审核通过，状态更新为 audited`);
    }
    
    logger.info(`[AuditAutoService] 章节审核完成 (workId: ${workId}, chapterNumber: ${chapterNumber})`);
  }
}

// 单例实例
let auditAutoServiceInstance: AuditAutoService | null = null;

export function getAuditAutoService(): AuditAutoService {
  if (!auditAutoServiceInstance) {
    auditAutoServiceInstance = new AuditAutoService();
  }
  return auditAutoServiceInstance;
}

