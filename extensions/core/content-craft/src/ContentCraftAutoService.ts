/**
 * ContentCraft 自动处理服务
 * 
 * 自动处理章节内容：
 * - 自动润色状态为 `first_draft`（初稿）的章节，完成后标记为 `polished`
 * - 自动生成状态为 `outline`（大纲）的章节，完成后标记为 `polished`
 * 
 * @module content-craft-auto
 */

import { logger } from '../../../plugins/novel-manager/utils/logger';
import { NovelService } from '../../../plugins/novel-manager/services/novel-service';
import { getDatabaseManager } from '../../../core/database';
import { ChapterStatus } from '../../../core/state-machine';
import { PolishPipeline } from './pipeline';
import { GenerationPipeline } from './generation-pipeline';
import { configManager } from './config-manager';
import { getActivityLog, ActivityLog } from '../../smart-scheduler';

export interface AutoServiceStatus {
  running: boolean;
  lastRunTime: string | null;
  currentTask: string | null;
  processedCount: number;
  errorCount: number;
}

export interface AutoServiceConfig {
  enabled: boolean;
  processInterval: number; // 处理间隔（秒）
  maxChaptersPerRun: number; // 每次最多处理的章节数
  relatedChapterCount: number; // 生成时关联章节数量
  autoPolish: boolean; // 生成后自动润色
}

export class ContentCraftAutoService {
  private novelService: NovelService;
  private activityLog: ActivityLog;
  
  private running = false;
  private timer: NodeJS.Timeout | null = null;
  private lastRunTime: Date | null = null;
  private currentTask: string | null = null;
  private processedCount = 0;
  private errorCount = 0;
  private config: AutoServiceConfig = {
    enabled: false,
    processInterval: 60, // 默认 60 秒
    maxChaptersPerRun: 3,
    relatedChapterCount: 3, // 默认关联前3章
    autoPolish: true // 默认自动润色
  };

  constructor() {
    this.novelService = new NovelService();
    this.activityLog = getActivityLog();
  }

