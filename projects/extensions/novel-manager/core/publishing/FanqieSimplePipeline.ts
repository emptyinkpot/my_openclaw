/**
 * 番茄简化发布流水线
 * 专门用于：自动从番茄获取最新章节 → 找下一章 → 发布
 * 
 * 这是简化版本，只做用户需要的事！
 */

import { delay } from '../utils/helpers';
import { logger } from '../utils/logger';
import { getConfig } from '../../../core/config';
import { FanqiePublisher, FanqieAccount, ChapterToPublish, PublishProgress } from './FanqiePublisher';
import { getChapterRepository } from './ChapterRepository';
import { getAccountMatcher } from './AccountMatcher';

// 流水线步骤定义
export type PipelineStep = 
  | 'init'       // 初始化
  | 'scan'       // 扫描
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

// 任务结果
export interface TaskResult {
  success: boolean;
  task: any;
  duration: number;
  error?: string;
}

// 步骤标签映射
const STEP_LABELS: Record<PipelineStep, string> = {
  init: '初始化',
  scan: '扫描',
  publish: '发布',
  done: '完成',
};

export interface PipelineOptions {
  workId?: number;
  chapterNumber?: number;
  headless?: boolean;
  dryRun?: boolean;
  onProgress?: (event: PipelineProgressEvent) => void;
}

/**
 * 番茄简化发布流水线
 */
export class FanqieSimplePipeline {
  private fanqiePublisher: FanqiePublisher;
  private progressCallback?: (event: PipelineProgressEvent) => void;
  private startTime?: number;
  private progressResults: ProgressResult[] = [];
  
