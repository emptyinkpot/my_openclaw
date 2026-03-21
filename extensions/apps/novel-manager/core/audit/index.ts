
/**
 * 审稿模块 - 唯一入口点
 * 外部只需要调用这个函数就能走完所有审核流程
 * 低耦合高内聚，模块化设计
 */

import { logger } from '../../utils/logger';
import { delay } from '../../utils/helpers';
import {
  AuditOptions,
  AuditProgressEvent,
  AuditProgressResult,
  AuditTaskResult,
  ChapterData,
} from './types';
import { getPendingAuditChapters, updateChapterStatus, getWork } from './repository';
import { auditChapter, autoFixChapter } from './service';

// 导出所有类型供外部使用
export * from './types';

/**
 * 运行完整审稿流程 - 唯一对外暴露的函数
 * @param options 审核选项
 * @returns 审核任务结果列表
 */
export async function runAuditPipeline(options: AuditOptions = {}): Promise<AuditTaskResult[]> {
  logger.info('开始运行审稿流程');
  
  const results: AuditTaskResult[] = [];
  const progressResults: AuditProgressResult[] = [];
  const startTime = Date.now();
  
  try {
    // 1. 获取待审核章节
    const chapters = await getPendingAuditChapters({
      workId: options.workId,
      chapterRange: options.chapterRange,
    });
    
    logger.info(`找到 ${chapters.length} 个待审核章节`);
    
    if (options.onProgress) {
      options.onProgress({
        status: 'running',
        current: 0,
        total: chapters.length,
        task: '初始化完成，开始审核',
        percent: 0,
        results: progressResults,
        startTime,
        elapsed: 0,
      });
    }

    // 2. 逐个审核章节
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      const chapterStartTime = Date.now();
      
      // 获取作品标题
      let workTitle = '作品';
      try {
        const work = await getWork(chapter.workId);
        if (work) workTitle = work.title;
      } catch (e) {
        // 忽略错误
      }
      
      // 发送进度更新
      if (options.onProgress) {
        options.onProgress({
          status: 'running',
          current: i + 1,
          total: chapters.length,
          task: `正在审核 ${workTitle} 第${chapter.chapterNumber}章`,
          percent: Math.round(((i + 1) / chapters.length) * 100),
          results: progressResults,
          startTime,
          elapsed: Date.now() - startTime,
        });
      }
      
      // 执行审核
      try {
        const auditResult = await auditChapter(chapter.workId, chapter.chapterNumber);
        let duration = Date.now() - chapterStartTime;
        
        let message = '';
        let fixed = false;
        
        // 如果开启了自动修复，并且可以自动修复
        if (options.autoFix && auditResult.canAutoFix) {
          logger.info(`自动修复章节: workId=${chapter.workId}, chapter=${chapter.chapterNumber}`);
          const fixSuccess = await autoFixChapter(chapter.workId, chapter.chapterNumber);
          fixed = fixSuccess;
          message = fixed ? '审核失败，但已自动修复' : '审核失败，自动修复失败';
          duration = Date.now() - chapterStartTime;
        }
        
        const taskResult: AuditTaskResult = {
          success: auditResult.status === 'passed' || fixed,
          chapter,
          duration,
          error: (!(auditResult.status === 'passed') && !fixed) 
            ? auditResult.issues.map(i => i.message).join('; ') 
            : undefined,
        };
        
        results.push(taskResult);
        
        // 如果审核通过或已自动修复，更新章节状态为 audited
        if (taskResult.success) {
          await updateChapterStatus(chapter.workId, chapter.chapterNumber, 'audited');
          progressResults.push({
            success: true,
            workTitle,
            chapterNumber: chapter.chapterNumber,
            chapterTitle: chapter.title || `第${chapter.chapterNumber}章`,
            message: fixed ? '审核失败，但已自动修复，状态已更新为 audited' : '审核通过，状态已更新为 audited',
            duration,
          });
        } else {
          progressResults.push({
            success: false,
            workTitle,
            chapterNumber: chapter.chapterNumber,
            chapterTitle: chapter.title || `第${chapter.chapterNumber}章`,
            message: message || taskResult.error || '审核失败',
            duration,
          });
        }
      } catch (error: any) {
        const duration = Date.now() - chapterStartTime;
        const taskResult: AuditTaskResult = {
          success: false,
          chapter,
          duration,
          error: error.message,
        };
        results.push(taskResult);
        progressResults.push({
          success: false,
          workTitle,
          chapterNumber: chapter.chapterNumber,
          chapterTitle: chapter.title || `第${chapter.chapterNumber}章`,
          message: error.message,
          duration,
        });
      }
      
      // 避免过快请求
      if (i < chapters.length - 1) {
        await delay(500);
      }
    }
    
    // 3. 完成
    if (options.onProgress) {
      options.onProgress({
        status: 'completed',
        current: chapters.length,
        total: chapters.length,
        task: '审核完成',
        percent: 100,
        results: progressResults,
        startTime,
        elapsed: Date.now() - startTime,
      });
    }
    
    logger.info(`审稿流程完成，共审核 ${chapters.length} 个章节，耗时 ${Date.now() - startTime}ms`);
    
  } catch (error: any) {
    logger.error('审稿流程失败:', error);
    
    if (options.onProgress) {
      options.onProgress({
        status: 'error',
        current: 0,
        total: 0,
        task: '审核失败',
        detail: error.message,
        percent: 0,
        results: progressResults,
        startTime,
        elapsed: Date.now() - startTime,
        error: error.message,
      });
    }
    
    throw error;
  }
  
  return results;
}

// 默认导出
export default {
  run: runAuditPipeline,
};

