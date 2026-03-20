/**
 * 内容处理流水线
 * 协调检测 → 润色 → 审核 → 发布的完整流程
 * 
 * 这是核心编排层，统筹整个内容发布流水线
 */

import { StateService } from './pipeline/StateService';
import { TaskMonitor } from './pipeline/TaskMonitor';
import { PolishFeatureDetector, PolishFeatures } from './pipeline/PolishFeatureDetector';
import { ContentValidator, ValidationResult } from './pipeline/ContentValidator';
import { AuditService, AuditResult } from './pipeline/AuditService';
import { FanqiePublisher, FanqieAccount, ChapterToPublish, PublishProgress } from './pipeline/FanqiePublisher';
import { FanqieScanner, ScanResult, ScannedWork, getFanqieScanner } from './pipeline/FanqieScanner';
import { getChapterRepository, ChapterData } from './pipeline/ChapterRepository';
import { logger } from '../utils/logger';
import { getConfig } from './config';
import { delay } from '../utils/helpers';

// 流水线步骤定义
export type PipelineStep = 
  | 'init'       // 初始化
  | 'scan'       // 扫描作品/章节
  | 'audit'      // 审核
  | 'detect'     // 检测
  | 'polish'     // 润色
  | 'publish'    // 发布
  | 'done';      // 完成

// 流水线进度事件
export interface PipelineProgressEvent {
  status: 'idle' | 'running' | 'completed' | 'error';
  step: PipelineStep;
  stepLabel: string;         // 步骤中文名
  current: number;           // 当前项索引
  total: number;             // 总项数
  task: string;              // 当前任务描述
  detail?: string;           // 详细信息
  percent: number;           // 百分比 0-100
  results: ProgressResult[]; // 已完成结果
  startTime?: number;
  elapsed?: number;          // 已用时间(ms)
  error?: string;
}

// 进度结果项
export interface ProgressResult {
  success: boolean;
  workTitle: string;
  chapterNumber: number;
  chapterTitle: string;
  message: string;
  duration?: number;
}

// 步骤标签映射
const STEP_LABELS: Record<PipelineStep, string> = {
  init: '初始化',
  scan: '扫描',
  audit: '审核',
  detect: '检测',
  polish: '润色',
  publish: '发布',
  done: '完成',
};

// 任务类型定义
export interface PipelineTask {
  workId: number;
  workName: string;
  chapterNumber: number;
  chapterTitle: string;
  content: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: string;
  error?: string;
}

export interface TaskResult {
  success: boolean;
  task: any;
  duration: number;
  error?: string;
}

export interface PipelineOptions {
  workId?: number;
  chapterRange?: [number, number];
  platforms?: string[];
  dryRun?: boolean;
  headless?: boolean;
  skipAudit?: boolean;  // 跳过审核
  maxConcurrent?: number;
  onProgress?: (event: PipelineProgressEvent) => void;
}

/**
 * 内容处理流水线
 */
export class ContentPipeline {
  private state: StateService;
  private monitor: TaskMonitor;
  private detector: PolishFeatureDetector;
  private auditService: AuditService;
  private fanqiePublisher: FanqiePublisher;
  private scanner: FanqieScanner;
  private running: boolean = false;
  private abortController: AbortController | null = null;
  private progressCallback?: (event: PipelineProgressEvent) => void;
  private startTime?: number;
  private progressResults: ProgressResult[] = [];
  
  constructor() {
    this.state = new StateService();
    this.monitor = new TaskMonitor();
    this.detector = new PolishFeatureDetector();
    this.auditService = new AuditService();
    this.fanqiePublisher = new FanqiePublisher();
    this.scanner = getFanqieScanner();
  }
  
  /**
   * 发出进度事件
   */
  private emitProgress(
    status: PipelineProgressEvent['status'],
    step: PipelineStep,
    current: number,
    total: number,
    task: string,
    detail?: string,
    error?: string
  ): void {
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    const event: PipelineProgressEvent = {
      status,
      step,
      stepLabel: STEP_LABELS[step],
      current,
      total,
      task,
      detail,
      percent,
      results: this.progressResults,
      startTime: this.startTime,
      elapsed: this.startTime ? Date.now() - this.startTime : undefined,
      error,
    };
    
    if (this.progressCallback) {
      this.progressCallback(event);
    }
  }
  
