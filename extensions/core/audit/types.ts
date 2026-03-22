
/**
 * 审稿模块 - 类型定义
 * 集中管理所有类型，保证类型安全
 */

// 作品状态
export type WorkStatus = 'outline' | 'pending' | 'audited' | 'published';

// 章节状态
export type ChapterStatus = 'outline' | 'first_draft' | 'polished' | 'audited' | 'published';

// 审核状态
export type AuditStatus = 'pending' | 'reviewing' | 'passed' | 'failed';

// 建议操作
export type SuggestedAction = 'auto_fix' | 'manual' | 'none';

// 审核问题严重程度
export type IssueSeverity = 'error' | 'warning' | 'info';

// 审核问题
export interface AuditIssue {
  type: string;
  message: string;
  severity: IssueSeverity;
  position?: {
    line?: number;
    column?: number;
  };
}

// 审核结果
export interface AuditResult {
  status: AuditStatus;
  issues: AuditIssue[];
  score: number;
  suggestedAction: SuggestedAction;
  canAutoFix: boolean;
}

// 章节数据
export interface ChapterData {
  id: number;
  workId: number;
  chapterNumber: number;
  title: string;
  content: string;
  status: ChapterStatus;
}

// 作品数据
export interface WorkData {
  id: number;
  title: string;
  status: WorkStatus;
}

// 审核进度事件
export interface AuditProgressEvent {
  status: 'idle' | 'running' | 'completed' | 'error';
  current: number;
  total: number;
  task: string;
  detail?: string;
  percent: number;
  results: AuditProgressResult[];
  startTime?: number;
  elapsed?: number;
  error?: string;
}

// 审核进度结果
export interface AuditProgressResult {
  success: boolean;
  workTitle: string;
  chapterNumber: number;
  chapterTitle: string;
  message: string;
  duration?: number;
}

// 审核选项
export interface AuditOptions {
  workId?: number;
  chapterRange?: [number, number];
  dryRun?: boolean;
  autoFix?: boolean; // 是否自动修复可修复的问题
  onProgress?: (event: AuditProgressEvent) => void;
}

// 审核任务结果
export interface AuditTaskResult {
  success: boolean;
  chapter: ChapterData;
  duration: number;
  error?: string;
}
