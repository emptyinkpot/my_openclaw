
/**
 * 状态机模块 - 章节状态机核心服务
 * 
 * 职责：
 * - 集中管理所有章节状态转换
 * - 验证状态转换的合法性
 * - 记录状态转换日志
 */

import { getDatabaseManager } from '../database';
import { logger } from '../../plugins/novel-manager/utils/logger';
import {
  ChapterStatus,
  StateTransitionReason,
  StateTransitionEvent,
  StateMachineConfig
} from './types';
import {
  DEFAULT_CONFIG,
  STATE_TRANSITION_RULES,
  STATUS_LABELS
} from './config';

export class ChapterStateMachine {
  private config: StateMachineConfig;
  private db = getDatabaseManager();

  constructor(config?: Partial<StateMachineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 检查章节是否确实经过润色流程
   */
  async hasBeenPolished(chapterId: number): Promise<boolean> {
    try {
      // 方案1：检查状态转换历史中是否有 content_polished 记录
      try {
        const transitionLog = await this.db.queryOne(`
          SELECT id FROM state_transition_logs 
          WHERE chapter_id = ? AND reason = 'content_polished'
          LIMIT 1
        `, [chapterId]);
        
        if (transitionLog) {
          return true;
        }
      } catch (e) {
        // state_transition_logs 表可能不存在，忽略
      }
      
      // 方案2：检查 chapters 表的 polish_info 字段（如果有）
      try {
        const chapter = await this.db.queryOne(`
          SELECT polish_info FROM chapters WHERE id = ?
        `, [chapterId]);
        
        if (chapter && chapter.polish_info) {
          const polishInfo = JSON.parse(chapter.polish_info);
          return polishInfo && polishInfo.hasBeenPolished === true;
        }
      } catch (e) {
        // polish_info 字段可能不存在，忽略
      }
      
      return false;
    } catch (error) {
      logger.error('[StateMachine] 检查润色状态失败', error);
      return false;
    }
  }

  /**
   * 检查是否可以从一个状态转换到另一个状态
   */
  canTransition(from: ChapterStatus, to: ChapterStatus): boolean {
    const rule = STATE_TRANSITION_RULES.find(r => r.from === from);
    if (!rule) {
      return false;
    }
    return rule.to.includes(to);
  }

  /**
   * 获取允许的目标状态列表
   */
  getAllowedTransitions(from: ChapterStatus): ChapterStatus[] {
    const rule = STATE_TRANSITION_RULES.find(r => r.from === from);
    return rule ? [...rule.to] : [];
  }

  /**
   * 执行状态转换（唯一入口）
   */
  async transition(
    chapterId: number,
    toState: ChapterStatus,
    reason: StateTransitionReason,
    options?: {
      operator?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<boolean> {
    // 1. 获取当前章节数据
    const chapter = await this.db.queryOne(
      'SELECT * FROM chapters WHERE id = ?',
      [chapterId]
    );

    if (!chapter) {
      logger.error(`[StateMachine] 章节不存在: id=${chapterId}`);
      return false;
    }

    const fromState = chapter.status as ChapterStatus;

    // 2. 如果状态没有变化，直接返回
    if (fromState === toState) {
      logger.debug(`[StateMachine] 状态未变化: id=${chapterId}, state=${fromState}`);
      return true;
    }

    // 3. 特殊验证：只有确实经过润色流程的才能转换到 polished
    if (toState === 'polished' && reason !== 'content_polished') {
      // 检查章节是否确实经过润色流程
      const hasBeenPolished = await this.hasBeenPolished(chapterId);
      if (!hasBeenPolished) {
        logger.warn(
          `[StateMachine] 拒绝转换到 polished: 章节未经过润色流程, id=${chapterId}, reason=${reason}`
        );
        return false;
      }
    }

    // 4. 验证转换是否合法
    if (this.config.strictMode && !this.canTransition(fromState, toState)) {
      logger.error(
        `[StateMachine] 非法状态转换: id=${chapterId}, ${fromState} → ${toState}, reason=${reason}`
      );
      return false;
    }

    // 4. 执行状态转换
    try {
      await this.db.execute(
        'UPDATE chapters SET status = ?, updated_at = NOW() WHERE id = ?',
        [toState, chapterId]
      );

      logger.info(
        `[StateMachine] 状态转换成功: id=${chapterId}, ${fromState} → ${toState}, reason=${reason}`
      );

      // 5. 记录转换事件（如果启用）
      if (this.config.logTransitions) {
        await this.logTransition({
          chapterId,
          workId: chapter.work_id,
          chapterNumber: chapter.chapter_number,
          fromState,
          toState,
          reason,
          timestamp: new Date(),
          operator: options?.operator,
          metadata: options?.metadata
        });
      }

      return true;
    } catch (error) {
      logger.error(
        `[StateMachine] 状态转换失败: id=${chapterId}, ${fromState} → ${toState}`,
        error
      );
      return false;
    }
  }

  /**
   * 记录状态转换事件
   */
  private async logTransition(event: StateTransitionEvent): Promise<void> {
    try {
      // 尝试创建状态转换日志表（如果不存在）
      await this.ensureTransitionLogTable();

      await this.db.execute(`
        INSERT INTO state_transition_logs (
          chapter_id, work_id, chapter_number, 
          from_state, to_state, reason, 
          timestamp, operator, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        event.chapterId,
        event.workId,
        event.chapterNumber,
        event.fromState,
        event.toState,
        event.reason,
        event.timestamp,
        event.operator || 'system',
        event.metadata ? JSON.stringify(event.metadata) : null
      ]);
    } catch (error) {
      logger.warn('[StateMachine] 记录状态转换日志失败', error);
      // 不影响主流程，只记录警告
    }
  }

  /**
   * 确保状态转换日志表存在
   */
  private async ensureTransitionLogTable(): Promise<void> {
    try {
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS state_transition_logs (
          id INT PRIMARY KEY AUTO_INCREMENT,
          chapter_id INT NOT NULL,
          work_id INT NOT NULL,
          chapter_number INT NOT NULL,
          from_state VARCHAR(50) NOT NULL,
          to_state VARCHAR(50) NOT NULL,
          reason VARCHAR(50) NOT NULL,
          timestamp DATETIME NOT NULL,
          operator VARCHAR(100),
          metadata JSON,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_chapter (chapter_id),
          INDEX idx_work (work_id),
          INDEX idx_timestamp (timestamp)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } catch (error) {
      // 表可能已经存在，忽略错误
    }
  }

  /**
   * 获取状态显示名称
   */
  getStatusLabel(status: ChapterStatus): string {
    return STATUS_LABELS[status] || status;
  }

  /**
   * 获取章节的状态转换历史
   */
  async getTransitionHistory(chapterId: number, limit: number = 20): Promise<StateTransitionEvent[]> {
    try {
      const rows = await this.db.query(`
        SELECT * FROM state_transition_logs 
        WHERE chapter_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `, [chapterId, limit]);

      return rows.map(row => ({
        chapterId: row.chapter_id,
        workId: row.work_id,
        chapterNumber: row.chapter_number,
        fromState: row.from_state as ChapterStatus,
        toState: row.to_state as ChapterStatus,
        reason: row.reason as StateTransitionReason,
        timestamp: new Date(row.timestamp),
        operator: row.operator,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      }));
    } catch (error) {
      logger.error('[StateMachine] 获取状态转换历史失败', error);
      return [];
    }
  }
}

// 单例实例
let stateMachineInstance: ChapterStateMachine | null = null;

export function getChapterStateMachine(config?: Partial<StateMachineConfig>): ChapterStateMachine {
  if (!stateMachineInstance) {
    stateMachineInstance = new ChapterStateMachine(config);
  }
  return stateMachineInstance;
}
