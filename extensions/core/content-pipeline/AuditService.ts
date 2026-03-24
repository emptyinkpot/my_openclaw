/**
 * 审核服务
 * 负责章节审核状态检查、自动修复
 */

import { getDatabaseManager } from '../database';
import { logger } from '../../plugins/novel-manager/utils/logger';

export type AuditStatus = 'pending' | 'passed' | 'failed';
export type SuggestedAction = 'none' | 'autofix' | 'manual';

export interface AuditIssue {
  type: 'content' | 'format' | 'length' | 'sensitive' | 'other';
  message: string;
  severity: 'warning' | 'error';
  position?: { start: number; end: number };
}

export interface AuditResult {
  status: AuditStatus;
  issues: AuditIssue[];
  score: number;
  suggestedAction: SuggestedAction;
  canAutoFix: boolean;
}

export interface ChapterAuditStatus {
  workId: number;
  chapterNumber: number;
  exists: boolean;
  status: string;
  auditStatus: AuditStatus | null;
  auditIssues: AuditIssue[];
  suggestedAction: SuggestedAction;
  canPublish: boolean;
}

export interface AuditConfig {
  minWordCount: number;
  maxWordCount: number;
  checkSensitiveWords: boolean;
  checkFormat: boolean;
  sensitiveWords: string[];
}

const DEFAULT_AUDIT_CONFIG: AuditConfig = {
  minWordCount: 1000,
  maxWordCount: 20000,
  checkSensitiveWords: true,
  checkFormat: true,
  sensitiveWords: ['政治', '敏感词'],
};

export class AuditService {
  private db = getDatabaseManager();
  private config: AuditConfig;

  constructor(config?: Partial<AuditConfig>) {
    this.config = { ...DEFAULT_AUDIT_CONFIG, ...config };
  }

  async initializeTables(): Promise<void> {
    // 不再添加旧字段，统一使用 status 字段
    logger.info('审核服务初始化完成（使用统一 status 字段）');
  }

  async getChapterAuditStatus(workId: number, chapterNumber: number): Promise<ChapterAuditStatus> {
    const row = await this.db.queryOne(`
      SELECT status
      FROM chapters WHERE work_id = ? AND chapter_number = ?
    `, [workId, chapterNumber]);

    if (!row) {
      return {
        workId, chapterNumber, exists: false, status: '',
        auditStatus: null, auditIssues: [], suggestedAction: 'none', canPublish: false,
      };
    }

    // 基于 status 字段判断审核状态
    const auditStatus: AuditStatus = row.status === 'audited' || row.status === 'published' ? 'passed' : 'pending';
    const canPublish = row.status === 'audited' || row.status === 'published';

    return {
      workId, chapterNumber, exists: true, status: row.status,
      auditStatus, auditIssues: [], suggestedAction: 'none',
      canPublish,
    };
  }