  /**
   * 获取当前状态
   */
  getStatus(): AutoServiceStatus {
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
  getConfig(): AutoServiceConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<AutoServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('[ContentCraftAutoService] 配置已更新:', this.config);
    
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
   * 启动自动处理服务
   */
  start(): void {
    if (this.running) {
      logger.warn('[ContentCraftAutoService] 服务已在运行中');
      return;
    }

    this.running = true;
    this.config.enabled = true;
    logger.info('[ContentCraftAutoService] 自动处理服务已启动');
    
    // 立即执行一次处理
    setTimeout(() => {
      this.processChapters();
    }, 1000);
    
    // 启动定时处理
    this.startTimer();
  }

  /**
   * 停止自动处理服务
   */
  stop(): void {
    if (!this.running) {
      logger.warn('[ContentCraftAutoService] 服务未在运行');
      return;
    }

    this.running = false;
    this.config.enabled = false;
    this.stopTimer();
    logger.info('[ContentCraftAutoService] 自动处理服务已停止');
  }

  /**
   * 启动定时器
   */
  private startTimer(): void {
    this.stopTimer();
    
    this.timer = setInterval(() => {
      this.processChapters();
    }, this.config.processInterval * 1000);
    
    logger.info(`[ContentCraftAutoService] 定时器已启动，间隔: ${this.config.processInterval}秒`);
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
    if (!this.running) {
      return;
    }

    try {
      this.lastRunTime = new Date();
      logger.info('[ContentCraftAutoService] 开始处理章节...');
      this.activityLog.log('progress', 'Content Craft 开始检查待处理章节...');
      
      // 获取需要处理的章节
      const chaptersToProcess = await this.getChaptersToProcess();
      
      if (chaptersToProcess.length === 0) {
        logger.info('[ContentCraftAutoService] 没有需要处理的章节');
        this.activityLog.log('progress', '没有需要处理的章节，等待中...');
        this.currentTask = null;
        return;
      }

      logger.info(`[ContentCraftAutoService] 找到 ${chaptersToProcess.length} 个需要处理的章节`);
      this.activityLog.log('progress', `找到 ${chaptersToProcess.length} 个需要处理的章节`);
      
      // 限制每次处理的数量
      const chaptersToProcessNow = chaptersToProcess.slice(0, this.config.maxChaptersPerRun);
      
      for (const chapter of chaptersToProcessNow) {
        if (!this.running) {
          break;
        }
        
        try {
          this.currentTask = `正在处理章节: ${chapter.title || chapter.chapter_number}`;
          logger.info(`[ContentCraftAutoService] ${this.currentTask}`);
          
          if ((chapter.state || chapter.status) === 'outline') {
            // 生成章节内容（完整流程：生成+润色）
            await this.generateChapter(chapter.work_id, chapter.chapter_number);
          } else if ((chapter.state || chapter.status) === 'first_draft') {
            // 润色章节内容
            await this.polishChapter(chapter.work_id, chapter.chapter_number);
          }
          
          this.processedCount++;
          logger.info(`[ContentCraftAutoService] 章节处理成功: ${chapter.title || chapter.chapter_number}`);
        } catch (error: any) {
          this.errorCount++;
          logger.error(`[ContentCraftAutoService] 章节处理失败: ${chapter.title || chapter.chapter_number}`, error.message);
        }
      }
      
      this.currentTask = null;
      logger.info('[ContentCraftAutoService] 章节处理完成');
    } catch (error: any) {
      this.errorCount++;
      logger.error('[ContentCraftAutoService] 处理过程出错:', error.message);
      this.currentTask = null;
    }
  }

  /**
   * 获取需要处理的章节
   */
  private async getChaptersToProcess(): Promise<any[]> {
    try {
      // 直接查询数据库，不依赖 novelService
      const db = getDatabaseManager();
      
      // 直接查询状态为 outline 或 first_draft 的章节
      // 直接拼接 LIMIT 子句，避免 MySQL 参数绑定问题
      const limit = Math.max(1, Math.min(10, this.config.maxChaptersPerRun));
      const chapters = await db.query(`
        SELECT * FROM chapters 
        WHERE status IN ('outline', 'first_draft')
        ORDER BY updated_at ASC
        LIMIT ${limit}
      `);
      
      return chapters;
    } catch (error: any) {
      logger.error('[ContentCraftAutoService] 获取需要处理的章节失败:', error.message);
      this.activityLog.log('error', `获取章节失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 生成章节内容（完整流程：生成 + 润色）
   */
  private async generateChapter(workId: number, chapterNumber: number): Promise<void> {
    logger.info(`[ContentCraftAutoService] 生成章节内容 (workId: ${workId}, chapterNumber: ${chapterNumber})`);
    this.activityLog.log('generating', `开始生成第 ${chapterNumber} 章内容`);
    
    const db = getDatabaseManager();
    const generationPipeline = new GenerationPipeline();
    
    const result = await generationPipeline.generateFromDatabase({
      workId,
      chapterNumber,
      relatedChapterCount: this.config.relatedChapterCount, // 使用配置的关联章节数
      settings: {
        autoPolish: this.config.autoPolish // 使用配置的自动润色选项
      }
    }, (progress: any) => {
      logger.info(`[ContentCraftAutoService] [生成进度] ${progress.phase || 'generating'}: ${progress.message} (${progress.progress}%)`);
      if (progress.message) {
        this.activityLog.log('progress', `[生成] ${progress.message}`);
      }
    });

    // 保存生成后的内容并更新状态
    if (result.text) {
      // 先获取章节ID
      const chapter = await db.queryOne(
        'SELECT * FROM chapters WHERE work_id = ? AND chapter_number = ?', 
        [workId, chapterNumber]
      );
      if (chapter) {
        // 直接更新数据库，不依赖 novelService
        await db.execute(
          'UPDATE chapters SET content = ?, status = ?, updated_at = NOW() WHERE id = ?',
          [result.text, 'first_draft', chapter.id]
        );
        logger.info(`[ContentCraftAutoService] 已更新章节 ${chapter.id} 的内容`);
      }
    }
    
    logger.info(`[ContentCraftAutoService] 章节生成完成 (workId: ${workId}, chapterNumber: ${chapterNumber})`);
    this.activityLog.log('completed', `第 ${chapterNumber} 章生成完成`);
  }

  /**
   * 润色章节内容
   */
  private async polishChapter(workId: number, chapterNumber: number): Promise<void> {
    logger.info(`[ContentCraftAutoService] 润色章节内容 (workId: ${workId}, chapterNumber: ${chapterNumber})`);
    this.activityLog.log('polishing', `开始润色第 ${chapterNumber} 章内容`);
    
    const db = getDatabaseManager();
    
    // 1. 从数据库读取章节内容
    const chapter = await db.queryOne(
      'SELECT * FROM chapters WHERE work_id = ? AND chapter_number = ?', 
      [workId, chapterNumber]
    );
    
    if (!chapter || !chapter.content) {
      throw new Error('未找到章节内容');
    }

    // 2. 使用 PolishPipeline 润色
    const polishPipeline = new PolishPipeline();
    const result = await polishPipeline.execute({
      text: chapter.content,
      settings: configManager.getSettings()
    }, (progress: any) => {
      logger.info(`[ContentCraftAutoService] [润色进度] ${progress.currentStep || 'processing'}: ${progress.message} (${progress.progress}%)`);
      if (progress.message) {
        this.activityLog.log('progress', `[润色] ${progress.message}`);
      }
    });

    // 3. 保存润色后的内容并更新状态
    if (result.text) {    
      // 直接更新数据库，不依赖 novelService
      await db.execute(
        'UPDATE chapters SET content = ?, status = ?, updated_at = NOW() WHERE id = ?',
        [result.text, 'polished', chapter.id]
      );
      logger.info(`[ContentCraftAutoService] 已更新章节 ${chapter.id} 的润色内容`);
    }
    
    logger.info(`[ContentCraftAutoService] 章节润色完成 (workId: ${workId}, chapterNumber: ${chapterNumber})`);
    this.activityLog.log('completed', `第 ${chapterNumber} 章润色完成`);
  }
}

// 单例实例
let autoServiceInstance: ContentCraftAutoService | null = null;

export function getContentCraftAutoService(): ContentCraftAutoService {
  if (!autoServiceInstance) {
    autoServiceInstance = new ContentCraftAutoService();
  }
  return autoServiceInstance;
}