  /**
   * 添加结果
   */
  private addResult(
    success: boolean,
    workTitle: string,
    chapterNumber: number,
    chapterTitle: string,
    message: string,
    duration?: number
  ): void {
    this.progressResults.push({ success, workTitle, chapterNumber, chapterTitle, message, duration });
  }
  
  /**
   * 直接发布到番茄（简化流程）
   * 
   * 逻辑：
   * 1. 先从番茄获取最新章节号
   * 2. 从数据库找下一章
   * 3. 发布到番茄
   */
  async publishToFanqie(options: {
    workId: number;
    chapterNumber?: number;
    startChapter?: number;
    endChapter?: number;
    headless?: boolean;
    dryRun?: boolean;
    skipStatusCheck?: boolean;
    onProgress?: (event: PipelineProgressEvent) => void;
  }): Promise<TaskResult[]> {
    const { workId, chapterNumber, headless = false, dryRun = false, onProgress } = options;
    
    console.log('[ContentPipeline] publishToFanqie 参数:', { workId, chapterNumber, headless, dryRun });
    
    // 初始化进度
    this.progressCallback = onProgress;
    this.startTime = Date.now();
    this.progressResults = [];
    
    const results: TaskResult[] = [];
    
    const config = getConfig();
    const accounts = config.scheduler.fanqieAccounts;
    if (!accounts || accounts.length === 0) {
      this.emitProgress('error', 'init', 0, 0, '初始化失败', undefined, '未配置番茄账号');
      throw new Error('未配置番茄账号');
    }
    const account = accounts[0];
    
    // 步骤1: 初始化
    this.emitProgress('running', 'init', 0, 0, '初始化发布流程...');
    await delay(500);
    
    // 步骤2: 获取作品信息
    const repo = getChapterRepository();
    const workInfo = await repo.getWorkInfo(workId);
    if (!workInfo) {
      this.emitProgress('error', 'init', 0, 0, '初始化失败', undefined, '未找到作品');
      throw new Error('未找到作品');
    }
    
    // 步骤3: 从番茄获取最新章节号
    this.emitProgress('running', 'scan', 0, 0, '正在获取番茄最新章节...');
    
    let nextChapterNumber: number;
    
    if (chapterNumber) {
      // 如果指定了章节号，直接使用
      nextChapterNumber = chapterNumber;
      logger.info(`使用指定章节号: ${nextChapterNumber}`);
    } else {
      // 自动检测番茄最新章节
      if (dryRun) {
        // dryRun 模式下，假设番茄最新章节为 0
        nextChapterNumber = 1;
        logger.info('[DRY RUN] 假设番茄最新章节为 0，将发布第 1 章');
      } else {
        const latestChapter = await this.fanqiePublisher.getLatestChapterFromFanqie(workInfo.title, account, headless);
        if (latestChapter === null) {
          this.emitProgress('error', 'scan', 0, 0, '获取番茄最新章节失败');
          throw new Error('获取番茄最新章节失败');
        }
        nextChapterNumber = latestChapter + 1;
        logger.info(`番茄最新章节: ${latestChapter}，将发布第 ${nextChapterNumber} 章`);
      }
    }
    
    // 步骤4: 从数据库获取下一章
    this.emitProgress('running', 'scan', 0, 0, `从数据库获取第 ${nextChapterNumber} 章...`);
    
    const chapterData = await repo.getChapterByNumber(workId, nextChapterNumber);
    if (!chapterData) {
      this.emitProgress('completed', 'scan', 0, 0, `数据库中没有第 ${nextChapterNumber} 章`);
      logger.info(`数据库中没有第 ${nextChapterNumber} 章，发布结束`);
      return results;
    }
    
    const toPublish: ChapterToPublish = {
      workId: chapterData.workId,
      workTitle: chapterData.workTitle,
      chapterNumber: chapterData.chapterNumber,
      chapterTitle: chapterData.chapterTitle || `第${chapterData.chapterNumber}章`,
      content: chapterData.content || '',
      wordCount: chapterData.wordCount || chapterData.content?.length || 0,
    };
    
    logger.info(`找到待发布章节: ${toPublish.workTitle} 第${toPublish.chapterNumber}章`);
    this.emitProgress('running', 'scan', 0, 1, `找到待发布章节: 第${toPublish.chapterNumber}章`);
    
    // 步骤5: 发布章节
    const taskStartTime = Date.now();
    const taskDesc = `${toPublish.workTitle} 第${toPublish.chapterNumber}章`;
    this.emitProgress('running', 'publish', 1, 1, `正在发布: ${taskDesc}`);
    logger.info(`发布: ${taskDesc}`);
    
    if (dryRun) {
      const duration = Date.now() - taskStartTime;
      results.push({ success: true, task: toPublish, duration });
      this.addResult(true, toPublish.workTitle, toPublish.chapterNumber, toPublish.chapterTitle, '模拟发布成功', duration);
      this.emitProgress('completed', 'done', 1, 1, '模拟发布成功');
      return results;
    }
    
    try {
      const result = await this.fanqiePublisher.publishChapter(toPublish, account, { 
        headless,
        onProgress: (p: PublishProgress) => {
          this.emitProgress('running', 'publish', 1, 1, taskDesc, p.action);
        }
      });
      const duration = Date.now() - taskStartTime;
      
      results.push({
        success: result.success,
        task: toPublish,
        duration,
        error: result.error,
      });
      
      this.addResult(
        result.success,
        toPublish.workTitle,
        toPublish.chapterNumber,
        toPublish.chapterTitle,
        result.message,
        duration
      );
      
      if (result.success) {
        logger.info(`  ✓ 发布成功`);
        this.emitProgress('completed', 'done', 1, 1, '发布成功');
      } else {
        logger.error(`  ✗ 发布失败: ${result.error}`);
        this.emitProgress('error', 'done', 1, 1, `发布失败: ${result.error}`);
      }
      
    } catch (error: any) {
      const duration = Date.now() - taskStartTime;
      results.push({
        success: false,
        task: toPublish,
        duration,
        error: error.message,
      });
      this.addResult(false, toPublish.workTitle, toPublish.chapterNumber, toPublish.chapterTitle, error.message, duration);
      this.emitProgress('error', 'done', 1, 1, `发布失败: ${error.message}`);
    }
    
    return results;
  }
  
