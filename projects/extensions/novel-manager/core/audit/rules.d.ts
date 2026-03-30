/**
 * 审稿模块 - 审稿规则
 * 所有审稿规则集中管理，高内聚低耦合
 */
import { AuditIssue } from './types';
/**
 * 规则1：章节必须有副标题（"第x章 副标题"格式）
 */
export declare function checkChapterTitle(title: string | null): AuditIssue[];
/**
 * 规则2：正文中不能有标题
 */
export declare function checkNoTitlesInContent(content: string): AuditIssue[];
/**
 * 规则3：正文中不能有Markdown语法
 */
export declare function checkNoMarkdown(content: string): AuditIssue[];
/**
 * 规则4：正文中使用日文半角符号
 */
export declare function checkJapaneseHalfWidth(content: string): AuditIssue[];
/**
 * 规则5：正文中不允许有无意义字母数字单词和垃圾字符
 */
export declare function checkNoGarbage(content: string): AuditIssue[];
/**
 * 自动修复1：删除正文中的标题（不影响内容）
 */
export declare function autoFixRemoveTitles(content: string): string;
/**
 * 自动修复2：修复 Markdown 语法（转换为普通文本，不影响内容意思）
 */
export declare function autoFixMarkdown(content: string): string;
/**
 * 自动修复3：删除垃圾字符和无意义单词
 */
export declare function autoFixGarbage(content: string): string;
/**
 * 自动修复：将全角符号转换为半角符号
 */
export declare function autoFixFullWidthSymbols(content: string): string;
/**
 * 完整自动修复：按顺序执行所有自动修复，保证内容信息不受影响
 */
export declare function autoFixAll(content: string): string;
/**
 * 运行所有审稿规则
 */
export declare function runAllAuditRules(title: string | null, content: string): {
    issues: AuditIssue[];
    score: number;
    canAutoFix: boolean;
};
