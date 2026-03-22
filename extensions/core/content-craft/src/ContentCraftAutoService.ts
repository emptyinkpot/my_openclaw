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
import { PolishPipeline } from './pipeline';
import { GenerationPipeline } from './generation-pipeline';
import { chapterStateMachine, ChapterState } from '../../../core/state-machine';

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
  private polishPipeline: PolishPipeline;
  private generationPipeline: GenerationPipeline;
  
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
    this.polishPipeline = new PolishPipeline();
    this.generationPipeline = new GenerationPipeline();
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
            // 生成章节内容
            await this.generateChapter(chapter.id);
          } else if (chapter.state === ChapterState.FIRST_DRAFT) {
            // 润色章节内容
            await this.polishChapter(chapter.id);
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
   * 生成章节内容
   */
  private async generateChapter(chapterId: number): Promise<void> {
    // TODO: 实现章节生成逻辑
    // 这里需要调用 GenerationPipeline 来生成章节内容
    // 生成完成后，通过状态机将状态更新为 polished
    logger.info(`[ContentCraftAutoService] 生成章节内容 (ID: ${chapterId})`);
    
    // 临时实现：模拟生成过程
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 更新状态为 polished
    await chapterStateMachine.transition(chapterId, ChapterState.POLISHED, {
      reason: '自动生成完成',
      operator: 'content-craft-auto'
    });
  }

  /**
   * 润色章节内容
   */
  private async polishChapter(chapterId: number): Promise<void> {
    // TODO: 实现章节润色逻辑
    // 这里需要调用 PolishPipeline 来润色章节内容
    // 润色完成后，通过状态机将状态更新为 polished
    logger.info(`[ContentCraftAutoService] 润色章节内容 (ID: ${chapterId})`);
    
    // 临时实现：模拟润色过程
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 更新状态为 polished
    await chapterStateMachine.transition(chapterId, ChapterState.POLISHED, {
      reason: '自动润色完成',
      operator: 'content-craft-auto'
    });
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
