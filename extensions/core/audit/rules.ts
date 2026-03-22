
/**
 * 审稿模块 - 审稿规则
 * 所有审稿规则集中管理，高内聚低耦合
 */

import { AuditIssue, IssueSeverity } from './types';

/**
 * 规则1：章节必须有副标题（"第x章 副标题"格式）
 */
export function checkChapterTitle(title: string | null): AuditIssue[] {
  const issues: AuditIssue[] = [];
  
  if (!title) {
    issues.push({
      type: 'content',
      message: '章节标题不能为空',
      severity: 'error',
    });
    return issues;
  }

  const subtitlePattern = /^第[0-9]+章\s+.+$/;
  if (!subtitlePattern.test(title)) {
    issues.push({
      type: 'format',
      message: '章节标题格式错误，必须是"第x章 副标题"的形式',
      severity: 'error',
    });
  }

  return issues;
}

/**
 * 规则2：正文中不能有标题
 */
export function checkNoTitlesInContent(content: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const titlePattern = /^#{1,6}\s+.+$/gm;
  const titleMatches = content.match(titlePattern);
  
  if (titleMatches && titleMatches.length > 0) {
    issues.push({
      type: 'format',
      message: `正文中发现 ${titleMatches.length} 个标题，不允许有标题`,
      severity: 'error',
    });
  }

  return issues;
}

/**
 * 规则3：正文中不能有Markdown语法
 */
export function checkNoMarkdown(content: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const markdownPatterns = [
    /\*\*.+?\*\*/g,  // 粗体
    /_.+?_/g,        // 斜体
    /\[.+?\]\(.+?\)/g,  // 链接
    /`{1,3}.+?`{1,3}/g,  // 代码
  ];
  
  let markdownCount = 0;
  markdownPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) markdownCount += matches.length;
  });
  
  if (markdownCount > 0) {
    issues.push({
      type: 'format',
      message: `正文中发现 ${markdownCount} 处Markdown语法，不允许使用Markdown`,
      severity: 'error',
    });
  }

  return issues;
}

/**
 * 规则4：正文中使用日文半角符号
 */
export function checkJapaneseHalfWidth(content: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const fullWidthPattern = /[、。，；：！？「」『』【】〔〕〖〗〘〙〚〛]/g;
  const fullWidthMatches = content.match(fullWidthPattern);
  
  if (fullWidthMatches && fullWidthMatches.length > 0) {
    issues.push({
      type: 'format',
      message: `正文中发现 ${fullWidthMatches.length} 个全角符号，必须使用日文半角符号`,
      severity: 'warning',
    });
  }

  return issues;
}

/**
 * 规则5：正文中不允许有无意义字母数字单词和垃圾字符
 */
export function checkNoGarbage(content: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  
  // 检查无意义字母数字单词
  const garbageWordPattern = /\b[a-zA-Z0-9]{10,}\b/g;
  const garbageWordMatches = content.match(garbageWordPattern);
  
  if (garbageWordMatches && garbageWordMatches.length > 0) {
    issues.push({
      type: 'content',
      message: `正文中发现 ${garbageWordMatches.length} 个无意义字母数字单词`,
      severity: 'error',
    });
  }

  // 检查垃圾字符
  const garbageCharPattern = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
  const garbageCharMatches = content.match(garbageCharPattern);
  
  if (garbageCharMatches && garbageCharMatches.length > 0) {
    issues.push({
      type: 'content',
      message: `正文中发现 ${garbageCharMatches.length} 个垃圾字符`,
      severity: 'error',
    });
  }

  return issues;
}

/**
 * 自动修复：将全角符号转换为半角符号
 */
export function autoFixFullWidthSymbols(content: string): string {
  const fullWidthToHalfWidth: Record<string, string> = {
    '、': ',',
    '。': '.',
    '，': ',',
    '；': ';',
    '：': ':',
    '！': '!',
    '？': '?',
    '「': '"',
    '」': '"',
    '『': '"',
    '』': '"',
    '【': '[',
    '】': ']',
  };

  let result = content;
  for (const [full, half] of Object.entries(fullWidthToHalfWidth)) {
    result = result.split(full).join(half);
  }

  return result;
}

/**
 * 运行所有审稿规则
 */
export function runAllAuditRules(title: string | null, content: string): {
  issues: AuditIssue[];
  score: number;
  canAutoFix: boolean;
} {
  let issues: AuditIssue[] = [];
  let score = 100;

  // 运行所有规则
  issues = issues.concat(checkChapterTitle(title));
  issues = issues.concat(checkNoTitlesInContent(content));
  issues = issues.concat(checkNoMarkdown(content));
  issues = issues.concat(checkJapaneseHalfWidth(content));
  issues = issues.concat(checkNoGarbage(content));

  // 计算分数
  issues.forEach(issue => {
    if (issue.severity === 'error') score -= 20;
    else if (issue.severity === 'warning') score -= 10;
  });

  // 检查是否可以自动修复
  const canAutoFix = issues.some(issue => issue.type === 'format' && issue.message.includes('全角符号'));

  return {
    issues,
    score: Math.max(0, score),
    canAutoFix,
  };
}
