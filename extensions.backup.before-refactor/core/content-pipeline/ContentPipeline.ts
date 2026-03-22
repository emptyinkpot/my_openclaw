/**
 * 审稿模块 - 章节审核调度
 * 协调待审核章节的审核流程
 * 
 * 这是核心编排层，统筹整个审稿流程
 */

import { StateService } from './StateService';
import { TaskMonitor } from './TaskMonitor';
import { AuditService, AuditResult } from './AuditService';
import { getChapterRepository, ChapterData } from './ChapterRepository';
import { logger } from '../../plugins/novel-manager/utils/logger';
import { getConfig } from '../config';
import { delay } from '../../plugins/novel-manager/utils/helpers';
import { getDatabaseManager } from '../storage/database';

// 流水线步骤定义
export type PipelineStep = 
  | 'init'       // 初始化
  | 'scan'       // 扫描待审核章节
  | 'audit'      // 审核
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
  dryRun?: boolean;
  maxConcurrent?: number;
  onProgress?: (event: PipelineProgressEvent) => void;
}

// 作品状态定义
export type WorkStatus = 'outline' | 'pending' | 'audited' | 'published';
export type ChapterStatus = 'outline' | 'pending' | 'audited' | 'published';

/**
 * 审稿模块 - 审核调度
 */
export class ContentPipeline {
  private state: StateService;
  private monitor: TaskMonitor;
  private auditService: AuditService;
  private db = getDatabaseManager();
  private running: boolean = false;
  private abortController: AbortController | null = null;
  private progressCallback?: (event: PipelineProgressEvent) => void;
  private startTime?: number;
  private progressResults: ProgressResult[] = [];
  
  constructor() {
    this.state = new StateService();
    this.monitor = new TaskMonitor();
    this.auditService = new AuditService();
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
    
    if (this.progressCallback) {
      this.progressCallback(event);
    }
    
    return event;
  }
  
  /**
   * 运行完整流程：检测 → 润色 → 审核 → 发布
   */
  async runSchedule(options: PipelineOptions = {}): Promise<TaskResult[]> {
    return this.run(options);
  }
  
  /**
   * 审稿调度主函数
   * 审核所有待审核章节，审核通过后状态变为 audited
   */
  async run(options: PipelineOptions = {}): Promise<TaskResult[]> {
    if (!this.running) {
      await this.start();
    }
    
    const results: TaskResult[] = [];
    const startTime = Date.now();
    
    try {
      const chapters = await this.getPendingAuditChapters(options);
      logger.info(`找到 ${chapters.length} 个待审核章节`);
      
      for (let i = 0; i < chapters.length; i++) {
        if (this.abortController?.signal.aborted) break;
        
        const chapter = chapters[i];
        this.emitProgress('running', 'audit', i + 1, chapters.length, 
          `审核 ${chapter.workTitle || '作品'} 第${chapter.chapterNumber}章`);
        
        // 执行审核
        const auditResult = await this.runAuditTask(chapter);
        results.push(auditResult);
        
        // 如果审核通过，更新章节状态为 audited
        if (auditResult.success) {
          await this.updateChapterStatus(chapter.workId, chapter.chapterNumber, 'audited');
          this.progressResults.push({
            success: true,
            workTitle: chapter.workTitle || '作品',
            chapterNumber: chapter.chapterNumber,
            chapterTitle: chapter.chapterTitle || `第${chapter.chapterNumber}章`,
            message: '审核通过，状态已更新为 audited',
            duration: auditResult.duration,
          });
        } else {
          this.progressResults.push({
            success: false,
            workTitle: chapter.workTitle || '作品',
            chapterNumber: chapter.chapterNumber,
            chapterTitle: chapter.chapterTitle || `第${chapter.chapterNumber}章`,
            message: auditResult.error || '审核失败',
            duration: auditResult.duration,
          });
        }
        
        this.state.setProcessedIndex(i + 1);
        if (i < chapters.length - 1) await delay(1000);
      }
      
      logger.info(`审稿完成，共审核 ${chapters.length} 个章节，耗时 ${Date.now() - startTime}ms`);
      
    } catch (error: any) {
      logger.error('审稿失败:', error);
      throw error;
    }
    
    return results;
  }
  
  /**
   * 获取待审核章节
   */
  private async getPendingAuditChapters(options: PipelineOptions): Promise<any[]> {
    let sql = `
      SELECT c.id, c.work_id, c.chapter_number, c.title, c.content, w.title as work_title
      FROM chapters c
      LEFT JOIN works w ON c.work_id = w.id
      WHERE c.status = 'pending'
    `;
    const params: any[] = [];

    if (options.workId) {
      sql += ' AND c.work_id = ?';
      params.push(options.workId);
    }

    if (options.chapterRange) {
      sql += ' AND c.chapter_number BETWEEN ? AND ?';
      params.push(options.chapterRange[0], options.chapterRange[1]);
    }

    sql += ' ORDER BY c.work_id, c.chapter_number';

    const rows = await this.db.query(sql, params);
    
    return rows.map((row: any) => ({
      id: row.id,
      workId: row.work_id,
      workTitle: row.work_title,
      chapterNumber: row.chapter_number,
      chapterTitle: row.title,
      content: row.content,
    }));
  }
  
  /**
   * 执行审核任务
   */
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
  
  /**
   * 更新章节状态
   */
  private async updateChapterStatus(workId: number, chapterNumber: number, status: ChapterStatus): Promise<void> {
    await this.db.execute(`
      UPDATE chapters SET status = ?, updated_at = NOW()
      WHERE work_id = ? AND chapter_number = ?
    `, [status, workId, chapterNumber]);
    
    logger.info(`已更新章节状态: workId=${workId}, chapter=${chapterNumber}, status=${status}`);
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
}
