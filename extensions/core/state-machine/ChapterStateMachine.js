"use strict";
/**
 * 状态机模块 - 章节状态机核心服务
 *
 * 职责：
 * - 集中管理所有章节状态转换
 * - 验证状态转换的合法性
 * - 记录状态转换日志
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChapterStateMachine = void 0;
exports.getChapterStateMachine = getChapterStateMachine;
const database_1 = require("../database");
const logger_1 = require("../../plugins/novel-manager/utils/logger");
const config_1 = require("./config");
class ChapterStateMachine {
    constructor(config) {
        this.db = (0, database_1.getDatabaseManager)();
        this.config = { ...config_1.DEFAULT_CONFIG, ...config };
    }
    /**
     * 确保章节状态是合理的（转换前的前置检查）
     */
    async ensureChapterStateValid(chapter) {
        // 合法状态列表（确保所有章节都在这个列表中）
        const LEGAL_STATUSES = ['outline', 'first_draft', 'polished', 'audited', 'published'];
        let newStatus = chapter.status;
        let needFix = false;
        try {
            // 规则0：确保状态在合法列表中，如果不在，强制归入正确状态
            if (!LEGAL_STATUSES.includes(chapter.status)) {
                logger_1.logger.warn(`[StateMachine] 章节 ${chapter.work_id}-${chapter.chapter_number} 状态不在合法列表: ${chapter.status}，将强制修正`);
            }
            // 严格判断：是否有内容
            const hasContent = !!(chapter.content &&
                typeof chapter.content === 'string' &&
                chapter.content.trim().length > 0 &&
                chapter.word_count &&
                chapter.word_count > 0);
            // 严格判断：是否经过润色流程
            let hasBeenPolished = false;
            try {
                if (chapter.polish_info) {
                    const polishInfo = typeof chapter.polish_info === 'string'
                        ? JSON.parse(chapter.polish_info)
                        : chapter.polish_info;
                    hasBeenPolished = !!(polishInfo && polishInfo.hasBeenPolished === true);
                }
            }
            catch (e) {
                // 解析失败，视为未经过润色
                hasBeenPolished = false;
            }
            // ========== 强制归入正确状态（确保 100% 覆盖）==========
            // 情况 A：没有内容 → 必须是 outline
            if (!hasContent) {
                if (chapter.status !== 'outline') {
                    newStatus = 'outline';
                    needFix = true;
                    logger_1.logger.info(`[StateMachine] 章节 ${chapter.work_id}-${chapter.chapter_number} 无内容，强制修正: ${chapter.status} → outline`);
                }
            }
            // 情况 B：有内容但未经过润色 → 必须是 first_draft
            else if (hasContent && !hasBeenPolished) {
                if (!['first_draft'].includes(chapter.status)) {
                    newStatus = 'first_draft';
                    needFix = true;
                    logger_1.logger.info(`[StateMachine] 章节 ${chapter.work_id}-${chapter.chapter_number} 有内容但未润色，强制修正: ${chapter.status} → first_draft`);
                }
            }
            // 情况 C：有内容且经过润色 → 必须是 polished/audited/published 中的一个
            else if (hasContent && hasBeenPolished) {
                if (!['polished', 'audited', 'published'].includes(chapter.status)) {
                    newStatus = 'polished'; // 默认归到 polished
                    needFix = true;
                    logger_1.logger.info(`[StateMachine] 章节 ${chapter.work_id}-${chapter.chapter_number} 已润色但状态不正确，强制修正: ${chapter.status} → polished`);
                }
            }
            // 如果需要修复，执行更新
            if (needFix && newStatus !== chapter.status) {
                await this.db.execute(`
          UPDATE chapters SET status = ?, updated_at = NOW() WHERE id = ?
        `, [newStatus, chapter.id]);
                logger_1.logger.info(`[StateMachine] 修复章节 ${chapter.work_id}-${chapter.chapter_number}: ${chapter.status} → ${newStatus}`);
            }
        }
        catch (err) {
            logger_1.logger.error(`[StateMachine] 前置检查失败: ${chapter.id}`, err);
            // 即使失败也不要阻止后续流程
        }
    }
    /**
     * 检查章节是否确实经过润色流程
     */
    async hasBeenPolished(chapterId) {
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
            }
            catch (e) {
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
            }
            catch (e) {
                // polish_info 字段可能不存在，忽略
            }
            return false;
        }
        catch (error) {
            logger_1.logger.error('[StateMachine] 检查润色状态失败', error);
            return false;
        }
    }
    /**
     * 检查是否可以从一个状态转换到另一个状态
     */
    canTransition(from, to) {
        const rule = config_1.STATE_TRANSITION_RULES.find(r => r.from === from);
        if (!rule) {
            return false;
        }
        return rule.to.includes(to);
    }
    /**
     * 获取允许的目标状态列表
     */
    getAllowedTransitions(from) {
        const rule = config_1.STATE_TRANSITION_RULES.find(r => r.from === from);
        return rule ? [...rule.to] : [];
    }
    /**
     * 执行状态转换（唯一入口）
     */
    async transition(chapterId, toState, reason, options) {
        // 1. 获取当前章节数据
        const chapter = await this.db.queryOne('SELECT * FROM chapters WHERE id = ?', [chapterId]);
        if (!chapter) {
            logger_1.logger.error(`[StateMachine] 章节不存在: id=${chapterId}`);
            return false;
        }
        // 2. 直接获取当前状态，不做强制修正（避免干扰明确的状态转换）
        const fromState = chapter.status;
        // 4. 如果状态没有变化，直接返回
        if (fromState === toState) {
            logger_1.logger.debug(`[StateMachine] 状态未变化: id=${chapterId}, state=${fromState}`);
            return true;
        }
        // 5. 特殊验证：只有确实经过润色流程的才能转换到 polished（除非 reason 是 content_polished）
        if (toState === 'polished' && reason !== 'content_polished') {
            // 检查章节是否确实经过润色流程
            const hasBeenPolished = await this.hasBeenPolished(chapterId);
            if (!hasBeenPolished) {
                logger_1.logger.warn(`[StateMachine] 拒绝转换到 polished: 章节未经过润色流程, id=${chapterId}, reason=${reason}`);
                return false;
            }
        }
        // 但如果 reason 是 content_polished，我们直接信任调用方，允许转换到 polished
        // 因为调用方已经完成了润色流程并更新了 polish_info
        // 6. 验证转换是否合法
        if (this.config.strictMode && !this.canTransition(fromState, toState)) {
            logger_1.logger.error(`[StateMachine] 非法状态转换: id=${chapterId}, ${fromState} → ${toState}, reason=${reason}`);
            return false;
        }
        // 4. 执行状态转换
        try {
            await this.db.execute('UPDATE chapters SET status = ?, updated_at = NOW() WHERE id = ?', [toState, chapterId]);
            logger_1.logger.info(`[StateMachine] 状态转换成功: id=${chapterId}, ${fromState} → ${toState}, reason=${reason}`);
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
        }
        catch (error) {
            logger_1.logger.error(`[StateMachine] 状态转换失败: id=${chapterId}, ${fromState} → ${toState}`, error);
            return false;
        }
    }
    /**
     * 记录状态转换事件
     */
    async logTransition(event) {
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
        }
        catch (error) {
            logger_1.logger.warn('[StateMachine] 记录状态转换日志失败', error);
            // 不影响主流程，只记录警告
        }
    }
    /**
     * 确保状态转换日志表存在
     */
    async ensureTransitionLogTable() {
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
        }
        catch (error) {
            // 表可能已经存在，忽略错误
        }
    }
    /**
     * 获取状态显示名称
     */
    getStatusLabel(status) {
        return config_1.STATUS_LABELS[status] || status;
    }
    /**
     * 获取章节的状态转换历史
     */
    async getTransitionHistory(chapterId, limit = 20) {
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
                fromState: row.from_state,
                toState: row.to_state,
                reason: row.reason,
                timestamp: new Date(row.timestamp),
                operator: row.operator,
                metadata: row.metadata ? JSON.parse(row.metadata) : undefined
            }));
        }
        catch (error) {
            logger_1.logger.error('[StateMachine] 获取状态转换历史失败', error);
            return [];
        }
    }
}
exports.ChapterStateMachine = ChapterStateMachine;
// 单例实例
let stateMachineInstance = null;
function getChapterStateMachine(config) {
    if (!stateMachineInstance) {
        stateMachineInstance = new ChapterStateMachine(config);
    }
    return stateMachineInstance;
}
//# sourceMappingURL=ChapterStateMachine.js.map