/**
 * 状态机模块 - 章节状态机核心服务
 *
 * 职责：
 * - 集中管理所有章节状态转换
 * - 验证状态转换的合法性
 * - 记录状态转换日志
 */
import { ChapterStatus, StateTransitionReason, StateTransitionEvent, StateMachineConfig } from './types';
export declare class ChapterStateMachine {
    private config;
    private db;
    constructor(config?: Partial<StateMachineConfig>);
    /**
     * 确保章节状态是合理的（转换前的前置检查）
     */
    private ensureChapterStateValid;
    /**
     * 检查章节是否确实经过润色流程
     */
    hasBeenPolished(chapterId: number): Promise<boolean>;
    /**
     * 检查是否可以从一个状态转换到另一个状态
     */
    canTransition(from: ChapterStatus, to: ChapterStatus): boolean;
    /**
     * 获取允许的目标状态列表
     */
    getAllowedTransitions(from: ChapterStatus): ChapterStatus[];
    /**
     * 执行状态转换（唯一入口）
     */
    transition(chapterId: number, toState: ChapterStatus, reason: StateTransitionReason, options?: {
        operator?: string;
        metadata?: Record<string, any>;
    }): Promise<boolean>;
    /**
     * 记录状态转换事件
     */
    private logTransition;
    /**
     * 确保状态转换日志表存在
     */
    private ensureTransitionLogTable;
    /**
     * 获取状态显示名称
     */
    getStatusLabel(status: ChapterStatus): string;
    /**
     * 获取章节的状态转换历史
     */
    getTransitionHistory(chapterId: number, limit?: number): Promise<StateTransitionEvent[]>;
}
export declare function getChapterStateMachine(config?: Partial<StateMachineConfig>): ChapterStateMachine;
