/**
 * 智能调度器 - 统一管理 Content Craft 和审核自动处理服务
 * 
 * 功能：
 * 1. 统一的开关控制
 * 2. 智能调度两个服务，避免冲突
 * 3. 实时日志记录
 * 4. 状态管理
 * 
 * @module smart-scheduler
 */

import { logger } from '../../plugins/novel-manager/utils/logger';
import { getContentCraftAutoService, ContentCraftAutoService } from '../content-craft/src';
import { getAuditAutoService, AuditAutoService } from '../audit';
import { getPublishAutoService, PublishAutoService } from '../publishing/PublishAutoService';
import { ActivityLog, getActivityLog } from './ActivityLog';

export interface SchedulerStatus {
  running: boolean;
  lastRunTime: string | null;
  currentTask: string | null;
  contentCraftStatus: any;
  auditStatus: any;
  publishStatus: any;
}

export interface SchedulerConfig {
  enabled: boolean;
  processInterval: number; // 处理间隔（秒）
  maxChaptersPerRun: number; // 每次最多处理的章节数
  // Content Craft 配置
  contentCraft: {
    relatedChapterCount: number;
    autoPolish: boolean;
  };
  // 审核配置
  audit: {
    autoFix: boolean;
  };
  // 发布配置
  publish: {
    enabled: boolean;
    headless: boolean;
    dryRun: boolean;
  };
}

export class SmartScheduler {
  private contentCraftService: ContentCraftAutoService;
  private auditService: AuditAutoService;
  private publishService: PublishAutoService;
  private activityLog: ActivityLog;
  
  private running = false;
  private timer: NodeJS.Timeout | null = null;
  private lastRunTime: Date | null = null;
  private currentTask: string | null = null;
  private config: SchedulerConfig = {
    enabled: false,
    processInterval: 60,
    maxChaptersPerRun: 3,
    contentCraft: {
      relatedChapterCount: 3,
      autoPolish: true
    },
    audit: {
      autoFix: true
    },
    publish: {
      enabled: false,
      headless: true,
      dryRun: false
    }
  };

  constructor() {
    this.contentCraftService = getContentCraftAutoService();
    this.auditService = getAuditAutoService();
    this.publishService = getPublishAutoService();
    this.activityLog = getActivityLog();
  }

  /**
   * 获取当前状态
   */
  getStatus(): SchedulerStatus {
    return {
      running: this.running,
      lastRunTime: this.lastRunTime?.toISOString() || null,
      currentTask: this.currentTask,
      contentCraftStatus: this.contentCraftService.getStatus(),
      auditStatus: this.auditService.getStatus(),
      publishStatus: this.publishService.getStatus()
    };
  }

  /**
   * 获取配置
   */
  getConfig(): SchedulerConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<SchedulerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('[SmartScheduler] 配置已更新:', this.config);
    
    // 更新三个服务的配置
    this.contentCraftService.updateConfig({
      processInterval: this.config.processInterval,
      maxChaptersPerRun: this.config.maxChaptersPerRun,
      relatedChapterCount: this.config.contentCraft.relatedChapterCount,
      autoPolish: this.config.contentCraft.autoPolish
    });
    
    this.auditService.updateConfig({
      processInterval: this.config.processInterval,
      maxChaptersPerRun: this.config.maxChaptersPerRun,
      autoFix: this.config.audit.autoFix
    });
    
    this.publishService.updateConfig({
      enabled: this.config.publish.enabled,
      processInterval: this.config.processInterval,
      maxChaptersPerRun: this.config.maxChaptersPerRun,
      headless: this.config.publish.headless,
      dryRun: this.config.publish.dryRun
    });
    
