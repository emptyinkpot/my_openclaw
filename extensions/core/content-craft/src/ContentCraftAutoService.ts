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
import { ChapterState } from '../../../core/state-machine';
import { PolishPipeline } from './pipeline';
import { GenerationPipeline } from './generation-pipeline';
import { configManager } from './config-manager';

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
}

export class ContentCraftAutoService {
  private novelService: NovelService;
  
  private running = false;
  private timer: NodeJS.Timeout | null = null;
  private lastRunTime: Date | null = null;
  private currentTask: string | null = null;
  private processedCount = 0;
  private errorCount = 0;
  private config: AutoServiceConfig = {
    enabled: false,
    processInterval: 60, // 默认 60 秒
    maxChaptersPerRun: 3
  };

  constructor() {
    this.novelService = new NovelService();
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
      
      // 获取需要处理的章节
      const chaptersToProcess = await this.getChaptersToProcess();
      
      if (chaptersToProcess.length === 0) {
        logger.info('[ContentCraftAutoService] 没有需要处理的章节');
        this.currentTask = null;
        return;
      }

      logger.info(`[ContentCraftAutoService] 找到 ${chaptersToProcess.length} 个需要处理的章节`);
      
      // 限制每次处理的数量
      const chaptersToProcessNow = chaptersToProcess.slice(0, this.config.maxChaptersPerRun);
      
      for (const chapter of chaptersToProcessNow) {
        if (!this.running) {
          break;
        }
        
        try {
          this.currentTask = `正在处理章节: ${chapter.title || chapter.chapter_number}`;
          logger.info(`[ContentCraftAutoService] ${this.currentTask}`);
          
          if (chapter.state === ChapterState.OUTLINE) {
            // 生成章节内容（完整流程：生成+润色）
            await this.generateChapter(chapter.work_id, chapter.chapter_number);
          } else if (chapter.state === ChapterState.FIRST_DRAFT) {
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
      // 获取所有章节
      const result = await this.novelService.getChapters({});
      const chapters = result.data || [];
      
      // 筛选出状态为 outline 或 first_draft 的章节
      const chaptersToProcess = chapters.filter((chapter: any) => 
        chapter.state === ChapterState.OUTLINE || 
        chapter.state === ChapterState.FIRST_DRAFT
      );
      
      // 按更新时间排序，优先处理较早的
      chaptersToProcess.sort((a: any, b: any) => {
        const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
        const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
        return timeA - timeB;
      });
      
      return chaptersToProcess;
    } catch (error: any) {
      logger.error('[ContentCraftAutoService] 获取需要处理的章节失败:', error.message);
      return [];
    }
  }

  /**
   * 生成章节内容（完整流程：生成 + 润色）
   */
  private async generateChapter(workId: number, chapterNumber: number): Promise<void> {
    logger.info(`[ContentCraftAutoService] 生成章节内容 (workId: ${workId}, chapterNumber: ${chapterNumber})`);
    
    const db = getDatabaseManager();
    const generationPipeline = new GenerationPipeline();
    
    const result = await generationPipeline.generateFromDatabase({
      workId,
      chapterNumber,
      relatedChapterCount: 2
    }, (progress: any) => {
      logger.info(`[ContentCraftAutoService] [生成进度] ${progress.phase || 'generating'}: ${progress.message} (${progress.progress}%)`);
    });

    // 保存生成后的内容并更新状态
    if (result.text) {
      // 先获取章节ID
      const chapter = await db.queryOne(
        'SELECT * FROM chapters WHERE work_id = ? AND chapter_number = ?', 
        [workId, chapterNumber]
      );
      if (chapter) {
        await this.novelService.updateChapter(chapter.id, {
          content: result.text
        });
        // 使用状态机服务更新状态
        const { getChapterStateMachine } = require('../../../core/state-machine');
        const stateMachine = getChapterStateMachine();
        await stateMachine.transition(
          chapter.id,
          'first_draft',
          'content_generated',
          { metadata: { generationResult: 'success' } }
        );
      }
    }
    
    logger.info(`[ContentCraftAutoService] 章节生成完成 (workId: ${workId}, chapterNumber: ${chapterNumber})`);
  }

  /**
   * 润色章节内容
   */
  private async polishChapter(workId: number, chapterNumber: number): Promise<void> {
    logger.info(`[ContentCraftAutoService] 润色章节内容 (workId: ${workId}, chapterNumber: ${chapterNumber})`);
    
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
    });

    // 3. 保存润色后的内容并更新状态
    if (result.text) {    
      // 先更新内容
      await this.novelService.updateChapter(chapter.id, {
        content: result.text
      });
      
      // 记录润色信息到 polish_info 字段（先尝试添加字段）
      try {
        // 检查 polish_info 字段是否存在
        const [colCheck] = await db.query(`
          SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chapters' AND COLUMN_NAME = 'polish_info'
        `);
        
        if (colCheck[0].cnt === 0) {
          // 字段不存在，添加它
          await db.execute(`
            ALTER TABLE chapters ADD COLUMN polish_info JSON COMMENT '润色信息（是否经过润色流程、步骤等）' AFTER status
          `);
          logger.info('[ContentCraftAutoService] 已添加 polish_info 字段');
        }
        
        // 更新 polish_info 字段
        const polishInfo = {
          hasBeenPolished: true,
          polishedAt: new Date().toISOString(),
          stepsExecuted: result.metadata?.stepsExecuted || 0,
          totalSteps: result.metadata?.totalSteps || 0,
          processingTime: result.metadata?.processingTime || 0
        };
        
        await db.execute(`
          UPDATE chapters SET polish_info = ? WHERE id = ?
        `, [JSON.stringify(polishInfo), chapter.id]);
        
      } catch (e) {
        logger.warn('[ContentCraftAutoService] 更新 polish_info 失败:', e);
      }
      
      // 使用状态机服务更新状态
      const { getChapterStateMachine } = require('../../../core/state-machine');
      const stateMachine = getChapterStateMachine();
      await stateMachine.transition(
        chapter.id,
        'polished',
        'content_polished',
        { metadata: { polishResult: 'success' } }
      );
    }
    
    logger.info(`[ContentCraftAutoService] 章节润色完成 (workId: ${workId}, chapterNumber: ${chapterNumber})`);
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
