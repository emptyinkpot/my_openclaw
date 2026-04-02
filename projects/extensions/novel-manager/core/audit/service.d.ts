/**
 * 审稿模块 - 核心服务
 * 负责协调规则和数据访问，高内聚
 */
import { AuditResult } from './types';
/**
 * 审核章节
 */
export declare function auditChapter(workId: number, chapterNumber: number): Promise<AuditResult>;
/**
 * 自动修复章节（完整修复：删除标题、修复Markdown、删除垃圾字符、转换全角符号）
 */
export declare function autoFixChapter(workId: number, chapterNumber: number): Promise<boolean>;
