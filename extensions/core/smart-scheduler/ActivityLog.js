"use strict";
/**
 * 活动日志系统 - 记录所有自动化操作
 *
 * 功能：
 * 1. 记录所有章节处理操作
 * 2. 记录状态变化
 * 3. 提供日志查询接口
 * 4. 支持日志分页
 *
 * @module activity-log
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityLog = void 0;
exports.getActivityLog = getActivityLog;
class ActivityLog {
    constructor() {
        this.logs = [];
        this.maxLogs = 500; // 最多保留 500 条日志
        this.listeners = [];
        this.nextId = 1; // 简单的自增 ID 用于前端
        // 初始化时添加一条启动日志
        this.log('system', '📋 活动日志系统已初始化');
    }
    /**
     * 简单的 log 方法（供前端和快速使用）
     */
    log(type, message) {
        const fullEntry = {
            id: this.nextId++,
            type: type,
            level: 'info',
            message,
            timestamp: new Date().toISOString()
        };
        // @ts-ignore - 临时添加 id 字段用于前端
        this.logs.unshift(fullEntry);
        // 限制日志数量
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }
        // 通知所有监听器
        this.notifyListeners();
    }
    /**
     * 获取最近的日志（带简单 ID，供前端使用）
     */
    getRecentLogs(limit = 50) {
        // 确保所有日志都有 id
        return this.logs.slice(0, limit).map((log, index) => ({
            ...log,
            // @ts-ignore
            id: log.id || (this.nextId - this.logs.length + index)
        }));
    }
    /**
     * 清空日志
     */
    clear() {
        this.logs = [];
        this.nextId = 1;
        this.log('system', '🧹 日志已清除');
        this.notifyListeners();
    }
    /**
     * 添加日志条目
     */
    addEntry(entry) {
        const fullEntry = {
            ...entry,
            id: this.generateId()
        };
        this.logs.unshift(fullEntry); // 新日志加到前面
        // 限制日志数量
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }
        // 通知所有监听器
        this.notifyListeners();
    }
    /**
     * 获取所有日志
     */
    getLogs(limit = 100, offset = 0) {
        return this.logs.slice(offset, offset + limit);
    }
    /**
     * 获取最新的日志
     */
    getLatestLogs(count = 50) {
        return this.logs.slice(0, count);
    }
    /**
     * 清除所有日志
     */
    clearLogs() {
        this.logs = [];
        this.addEntry({
            type: 'system',
            level: 'info',
            message: '🧹 日志已清除',
            timestamp: new Date().toISOString()
        });
        this.notifyListeners();
    }
    /**
     * 添加监听器
     */
    addListener(listener) {
        this.listeners.push(listener);
        // 返回取消订阅函数
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }
    /**
     * 通知所有监听器
     */
    notifyListeners() {
        this.listeners.forEach(listener => {
            try {
                listener(this.logs);
            }
            catch (e) {
                console.error('[ActivityLog] 监听器出错:', e);
            }
        });
    }
    /**
     * 生成唯一 ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    // ========== 便捷方法 ==========
    /**
     * 记录章节生成开始
     */
    logChapterGenerationStart(workId, workTitle, chapterNumber, chapterTitle) {
        this.addEntry({
            type: 'content-craft',
            level: 'info',
            message: `🚀 开始生成: ${workTitle} 第${chapterNumber}章`,
            timestamp: new Date().toISOString(),
            details: {
                workId,
                workTitle,
                chapterNumber,
                chapterTitle
            }
        });
    }
    /**
     * 记录章节生成成功
     */
    logChapterGenerationSuccess(workId, workTitle, chapterNumber, chapterTitle, duration) {
        this.addEntry({
            type: 'content-craft',
            level: 'success',
            message: `✅ 生成完成: ${workTitle} 第${chapterNumber}章`,
            timestamp: new Date().toISOString(),
            details: {
                workId,
                workTitle,
                chapterNumber,
                chapterTitle,
                duration,
                fromState: 'outline',
                toState: 'content_generated'
            }
        });
    }
    /**
     * 记录章节生成失败
     */
    logChapterGenerationError(workId, workTitle, chapterNumber, error, chapterTitle) {
        this.addEntry({
            type: 'content-craft',
            level: 'error',
            message: `❌ 生成失败: ${workTitle} 第${chapterNumber}章 - ${error}`,
            timestamp: new Date().toISOString(),
            details: {
                workId,
                workTitle,
                chapterNumber,
                chapterTitle,
                error
            }
        });
    }
    /**
     * 记录章节润色开始
     */
    logChapterPolishStart(workId, workTitle, chapterNumber, chapterTitle) {
        this.addEntry({
            type: 'content-craft',
            level: 'info',
            message: `✨ 开始润色: ${workTitle} 第${chapterNumber}章`,
            timestamp: new Date().toISOString(),
            details: {
                workId,
                workTitle,
                chapterNumber,
                chapterTitle
            }
        });
    }
    /**
     * 记录章节润色成功
     */
    logChapterPolishSuccess(workId, workTitle, chapterNumber, chapterTitle, duration) {
        this.addEntry({
            type: 'content-craft',
            level: 'success',
            message: `✅ 润色完成: ${workTitle} 第${chapterNumber}章`,
            timestamp: new Date().toISOString(),
            details: {
                workId,
                workTitle,
                chapterNumber,
                chapterTitle,
                duration,
                fromState: 'first_draft',
                toState: 'polished'
            }
        });
    }
    /**
     * 记录章节润色失败
     */
    logChapterPolishError(workId, workTitle, chapterNumber, error, chapterTitle) {
        this.addEntry({
            type: 'content-craft',
            level: 'error',
            message: `❌ 润色失败: ${workTitle} 第${chapterNumber}章 - ${error}`,
            timestamp: new Date().toISOString(),
            details: {
                workId,
                workTitle,
                chapterNumber,
                chapterTitle,
                error
            }
        });
    }
    /**
     * 记录章节审核开始
     */
    logChapterAuditStart(workId, workTitle, chapterNumber, chapterTitle) {
        this.addEntry({
            type: 'audit',
            level: 'info',
            message: `🔍 开始审核: ${workTitle} 第${chapterNumber}章`,
            timestamp: new Date().toISOString(),
            details: {
                workId,
                workTitle,
                chapterNumber,
                chapterTitle
            }
        });
    }
    /**
     * 记录章节审核通过
     */
    logChapterAuditSuccess(workId, workTitle, chapterNumber, chapterTitle, duration, autoFixed) {
        const message = autoFixed
            ? `✅ 审核通过（已自动修复）: ${workTitle} 第${chapterNumber}章`
            : `✅ 审核通过: ${workTitle} 第${chapterNumber}章`;
        this.addEntry({
            type: 'audit',
            level: 'success',
            message,
            timestamp: new Date().toISOString(),
            details: {
                workId,
                workTitle,
                chapterNumber,
                chapterTitle,
                duration,
                fromState: 'polished',
                toState: 'audited'
            }
        });
    }
    /**
     * 记录章节审核失败
     */
    logChapterAuditError(workId, workTitle, chapterNumber, error, chapterTitle) {
        this.addEntry({
            type: 'audit',
            level: 'error',
            message: `❌ 审核失败: ${workTitle} 第${chapterNumber}章 - ${error}`,
            timestamp: new Date().toISOString(),
            details: {
                workId,
                workTitle,
                chapterNumber,
                chapterTitle,
                error
            }
        });
    }
}
exports.ActivityLog = ActivityLog;
// 单例实例
let activityLogInstance = null;
function getActivityLog() {
    if (!activityLogInstance) {
        activityLogInstance = new ActivityLog();
    }
    return activityLogInstance;
}
//# sourceMappingURL=ActivityLog.js.map