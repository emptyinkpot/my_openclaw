/**
 * 状态机模块 - 配置和规则定义
 */
import { ChapterStatus, StateTransitionRule, StateMachineConfig } from './types';
export declare const DEFAULT_CONFIG: StateMachineConfig;
export declare const STATE_TRANSITION_RULES: StateTransitionRule[];
export declare const STATUS_LABELS: Record<ChapterStatus, string>;
export declare const STATUS_COLORS: Record<ChapterStatus, string>;