  constructor() {
    this.fanqiePublisher = new FanqiePublisher();
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
  ): PipelineProgressEvent {
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
    
    console.log('[FanqieSimplePipeline]', event.stepLabel, ':', event.task, `(${event.percent}%)`);
    
    if (this.progressCallback) {
      this.progressCallback(event);
    }
    
    return event;
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
   * 发布到番茄（简化流程）
   * 
   * 逻辑：
   * 1. 先从番茄获取最新章节号
   * 2. 从数据库找下一章
   * 3. 发布到番茄
   */
  async publishToFanqie(options: PipelineOptions): Promise<TaskResult[]> {
    const { workId, chapterNumber, headless = false, dryRun = false, onProgress } = options;
    
    console.log('[FanqieSimplePipeline] ====== publishToFanqie 开始 ======');
    console.log('[FanqieSimplePipeline] 参数:', { workId, chapterNumber, headless, dryRun });
    
    // 初始化进度
    this.progressCallback = onProgress;
    this.startTime = Date.now();
    this.progressResults = [];
    
    console.log('[FanqieSimplePipeline] [步骤 1/5] 初始化进度...');
    
    const results: TaskResult[] = [];
    
    const config = getConfig();
    const accounts = config.scheduler.fanqieAccounts;
    if (!accounts || accounts.length === 0) {
      console.log('[FanqieSimplePipeline] [错误] 未配置番茄账号');
      this.emitProgress('error', 'init', 0, 0, '初始化失败', undefined, '未配置番茄账号');
      throw new Error('未配置番茄账号');
    }
    
    // 自动匹配账号
    console.log('[FanqieSimplePipeline] 开始自动匹配账号...');
    let account;
    const repo = getChapterRepository();
    const workInfo = await repo.getWorkInfo(workId!);
    
    if (workInfo) {
      const matcher = getAccountMatcher();
      const matchedAccount = await matcher.matchAccountForWork(workInfo.title);
      if (matchedAccount) {
        account = matchedAccount;
        console.log('[FanqieSimplePipeline] 自动匹配账号成功:', account.name);
      }
    }
    
    // 如果自动匹配失败，使用第一个账号
    if (!account) {
      account = accounts[0];
      console.log('[FanqieSimplePipeline] 自动匹配失败，使用默认账号:', account.name);
    }
    
    // 步骤1: 初始化
    console.log('[FanqieSimplePipeline] ====== 步骤 1/5: 初始化发布流程 ======');
    this.emitProgress('running', 'init', 0, 5, '步骤 1/5: 初始化发布流程...');
    await delay(500);
    
    // 步骤2: 验证 workInfo（前面已经获取过了）
    console.log('[FanqieSimplePipeline] ====== 步骤 1/5: 获取作品信息 ======');
    this.emitProgress('running', 'init', 1, 5, '步骤 1/5: 获取作品信息...');
    if (!workInfo) {
      console.log('[FanqieSimplePipeline] [错误] 未找到作品，workId:', workId);
      this.emitProgress('error', 'init', 1, 5, '初始化失败', undefined, '未找到作品');
      throw new Error('未找到作品');
    }
    console.log('[FanqieSimplePipeline] 找到作品:', workInfo.title);
    this.emitProgress('running', 'init', 1, 5, `找到作品: ${workInfo.title}`);
    
    // 步骤3: 从番茄获取最新章节号
    console.log('[FanqieSimplePipeline] ====== 步骤 2/5: 获取番茄最新章节 ======');
    this.emitProgress('running', 'scan', 2, 5, '步骤 2/5: 正在获取番茄最新章节...');
    
    let nextChapterNumber: number;
    
    if (chapterNumber) {
      // 如果指定了章节号，直接使用
      nextChapterNumber = chapterNumber;
      console.log('[FanqieSimplePipeline] 使用指定章节号:', nextChapterNumber);
      logger.info(`使用指定章节号: ${nextChapterNumber}`);
      this.emitProgress('running', 'scan', 2, 5, `使用指定章节号: 第${nextChapterNumber}章`);
    } else {
      // 自动检测番茄最新章节
      if (dryRun) {
        // dryRun 模式下，假设番茄最新章节为 0
        nextChapterNumber = 1;
        console.log('[FanqieSimplePipeline] [DRY RUN] 假设番茄最新章节为 0，将发布第 1 章');
        logger.info('[DRY RUN] 假设番茄最新章节为 0，将发布第 1 章');
        this.emitProgress('running', 'scan', 2, 5, '[模拟] 番茄最新章节: 0，将发布第 1 章');
      } else {
        console.log('[FanqieSimplePipeline] 启动浏览器，连接番茄...');
        this.emitProgress('running', 'scan', 2, 5, '启动浏览器，连接番茄...');
        const latestChapter = await this.fanqiePublisher.getLatestChapterFromFanqie(workInfo.title, account, headless);
        if (latestChapter === null) {
          console.log('[FanqieSimplePipeline] [错误] 获取番茄最新章节失败');
          this.emitProgress('error', 'scan', 2, 5, '获取番茄最新章节失败');
          throw new Error('获取番茄最新章节失败');
        }
        nextChapterNumber = latestChapter + 1;
        console.log('[FanqieSimplePipeline] 番茄最新章节:', latestChapter, '，将发布第', nextChapterNumber, '章');
        logger.info(`番茄最新章节: ${latestChapter}，将发布第 ${nextChapterNumber} 章`);
        this.emitProgress('running', 'scan', 2, 5, `番茄最新章节: ${latestChapter}，下一章: ${nextChapterNumber}`);
      }
    }
    
    // 步骤4: 从数据库获取下一章
    console.log('[FanqieSimplePipeline] ====== 步骤 3/5: 从数据库获取章节 ======');
    this.emitProgress('running', 'scan', 3, 5, `步骤 3/5: 从数据库获取第 ${nextChapterNumber} 章...`);
    
    const chapterData = await repo.getChapterByNumber(workId!, nextChapterNumber);
    if (!chapterData) {
      console.log('[FanqieSimplePipeline] [完成] 数据库中没有第', nextChapterNumber, '章，发布结束');
      this.emitProgress('completed', 'scan', 3, 5, `数据库中没有第 ${nextChapterNumber} 章`);
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
    
    console.log('[FanqieSimplePipeline] 找到待发布章节:', toPublish.workTitle, '第', toPublish.chapterNumber, '章 (', toPublish.wordCount, '字)');
    logger.info(`找到待发布章节: ${toPublish.workTitle} 第${toPublish.chapterNumber}章`);
    this.emitProgress('running', 'scan', 3, 5, `找到待发布章节: ${toPublish.workTitle} 第${toPublish.chapterNumber}章 (${toPublish.wordCount}字)`);
    
    // 步骤5: 发布章节
    console.log('[FanqieSimplePipeline] ====== 步骤 4/5: 准备发布 ======');
    const taskStartTime = Date.now();
    const taskDesc = `${toPublish.workTitle} 第${toPublish.chapterNumber}章`;
    this.emitProgress('running', 'publish', 4, 5, `步骤 4/5: 准备发布: ${taskDesc}`);
    console.log('[FanqieSimplePipeline] 准备发布:', taskDesc);
    logger.info(`发布: ${taskDesc}`);
    
    if (dryRun) {
      console.log('[FanqieSimplePipeline] [DRY RUN] ====== 步骤 4/5: 模拟发布 ======');
      this.emitProgress('running', 'publish', 4, 5, '[模拟] 启动浏览器...');
      await delay(500);
      console.log('[FanqieSimplePipeline] [DRY RUN] 查找作品...');
      this.emitProgress('running', 'publish', 4, 5, '[模拟] 查找作品...');
      await delay(500);
      console.log('[FanqieSimplePipeline] [DRY RUN] 检查章节...');
      this.emitProgress('running', 'publish', 4, 5, '[模拟] 检查章节...');
      await delay(500);
      console.log('[FanqieSimplePipeline] [DRY RUN] 填写章节内容...');
      this.emitProgress('running', 'publish', 4, 5, '[模拟] 填写章节内容...');
      await delay(500);
      console.log('[FanqieSimplePipeline] [DRY RUN] 点击发布...');
      this.emitProgress('running', 'publish', 4, 5, '[模拟] 点击发布...');
      await delay(500);
      
      const duration = Date.now() - taskStartTime;
      console.log('[FanqieSimplePipeline] [DRY RUN] 模拟发布成功！耗时:', duration, 'ms');
      results.push({ success: true, task: toPublish, duration });
      this.addResult(true, toPublish.workTitle, toPublish.chapterNumber, toPublish.chapterTitle, '模拟发布成功', duration);
      this.emitProgress('completed', 'done', 5, 5, '步骤 5/5: 模拟发布成功！');
      return results;
    }
    
    try {
      console.log('[FanqieSimplePipeline] ====== 步骤 4/5: 正在发布 ======');
      const result = await this.fanqiePublisher.publishChapter(toPublish, account, { 
        headless,
        onProgress: (p: PublishProgress) => {
          console.log('[FanqieSimplePipeline] [发布进度]', p.action, p.detail || '');
          this.emitProgress('running', 'publish', 4, 5, `步骤 4/5: ${p.action}`, p.detail);
        }
      });
      const duration = Date.now() - taskStartTime;
      
      console.log('[FanqieSimplePipeline] ====== 步骤 5/5: 发布完成 ======');
      console.log('[FanqieSimplePipeline] 发布结果:', result.success ? '成功' : '失败', '耗时:', duration, 'ms');
      
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
        console.log('[FanqieSimplePipeline] ✓ 发布成功！');
        logger.info(`  ✓ 发布成功`);
        this.emitProgress('completed', 'done', 5, 5, '步骤 5/5: 发布成功！');
      } else {
        console.log('[FanqieSimplePipeline] ✗ 发布失败:', result.error);
        logger.error(`  ✗ 发布失败: ${result.error}`);
        this.emitProgress('error', 'done', 5, 5, `发布失败: ${result.error}`);
      }
      
    } catch (error: any) {
      console.log('[FanqieSimplePipeline] ====== 步骤 5/5: 发布异常 ======');
      console.error('[FanqieSimplePipeline] 发布异常:', error);
      const duration = Date.now() - taskStartTime;
      results.push({
        success: false,
        task: toPublish,
        duration,
        error: error.message,
      });
      this.addResult(false, toPublish.workTitle, toPublish.chapterNumber, toPublish.chapterTitle, error.message, duration);
      this.emitProgress('error', 'done', 5, 5, `发布失败: ${error.message}`);
    }
    
    console.log('[FanqieSimplePipeline] ====== publishToFanqie 结束 ======');
    return results;
  }
}