  async auditChapter(workId: number, chapterNumber: number): Promise<AuditResult> {
    logger.info(`开始审核: workId=${workId}, chapter=${chapterNumber}`);

    const chapter = await this.db.queryOne(`
      SELECT content, title FROM chapters WHERE work_id = ? AND chapter_number = ?
    `, [workId, chapterNumber]);

    if (!chapter || !chapter.content) {
      const result: AuditResult = {
        status: 'failed',
        issues: [{ type: 'content', message: '章节不存在或内容为空', severity: 'error' }],
        score: 0, suggestedAction: 'manual', canAutoFix: false,
      };
      await this.saveAuditResult(workId, chapterNumber, result);
      return result;
    }

    const issues: AuditIssue[] = [];
    let score = 100;

    // 审稿规则1：章节必须有副标题（即"第x章 副标题"的形式）
    if (chapter.title) {
      const subtitlePattern = /^第[0-9]+章\s+.+$/;
      if (!subtitlePattern.test(chapter.title)) {
        issues.push({
          type: 'format',
          message: '章节标题格式错误，必须是"第x章 副标题"的形式',
          severity: 'error',
        });
        score -= 20;
      }
    } else {
      issues.push({
        type: 'content',
        message: '章节标题不能为空',
        severity: 'error',
      });
      score -= 20;
    }

    // 审稿规则2：正文中不能有标题
    const titlePattern = /^#{1,6}\s+.+$/gm;
    const titleMatches = chapter.content.match(titlePattern);
    if (titleMatches && titleMatches.length > 0) {
      issues.push({
        type: 'format',
        message: `正文中发现 ${titleMatches.length} 个标题，不允许有标题`,
        severity: 'error',
      });
      score -= 15;
    }

    // 审稿规则3：正文中不能有Markdown语法
    const markdownPatterns = [
      /\*\*.+?\*\*/g,  // 粗体
      /_.+?_/g,        // 斜体
      /\[.+?\]\(.+?\)/g,  // 链接
      /`{1,3}.+?`{1,3}/g,  // 代码
    ];
    let markdownCount = 0;
    markdownPatterns.forEach(pattern => {
      const matches = chapter.content.match(pattern);
      if (matches) markdownCount += matches.length;
    });
    if (markdownCount > 0) {
      issues.push({
        type: 'format',
        message: `正文中发现 ${markdownCount} 处Markdown语法，不允许使用Markdown`,
        severity: 'error',
      });
      score -= 15;
    }

    // 审稿规则4：正文中使用日文半角符号
    const fullWidthPattern = /[、。，；：！？「」『』【】〔〕〖〗〘〙〚〛]/g;
    const fullWidthMatches = chapter.content.match(fullWidthPattern);
    if (fullWidthMatches && fullWidthMatches.length > 0) {
      issues.push({
        type: 'format',
        message: `正文中发现 ${fullWidthMatches.length} 个全角符号，必须使用日文半角符号`,
        severity: 'warning',
      });
      score -= 10;
    }

    // 审稿规则5：正文中不允许有无意义鼓励字母数字单词，不能有垃圾字符
    const garbagePattern = /[a-zA-Z]{10,}/g;
    const garbageMatches = chapter.content.match(garbagePattern);
    if (garbageMatches && garbageMatches.length > 0) {
      issues.push({
        type: 'content',
        message: `正文中发现 ${garbageMatches.length} 个过长字母数字单词，可能是无意义内容`,
        severity: 'warning',
      });
      score -= 10;
    }

    // 检查垃圾字符（控制字符等）
    const controlCharPattern = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
    const controlCharMatches = chapter.content.match(controlCharPattern);
    if (controlCharMatches && controlCharMatches.length > 0) {
      issues.push({
        type: 'content',
        message: `正文中发现 ${controlCharMatches.length} 个控制字符或垃圾字符`,
        severity: 'error',
      });
      score -= 20;
    }

    // 原有字数检查
    const wordCount = this.countWords(chapter.content);
    if (wordCount < this.config.minWordCount) {
      issues.push({
        type: 'length',
        message: `字数不足: ${wordCount} < ${this.config.minWordCount}`,
        severity: 'error',
      });
      score -= 20;
    } else if (wordCount > this.config.maxWordCount) {
      issues.push({
        type: 'length',
        message: `字数超限: ${wordCount} > ${this.config.maxWordCount}`,
        severity: 'warning',
      });
      score -= 10;
    }

    const hasErrors = issues.some(i => i.severity === 'error');
    const status: AuditStatus = hasErrors ? 'failed' : 'passed';
    const canAutoFix = issues.some(i => i.type === 'format' || i.type === 'length');
    const suggestedAction: SuggestedAction = 
      status === 'passed' ? 'none' : canAutoFix ? 'autofix' : 'manual';

    const result: AuditResult = {
      status, issues, score: Math.max(0, score), suggestedAction, canAutoFix,
    };

    // 如果审核通过，直接更新 status 到 audited
    if (status === 'passed') {
      await this.db.execute(`
        UPDATE chapters SET status = ?, updated_at = NOW()
        WHERE work_id = ? AND chapter_number = ?
      `, ['audited', workId, chapterNumber]);
      logger.info(`审核通过: workId=${workId}, chapter=${chapterNumber}, 状态已更新为 audited`);
    }

    logger.info(`审核完成: status=${status}, score=${score}, issues=${issues.length}`);

    return result;
  }

