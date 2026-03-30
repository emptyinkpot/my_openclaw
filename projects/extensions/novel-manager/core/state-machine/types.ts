
/**
 * 状态机模块 - 类型定义
 */

// 章节状态
export type ChapterStatus = 'outline' | 'first_draft' | 'polished' | 'audited' | 'published';

// 状态转换原因
export type StateTransitionReason =
  | 'content_generated'      // 内容生成
  | 'content_polished'       // 内容润色
  | 'audit_passed'           // 审核通过
  | 'audit_failed'           // 审核失败
  | 'published'              // 已发布
  | 'content_cleared'        // 内容清空
  | 'manual_adjustment'      // 手动调整
  | 'system_migration';      // 系统迁移

// 状态转换事件
export interface StateTransitionEvent {
  chapterId: number;
  workId: number;
  chapterNumber: number;
  fromState: ChapterStatus;
  toState: ChapterStatus;
  reason: StateTransitionReason;
  timestamp: Date;
  operator?: string;
  metadata?: Record<string, any>;
}

// 状态转换规则
export interface StateTransitionRule {
  from: ChapterStatus;
  to: ChapterStatus[];
  description: string;
}

// 状态机配置
export interface StateMachineConfig {
  strictMode: boolean;  // 严格模式：不允许非法转换
  logTransitions: boolean;  // 记录转换日志
}
