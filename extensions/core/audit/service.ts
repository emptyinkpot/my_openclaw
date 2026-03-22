
/**
 * 审稿模块 - 核心服务
 * 负责协调规则和数据访问，高内聚
 */

import { logger } from '../plugins/novel-manager/utils/logger';
import {
  ChapterData,
  AuditResult,
  AuditStatus,
  AuditIssue,
  SuggestedAction,
} from './types';
import { runAllAuditRules, autoFixFullWidthSymbols } from './rules';
import { getChapter, saveAuditResult, updateChapterContent } from './repository';

/**
 * 审核章节
 */
export async function auditChapter(workId: number, chapterNumber: number): Promise<AuditResult> {
  logger.info(`开始审核: workId=${workId}, chapter=${chapterNumber}`);

  const chapter = await getChapter(workId, chapterNumber);

  if (!chapter || !chapter.content) {
    const result: AuditResult = {
      status: 'failed',
      issues: [{ type: 'content', message: '章节不存在或内容为空', severity: 'error' }],
      score: 0,
      suggestedAction: 'manual',
      canAutoFix: false,
    };
    await saveAuditResult(workId, chapterNumber, 'failed', result.issues, 'manual');
    return result;
  }

  // 运行所有审稿规则
  const { issues, score, canAutoFix } = runAllAuditRules(chapter.title, chapter.content);

  // 确定审核状态
  const hasErrors = issues.some(issue => issue.severity === 'error');
  const auditStatus: AuditStatus = hasErrors ? 'failed' : 'passed';

  // 确定建议操作
  let suggestedAction: SuggestedAction = 'none';
  if (hasErrors) {
    suggestedAction = canAutoFix ? 'auto_fix' : 'manual';
  }

  const result: AuditResult = {
    status: auditStatus,
    issues,
    score,
    suggestedAction,
    canAutoFix,
  };

  // 保存审核结果
  await saveAuditResult(workId, chapterNumber, auditStatus, issues, suggestedAction);

  logger.info(`审核完成: workId=${workId}, chapter=${chapterNumber}, status=${auditStatus}, score=${score}`);

  return result;
}

/**
 * 自动修复章节
 */
export async function autoFixChapter(workId: number, chapterNumber: number): Promise<boolean> {
  logger.info(`开始自动修复: workId=${workId}, chapter=${chapterNumber}`);

  const chapter = await getChapter(workId, chapterNumber);
  if (!chapter || !chapter.content) {
    logger.warn('章节不存在或内容为空，无法自动修复');
    return false;
  }

  // 执行自动修复
  const fixedContent = autoFixFullWidthSymbols(chapter.content);
  
  if (fixedContent === chapter.content) {
    logger.info('没有需要自动修复的内容');
    return true;
  }

  // 更新章节内容到数据库
  await updateChapterContent(workId, chapterNumber, fixedContent);
  logger.info(`自动修复完成: workId=${workId}, chapter=${chapterNumber}, 内容已更新`);
  
  return true;
}