  async getAuditStats(workId?: number): Promise<{
    total: number; pending: number; passed: number; failed: number; autoFixable: number;
  }> {
    let whereClause = 'WHERE content IS NOT NULL';
    const params: any[] = [];

    if (workId) {
      whereClause += ' AND work_id = ?';
      params.push(workId);
    }

    // 基于 status 字段统计
    const stats = await this.db.queryOne(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'polished' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status IN ('audited', 'published') THEN 1 ELSE 0 END) as passed,
        0 as failed,
        0 as auto_fixable
      FROM chapters ${whereClause}
    `, params);

    return {
      total: stats?.total || 0,
      pending: stats?.pending || 0,
      passed: stats?.passed || 0,
      failed: stats?.failed || 0,
      autoFixable: stats?.auto_fixable || 0,
    };
  }

  /**
   * 获取待审核章节列表
   */
  async getPendingAuditChapters(workId?: number): Promise<ChapterAuditStatus[]> {
    let sql = `
      SELECT work_id, chapter_number, status
      FROM chapters 
      WHERE status = 'polished'
    `;
    const params: any[] = [];

    if (workId) {
      sql += ' AND work_id = ?';
      params.push(workId);
    }

    sql += ' ORDER BY work_id, chapter_number';

    const rows = await this.db.query(sql, params);
    
    return rows.map((row: any) => ({
      workId: row.work_id, chapterNumber: row.chapter_number, exists: true,
      status: row.status, auditStatus: 'pending',
      auditIssues: [],
      suggestedAction: 'none', canPublish: false,
    }));
  }

  /**
   * 获取审核失败的章节（暂时返回空，因为不再使用旧字段）
   */
  async getFailedAuditChapters(workId?: number): Promise<ChapterAuditStatus[]> {
    return [];
  }

  /**
   * 批量审核章节
   */
  async auditChapters(
    workId?: number,
    options?: { chapterRange?: [number, number]; onlyPending?: boolean }
  ): Promise<{ total: number; passed: number; failed: number; results: AuditResult[] }> {
    let sql = `SELECT work_id, chapter_number FROM chapters WHERE content IS NOT NULL AND LENGTH(content) > 0`;
    const params: any[] = [];

    if (workId) {
      sql += ' AND work_id = ?';
      params.push(workId);
    }

    if (options?.chapterRange) {
      sql += ' AND chapter_number BETWEEN ? AND ?';
      params.push(options.chapterRange[0], options.chapterRange[1]);
    }

    if (options?.onlyPending) {
      sql += " AND status = 'polished'";
    }

    const chapters = await this.db.query(sql, params);
    const results: AuditResult[] = [];
    let passed = 0;
    let failed = 0;

    for (const chapter of chapters) {
      const result = await this.auditChapter(chapter.work_id, chapter.chapter_number);
      results.push(result);
      if (result.status === 'passed') passed++;
      else failed++;
    }

    return { total: chapters.length, passed, failed, results };
  }

  /**
   * 重置审核状态（将状态改回 polished）
   */
  async resetAuditStatus(workId: number, chapterNumber: number): Promise<void> {
    await this.db.execute(`
      UPDATE chapters 
      SET status = 'polished', updated_at = NOW()
      WHERE work_id = ? AND chapter_number = ?
    `, [workId, chapterNumber]);
    
    logger.info(`已重置审核状态: workId=${workId}, chapter=${chapterNumber}, 状态已改回 polished`);
  }

  private countWords(text: string): number {
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    return chineseChars + englishWords;
  }

  private checkFormat(content: string): AuditIssue[] {
    const issues: AuditIssue[] = [];
    if (/\n{4,}/.test(content)) {
      issues.push({ type: 'format', message: '存在过多连续空行', severity: 'warning' });
    }
    return issues;
  }

  private checkSensitiveWords(content: string): AuditIssue[] {
    const issues: AuditIssue[] = [];
    const lowerContent = content.toLowerCase();
    for (const word of this.config.sensitiveWords) {
      if (lowerContent.includes(word.toLowerCase())) {
        issues.push({ type: 'sensitive', message: `包含敏感词: ${word}`, severity: 'error' });
      }
    }
    return issues;
  }
}