    // 如果启用状态改变，控制服务
    if (newConfig.enabled !== undefined) {
      if (newConfig.enabled) {
        this.start();
      } else {
        this.stop();
      }
    } else if (newConfig.processInterval !== undefined && this.running) {
      this.restartTimer();
    }
  }

  /**
   * 启动智能调度器
   */
  start(): void {
    if (this.running) {
      logger.warn('[SmartScheduler] 调度器已在运行中');
      return;
    }

    this.running = true;
    this.config.enabled = true;
    logger.info('[SmartScheduler] 智能调度器已启动');
    
    this.activityLog.log('system', '🤖 智能调度器已启动');
    
    // 立即启动 Content Craft 自动处理服务
    const contentCraftStatus = this.contentCraftService.getStatus();
    if (!contentCraftStatus.running) {
      this.contentCraftService.start();
      this.activityLog.log('system', '🚀 Content Craft 自动处理服务已启动');
    }
    
    // 立即启动审核自动处理服务
    const auditStatus = this.auditService.getStatus();
    if (!auditStatus.running) {
      this.auditService.start();
      this.activityLog.log('system', '✅ 审核自动处理服务已启动');
    }
    
    // 立即启动发布自动处理服务
    const publishStatus = this.publishService.getStatus();
    if (!publishStatus.running) {
      this.publishService.start();
      this.activityLog.log('system', '🚀 自动发布服务已启动');
    }
    
    // 立即执行一次调度
    setTimeout(() => {
      this.runScheduledTask();
    }, 1000);
    
    // 启动定时器
    this.startTimer();
  }

  /**
   * 停止智能调度器
   */
  stop(): void {
    if (!this.running) {
      logger.warn('[SmartScheduler] 调度器未在运行');
      return;
    }

    this.running = false;
    this.config.enabled = false;
    
    // 停止三个服务
    this.contentCraftService.stop();
    this.auditService.stop();
    this.publishService.stop();
    
    this.stopTimer();
    logger.info('[SmartScheduler] 智能调度器已停止');
    
    this.activityLog.log('system', '🛑 智能调度器已停止');
  }

  /**
   * 启动定时器
   */
  private startTimer(): void {
    this.stopTimer();
    
    this.timer = setInterval(() => {
      this.runScheduledTask();
    }, this.config.processInterval * 1000);
    
    logger.info(`[SmartScheduler] 定时器已启动，间隔: ${this.config.processInterval}秒`);
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
   * 执行调度任务
   */
  private async runScheduledTask(): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      this.lastRunTime = new Date();
      logger.info('[SmartScheduler] 开始调度任务...');
      
      this.currentTask = '正在检查待处理章节...';
      
      // 智能调度：先运行 Content Craft，再运行审核，最后运行发布
      // 这样可以确保生成/润色完成的章节能立即进入审核流程，审核通过的章节能立即发布
      
      // 1. 先启动 Content Craft 服务（如果还没启动）
      const contentCraftStatus = this.contentCraftService.getStatus();
      if (!contentCraftStatus.running) {
        this.contentCraftService.start();
        this.activityLog.log('system', '🚀 Content Craft 自动处理服务已启动');
      }
      
      // 2. 等待一小会儿，让 Content Craft 处理
      await this.sleep(2000);
      
      // 3. 再启动审核服务（如果还没启动）
      const auditStatus = this.auditService.getStatus();
      if (!auditStatus.running) {
        this.auditService.start();
        this.activityLog.log('system', '✅ 审核自动处理服务已启动');
      }
      
      // 4. 等待一小会儿，让审核处理
      await this.sleep(2000);
      
      // 5. 启动发布服务（如果还没启动）
      const publishStatus = this.publishService.getStatus();
      if (!publishStatus.running) {
        this.publishService.start();
        this.activityLog.log('system', '🚀 自动发布服务已启动');
      }
      
      this.currentTask = null;
      logger.info('[SmartScheduler] 调度任务完成');
    } catch (error: any) {
      logger.error('[SmartScheduler] 调度任务出错:', error.message);
      this.activityLog.log('error', `❌ 调度任务出错: ${error.message}`);
      this.currentTask = null;
    }
  }

  /**
   * 辅助函数：sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 单例实例
let schedulerInstance: SmartScheduler | null = null;

export function getSmartScheduler(): SmartScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new SmartScheduler();
  }
  return schedulerInstance;
}