  /**
   * 运行完整流程：检测 → 润色 → 审核 → 发布
   */
  async runSchedule(options: PipelineOptions = {}): Promise<TaskResult[]> {
    return this.run(options);
  }
  
  async run(options: PipelineOptions = {}): Promise<TaskResult[]> {
    if (!this.running) {
      await this.start();
    }
    
    const results: TaskResult[] = [];
    const startTime = Date.now();
    
    try {
      const chapters = await this.getPendingChapters(options);
      logger.info(`找到 ${chapters.length} 个待处理章节`);
      
      for (let i = 0; i < chapters.length; i++) {
        if (this.abortController?.signal.aborted) break;
        
        const chapter = chapters[i];
        this.emitProgress('running', 'publish', i + 1, chapters.length, 
          `处理 ${chapter.workTitle} 第${chapter.chapterNumber}章`);
        
        // 跳过审核直接发布
        if (options.skipAudit || chapter.auditStatus === 'passed') {
          for (const platform of (options.platforms || ['fanqie'])) {
            const result = await this.publishChapter(chapter, platform, options);
            results.push(result);
          }
        } else {
          // 审核后发布
          const auditResult = await this.runAuditTask(chapter);
          if (auditResult.success) {
            for (const platform of (options.platforms || ['fanqie'])) {
              const result = await this.publishChapter(chapter, platform, options);
              results.push(result);
            }
          } else {
            results.push(auditResult);
          }
        }
        
        this.state.setProcessedIndex(i + 1);
        if (i < chapters.length - 1) await delay(2000);
      }
      
      logger.info(`流水线完成，共处理 ${chapters.length} 个章节，耗时 ${Date.now() - startTime}ms`);
      
    } catch (error: any) {
      logger.error('流水线失败:', error);
      throw error;
    }
    
    return results;
  }
  
