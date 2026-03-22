"use strict";
/**
 * 智能调度器 - 统一管理 Content Craft 和审核自动处理服务
 *
 * 功能：
 * 1. 统一的开关控制
 * 2. 智能调度两个服务，避免冲突
 * 3. 实时日志记录
 * 4. 状态管理
 *
 * @module smart-scheduler
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartScheduler = void 0;
exports.getSmartScheduler = getSmartScheduler;
const logger_1 = require("../../plugins/novel-manager/utils/logger");
const src_1 = require("../content-craft/src");
const audit_1 = require("../audit");
const ActivityLog_1 = require("./ActivityLog");
class SmartScheduler {
    constructor() {
        this.running = false;
        this.timer = null;
        this.lastRunTime = null;
        this.currentTask = null;
        this.config = {
            enabled: false,
            processInterval: 60,
            maxChaptersPerRun: 3,
            contentCraft: {
                relatedChapterCount: 3,
                autoPolish: true
            },
            audit: {
                autoFix: true
            }
        };
        this.contentCraftService = (0, src_1.getContentCraftAutoService)();
        this.auditService = (0, audit_1.getAuditAutoService)();
        this.activityLog = (0, ActivityLog_1.getActivityLog)();
    }
    /**
     * 获取当前状态
     */
    getStatus() {
        return {
            running: this.running,
            lastRunTime: this.lastRunTime?.toISOString() || null,
            currentTask: this.currentTask,
            contentCraftStatus: this.contentCraftService.getStatus(),
            auditStatus: this.auditService.getStatus()
        };
    }
    /**
     * 获取配置
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * 更新配置
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        logger_1.logger.info('[SmartScheduler] 配置已更新:', this.config);
        // 更新两个服务的配置
        this.contentCraftService.updateConfig({
            processInterval: this.config.processInterval,
            maxChaptersPerRun: this.config.maxChaptersPerRun,
            relatedChapterCount: this.config.contentCraft.relatedChapterCount,
            autoPolish: this.config.contentCraft.autoPolish
        });
        this.auditService.updateConfig({
            processInterval: this.config.processInterval,
            maxChaptersPerRun: this.config.maxChaptersPerRun,
            autoFix: this.config.audit.autoFix
        });
        // 如果启用状态改变，控制服务
        if (newConfig.enabled !== undefined) {
            if (newConfig.enabled) {
                this.start();
            }
            else {
                this.stop();
            }
        }
        else if (newConfig.processInterval !== undefined && this.running) {
            this.restartTimer();
        }
    }
    /**
     * 启动智能调度器
     */
    start() {
        if (this.running) {
            logger_1.logger.warn('[SmartScheduler] 调度器已在运行中');
            return;
        }
        this.running = true;
        this.config.enabled = true;
        logger_1.logger.info('[SmartScheduler] 智能调度器已启动');
        this.activityLog.log('system', '🤖 智能调度器已启动');
        // 立即执行一次调度
        setTimeout(() => {
            this.runScheduledTask();
        }, 1000);
        // 启动定时器
        this.startTimer();
    }
    /**
     * 停止智能调度器
     */
    stop() {
        if (!this.running) {
            logger_1.logger.warn('[SmartScheduler] 调度器未在运行');
            return;
        }
        this.running = false;
        this.config.enabled = false;
        // 停止两个服务
        this.contentCraftService.stop();
        this.auditService.stop();
        this.stopTimer();
        logger_1.logger.info('[SmartScheduler] 智能调度器已停止');
        this.activityLog.log('system', '🛑 智能调度器已停止');
    }
    /**
     * 启动定时器
     */
    startTimer() {
        this.stopTimer();
        this.timer = setInterval(() => {
            this.runScheduledTask();
        }, this.config.processInterval * 1000);
        logger_1.logger.info(`[SmartScheduler] 定时器已启动，间隔: ${this.config.processInterval}秒`);
    }
    /**
     * 停止定时器
     */
    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    /**
     * 重启定时器
     */
    restartTimer() {
        this.stopTimer();
        if (this.running) {
            this.startTimer();
        }
    }
    /**
     * 执行调度任务
     */
    async runScheduledTask() {
        if (!this.running) {
            return;
        }
        try {
            this.lastRunTime = new Date();
            logger_1.logger.info('[SmartScheduler] 开始调度任务...');
            this.currentTask = '正在检查待处理章节...';
            // 智能调度：先运行 Content Craft，再运行审核
            // 这样可以确保生成/润色完成的章节能立即进入审核流程
            // 1. 先启动 Content Craft 服务（如果还没启动）
            const contentCraftStatus = this.contentCraftService.getStatus();
            if (!contentCraftStatus.running) {
                this.contentCraftService.start();
                this.activityLog.log('system', '🚀 Content Craft 自动处理服务已启动');
            }
            // 2. 等待一小会儿，让 Content Craft 处理
            await this.sleep(2000);
            // 3. 再启动审核服务（如果还没启动）
            const auditStatus = this.auditService.getStatus();
            if (!auditStatus.running) {
                this.auditService.start();
                this.activityLog.log('system', '✅ 审核自动处理服务已启动');
            }
            this.currentTask = null;
            logger_1.logger.info('[SmartScheduler] 调度任务完成');
        }
        catch (error) {
            logger_1.logger.error('[SmartScheduler] 调度任务出错:', error.message);
            this.activityLog.log('error', `❌ 调度任务出错: ${error.message}`);
            this.currentTask = null;
        }
    }
    /**
     * 辅助函数：sleep
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.SmartScheduler = SmartScheduler;
// 单例实例
let schedulerInstance = null;
function getSmartScheduler() {
    if (!schedulerInstance) {
        schedulerInstance = new SmartScheduler();
    }
    return schedulerInstance;
}
//# sourceMappingURL=SmartScheduler.js.map