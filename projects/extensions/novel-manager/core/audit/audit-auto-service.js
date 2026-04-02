"use strict";
/**
 * 审核自动处理服务
 *
 * 自动处理章节审核：
 * - 自动审核状态为 `polished`（润色完成）的章节，审核通过后标记为 `audited`
 * - 支持自动修复可修复的问题
 *
 * @module audit-auto
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditAutoService = void 0;
exports.getAuditAutoService = getAuditAutoService;
const logger_1 = require("../utils/logger");
const novel_service_1 = require("../../backend/services/novel-service");
const database_1 = require("../../../core/database");
const service_1 = require("./service");
const repository_1 = require("./repository");
const rules_1 = require("./rules");
const smart_scheduler_1 = require("../smart-scheduler");
class AuditAutoService {
    constructor() {
        this.running = false;
        this.timer = null;
        this.lastRunTime = null;
        this.currentTask = null;
        this.processedCount = 0;
        this.errorCount = 0;
        this.isProcessing = false; // 并发锁：防止同时执行多个处理流程
        this.config = {
            enabled: false,
            processInterval: 60, // 默认 60 秒
            maxChaptersPerRun: 3,
            autoFix: true // 默认自动修复
        };
        this.novelService = new novel_service_1.NovelService();
        this.activityLog = (0, smart_scheduler_1.getActivityLog)();
    }
    /**
     * 获取当前状态
     */
    getStatus() {
        return {
            running: this.running,
            lastRunTime: this.lastRunTime?.toISOString() || null,
            currentTask: this.currentTask,
            processedCount: this.processedCount,
            errorCount: this.errorCount
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
        logger_1.logger.info('[AuditAutoService] 配置已更新:', this.config);
        // 如果启用状态改变，重启服务
        if (newConfig.enabled !== undefined && newConfig.enabled !== this.running) {
            if (newConfig.enabled) {
                this.start();
            }
            else {
                this.stop();
            }
        }
        else if (newConfig.processInterval !== undefined && this.running) {
            // 如果只是间隔改变，重启定时器
            this.restartTimer();
        }
    }
    /**
     * 启动自动审核服务
     */
    start() {
        if (this.running) {
            logger_1.logger.warn('[AuditAutoService] 服务已在运行中');
            return;
        }
        this.running = true;
        this.config.enabled = true;
        this.isProcessing = false; // 重置处理标志
        logger_1.logger.info('[AuditAutoService] 自动审核服务已启动');
        // 启动定时处理（不立即执行，避免重复）
        this.startTimer();
        // 延迟一小会儿后执行第一次处理
        setTimeout(() => {
            this.processChapters();
        }, 2000);
    }
    /**
     * 停止自动审核服务
     */
    stop() {
        if (!this.running) {
            logger_1.logger.warn('[AuditAutoService] 服务未在运行');
            return;
        }
        this.running = false;
        this.config.enabled = false;
        this.stopTimer();
        logger_1.logger.info('[AuditAutoService] 自动审核服务已停止');
    }
    /**
     * 启动定时器
     */
    startTimer() {
        this.stopTimer();
        this.timer = setInterval(() => {
            this.processChapters();
        }, this.config.processInterval * 1000);
        logger_1.logger.info(`[AuditAutoService] 定时器已启动，间隔: ${this.config.processInterval}秒`);
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
     * 处理章节
     */
    async processChapters() {
        // 检查是否正在运行
        if (!this.running) {
            return;
        }
        // 检查是否已经在处理中（并发锁）
        if (this.isProcessing) {
            logger_1.logger.info('[AuditAutoService] 上一次处理尚未完成，跳过本次执行');
            return;
        }
        // 加锁
        this.isProcessing = true;
        try {
            this.lastRunTime = new Date();
            logger_1.logger.info('[AuditAutoService] 开始处理章节审核...');
            this.activityLog.log('progress', '审核服务开始检查待审核章节...');
            // 获取需要处理的章节
            const chaptersToProcess = await this.getChaptersToProcess();
            if (chaptersToProcess.length === 0) {
                logger_1.logger.info('[AuditAutoService] 没有需要审核的章节');
                this.activityLog.log('progress', '没有需要审核的章节，等待中...');
                this.currentTask = null;
                return;
            }
            logger_1.logger.info(`[AuditAutoService] 找到 ${chaptersToProcess.length} 个需要审核的章节`);
            this.activityLog.log('progress', `找到 ${chaptersToProcess.length} 个需要审核的章节`);
            // 只处理第一个章节（确保串行，避免并发问题）
            const chapter = chaptersToProcess[0];
            try {
                this.currentTask = `正在审核章节: ${chapter.title || chapter.chapter_number}`;
                logger_1.logger.info(`[AuditAutoService] ${this.currentTask}`);
                this.activityLog.log('progress', `开始审核第 ${chapter.chapter_number} 章: ${chapter.title || '无标题'}`);
                await this.auditChapter(chapter.work_id, chapter.chapter_number);
                this.processedCount++;
                logger_1.logger.info(`[AuditAutoService] 章节审核完成: ${chapter.title || chapter.chapter_number}`);
                this.activityLog.log('completed', `第 ${chapter.chapter_number} 章审核完成`);
            }
            catch (error) {
                this.errorCount++;
                logger_1.logger.error(`[AuditAutoService] 章节审核失败: ${chapter.title || chapter.chapter_number}`, error.message);
                this.activityLog.log('error', `第 ${chapter.chapter_number} 章审核失败: ${error.message}`);
            }
            this.currentTask = null;
            logger_1.logger.info('[AuditAutoService] 章节审核处理完成');
        }
        catch (error) {
            this.errorCount++;
            logger_1.logger.error('[AuditAutoService] 审核处理过程出错:', error.message);
            this.activityLog.log('error', `审核处理过程出错: ${error.message}`);
            this.currentTask = null;
        }
        finally {
            // 释放锁
            this.isProcessing = false;
        }
    }
    /**
     * 获取需要审核的章节
     */
    async getChaptersToProcess() {
        try {
            // 直接查询数据库，不依赖 novelService
            const db = (0, database_1.getDatabaseManager)();
            // 直接查询状态为 polished 的章节
            const limit = Math.max(1, Math.min(10, this.config.maxChaptersPerRun));
            const chapters = await db.query(`
        SELECT * FROM chapters 
        WHERE status = 'polished'
        ORDER BY updated_at ASC
        LIMIT ${limit}
      `);
            logger_1.logger.info(`[AuditAutoService] 找到 ${chapters.length} 个需要审核的章节`);
            this.activityLog.log('progress', `找到 ${chapters.length} 个需要审核的章节`);
            return chapters;
        }
        catch (error) {
            logger_1.logger.error('[AuditAutoService] 获取需要审核的章节失败:', error.message);
            this.activityLog.log('error', `获取审核章节失败: ${error.message}`);
            return [];
        }
    }
    /**
     * 审核单个章节（完整流程）
     */
    async auditChapter(workId, chapterNumber) {
        logger_1.logger.info(`[AuditAutoService] 审核章节 (workId: ${workId}, chapterNumber: ${chapterNumber})`);
        this.activityLog.log('auditing', `开始审核第 ${chapterNumber} 章内容`);
        const db = (0, database_1.getDatabaseManager)();
        // 1. 执行审核
        const auditResult = await (0, service_1.auditChapter)(workId, chapterNumber);
        this.activityLog.log('progress', `审核发现 ${auditResult.issues.length} 个问题`);
        let finalContent = null;
        let auditPassed = auditResult.status === 'passed';
        // 2. 如果开启了自动修复，并且审核失败或有问题，执行完整自动修复
        if (this.config.autoFix && (!auditPassed || auditResult.issues.length > 0)) {
            logger_1.logger.info(`[AuditAutoService] 自动修复章节 (workId: ${workId}, chapterNumber: ${chapterNumber})`);
            this.activityLog.log('fixing', `开始自动修复第 ${chapterNumber} 章内容`);
            // 获取原始内容
            const chapter = await db.queryOne('SELECT content FROM chapters WHERE work_id = ? AND chapter_number = ?', [workId, chapterNumber]);
            if (chapter && chapter.content) {
                // 执行完整自动修复
                finalContent = (0, rules_1.autoFixAll)(chapter.content);
                if (finalContent !== chapter.content) {
                    // 更新审核后的内容到 MySQL
                    await (0, repository_1.updateChapterContent)(workId, chapterNumber, finalContent);
                    logger_1.logger.info(`[AuditAutoService] 审核后内容已替换到 MySQL (workId: ${workId}, chapterNumber: ${chapterNumber})`);
                    auditPassed = true; // 修复后视为审核通过
                    this.activityLog.log('progress', `第 ${chapterNumber} 章自动修复完成`);
                }
            }
        }
        // 3. 如果审核通过或已自动修复，更新状态为 audited（只有这个流程能赋予此状态）
        if (auditPassed) {
            logger_1.logger.info(`[AuditAutoService] 审核通过，更新状态为 audited (workId: ${workId}, chapterNumber: ${chapterNumber})`);
            await (0, repository_1.updateChapterStatus)(workId, chapterNumber, 'audited');
            this.activityLog.log('completed', `第 ${chapterNumber} 章审核通过，状态更新为 audited`);
        }
        logger_1.logger.info(`[AuditAutoService] 章节审核完成 (workId: ${workId}, chapterNumber: ${chapterNumber})`);
    }
}
exports.AuditAutoService = AuditAutoService;
// 单例实例
let auditAutoServiceInstance = null;
function getAuditAutoService() {
    if (!auditAutoServiceInstance) {
        auditAutoServiceInstance = new AuditAutoService();
    }
    return auditAutoServiceInstance;
}
//# sourceMappingURL=audit-auto-service.js.map