  /**
   * 发布单个章节
   */
  private async publishChapter(chapter: any, platform: string, options: PipelineOptions): Promise<TaskResult> {
    const startTime = Date.now();
    
    try {
      if (platform === 'fanqie') {
        const config = getConfig();
        const account = config.scheduler.fanqieAccounts[0];
        
        const chapterData: ChapterToPublish = {
          workId: chapter.workId,
          workTitle: chapter.workTitle,
          chapterNumber: chapter.chapterNumber,
          chapterTitle: chapter.chapterTitle,
          content: chapter.content,
          wordCount: chapter.content?.length || 0,
        };
        
        const result = await this.fanqiePublisher.publishChapter(chapterData, account, {
          headless: options.headless ?? true,
          dryRun: options.dryRun,
        });
        
        return {
          success: result.success,
          task: chapter,
          duration: Date.now() - startTime,
          error: result.error,
        };
      }
      
      return { success: false, task: chapter, duration: 0, error: `平台 ${platform} 未实现` };
      
    } catch (error: any) {
      return { success: false, task: chapter, duration: Date.now() - startTime, error: error.message };
    }
  }
  
  /**
   * 获取待处理章节
   */
  private async getPendingChapters(options: PipelineOptions): Promise<ChapterData[]> {
    const repo = getChapterRepository();
    return await repo.getPendingProcess({
      workId: options.workId,
      chapterRange: options.chapterRange,
      limit: 100,
    });
  }
  
  private async runAuditTask(chapter: any): Promise<TaskResult> {
    const startTime = Date.now();
    
    try {
      const result = await this.auditService.auditChapter(chapter.workId, chapter.chapterNumber);
      return {
        success: result.status === 'passed',
        task: chapter,
        duration: Date.now() - startTime,
        error: result.status !== 'passed' ? result.issues.map(i => i.message).join('; ') : undefined,
      };
    } catch (error: any) {
      return { success: false, task: chapter, duration: Date.now() - startTime, error: error.message };
    }
  }
  
  async start(): Promise<void> {
    if (this.running) throw new Error('流水线已在运行');
    const config = getConfig();
    if (!config.scheduler.enabled) {
      logger.warn('流水线已禁用');
      return;
    }
    this.running = true;
    this.abortController = new AbortController();
    this.state.setRunning(true);
    logger.info('内容流水线已启动');
  }
  
  async stop(): Promise<void> {
    this.running = false;
    this.abortController?.abort();
    this.state.setRunning(false);
    logger.info('内容流水线已停止');
  }
  
  getState() {
    return { running: this.running, pipeline: this.state.getState(), failures: this.monitor.getStats() };
  }
  
  getEfficiencyReport() { return this.state.getEfficiencyReport(); }
  getFailureReport() { return this.monitor.generateFailureReport(); }

  /**
   * 扫描番茄作品列表
   */
  async scanFanqieWorks(options?: { accountId?: string; headed?: boolean }): Promise<ScanResult> {
    this.emitProgress('running', 'scan', 0, 0, '正在扫描番茄作品...');

    const result = await this.scanner.scan({
      accountId: options?.accountId,
      headed: options?.headed,
      onProgress: (progress) => {
        this.emitProgress('running', 'scan', 0, 0, progress.message);
      }
    });

    if (result.success) {
      this.emitProgress('completed', 'scan', result.works.length, result.works.length,
        `扫描完成，共 ${result.works.length} 个作品`);
    } else {
      this.emitProgress('error', 'scan', 0, 0, '扫描失败', result.error);
    }

    return result;
  }

  /**
   * 获取扫描缓存
   */
  getScanCache(accountId?: string): ScannedWork[] {
    return this.scanner.readCache(accountId);
  }
}
