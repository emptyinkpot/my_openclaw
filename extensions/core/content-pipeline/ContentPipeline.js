"use strict";
/**
 * 审稿模块 - 章节审核调度
 * 协调待审核章节的审核流程
 *
 * 这是核心编排层，统筹整个审稿流程
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentPipeline = void 0;
const StateService_1 = require("./StateService");
const TaskMonitor_1 = require("./TaskMonitor");
const AuditService_1 = require("./AuditService");
const logger_1 = require("../../plugins/novel-manager/utils/logger");
const config_1 = require("../config");
const helpers_1 = require("../../plugins/novel-manager/utils/helpers");
const database_1 = require("../database");
// 步骤标签映射
const STEP_LABELS = {
    init: '初始化',
    scan: '扫描',
    audit: '审核',
    done: '完成',
};
/**
 * 审稿模块 - 审核调度
 */
class ContentPipeline {
    constructor() {
        this.db = (0, database_1.getDatabaseManager)();
        this.running = false;
        this.abortController = null;
        this.progressResults = [];
        this.state = new StateService_1.StateService();
        this.monitor = new TaskMonitor_1.TaskMonitor();
        this.auditService = new AuditService_1.AuditService();
    }
    /**
     * 发出进度事件
     */
    emitProgress(status, step, current, total, task, detail, error) {
        const percent = total > 0 ? Math.round((current / total) * 100) : 0;
        const event = {
            status,
            step,
            stepLabel: STEP_LABELS[step],
            current,
            total,
            task,
            detail,
            percent,
            results: this.progressResults,
            startTime: this.startTime,
            elapsed: this.startTime ? Date.now() - this.startTime : undefined,
            error,
        };
        if (this.progressCallback) {
            this.progressCallback(event);
        }
        return event;
    }
    /**
     * 运行完整流程：检测 → 润色 → 审核 → 发布
     */
    async runSchedule(options = {}) {
        return this.run(options);
    }
    /**
     * 审稿调度主函数
     * 审核所有待审核章节，审核通过后状态变为 audited
     */
    async run(options = {}) {
        if (!this.running) {
            await this.start();
        }
        const results = [];
        const startTime = Date.now();
        try {
            const chapters = await this.getPendingAuditChapters(options);
            logger_1.logger.info(`找到 ${chapters.length} 个待审核章节`);
            for (let i = 0; i < chapters.length; i++) {
                if (this.abortController?.signal.aborted)
                    break;
                const chapter = chapters[i];
                this.emitProgress('running', 'audit', i + 1, chapters.length, `审核 ${chapter.workTitle || '作品'} 第${chapter.chapterNumber}章`);
                // 执行审核
                const auditResult = await this.runAuditTask(chapter);
                results.push(auditResult);
                // 如果审核通过，更新章节状态为 audited
                if (auditResult.success) {
                    await this.updateChapterStatus(chapter.workId, chapter.chapterNumber, 'audited');
                    this.progressResults.push({
                        success: true,
                        workTitle: chapter.workTitle || '作品',
                        chapterNumber: chapter.chapterNumber,
                        chapterTitle: chapter.chapterTitle || `第${chapter.chapterNumber}章`,
                        message: '审核通过，状态已更新为 audited',
                        duration: auditResult.duration,
                    });
                }
                else {
                    this.progressResults.push({
                        success: false,
                        workTitle: chapter.workTitle || '作品',
                        chapterNumber: chapter.chapterNumber,
                        chapterTitle: chapter.chapterTitle || `第${chapter.chapterNumber}章`,
                        message: auditResult.error || '审核失败',
                        duration: auditResult.duration,
                    });
                }
                this.state.setProcessedIndex(i + 1);
                if (i < chapters.length - 1)
                    await (0, helpers_1.delay)(1000);
            }
            logger_1.logger.info(`审稿完成，共审核 ${chapters.length} 个章节，耗时 ${Date.now() - startTime}ms`);
        }
        catch (error) {
            logger_1.logger.error('审稿失败:', error);
            throw error;
        }
        return results;
    }
    /**
     * 获取待审核章节
     */
    async getPendingAuditChapters(options) {
        let sql = `
      SELECT c.id, c.work_id, c.chapter_number, c.title, c.content, w.title as work_title
      FROM chapters c
      LEFT JOIN works w ON c.work_id = w.id
      WHERE c.status = 'pending'
    `;
        const params = [];
        if (options.workId) {
            sql += ' AND c.work_id = ?';
            params.push(options.workId);
        }
        if (options.chapterRange) {
            sql += ' AND c.chapter_number BETWEEN ? AND ?';
            params.push(options.chapterRange[0], options.chapterRange[1]);
        }
        sql += ' ORDER BY c.work_id, c.chapter_number';
        const rows = await this.db.query(sql, params);
        return rows.map((row) => ({
            id: row.id,
            workId: row.work_id,
            workTitle: row.work_title,
            chapterNumber: row.chapter_number,
            chapterTitle: row.title,
            content: row.content,
        }));
    }
    /**
     * 执行审核任务
     */
    async runAuditTask(chapter) {
        const startTime = Date.now();
        try {
            const result = await this.auditService.auditChapter(chapter.workId, chapter.chapterNumber);
            return {
                success: result.status === 'passed',
                task: chapter,
                duration: Date.now() - startTime,
                error: result.status !== 'passed' ? result.issues.map(i => i.message).join('; ') : undefined,
            };
        }
        catch (error) {
            return { success: false, task: chapter, duration: Date.now() - startTime, error: error.message };
        }
    }
    /**
     * 更新章节状态
     */
    async updateChapterStatus(workId, chapterNumber, status) {
        await this.db.execute(`
      UPDATE chapters SET status = ?, updated_at = NOW()
      WHERE work_id = ? AND chapter_number = ?
    `, [status, workId, chapterNumber]);
        logger_1.logger.info(`已更新章节状态: workId=${workId}, chapter=${chapterNumber}, status=${status}`);
    }
    async start() {
        if (this.running)
            throw new Error('流水线已在运行');
        const config = (0, config_1.getConfig)();
        if (!config.scheduler.enabled) {
            logger_1.logger.warn('流水线已禁用');
            return;
        }
        this.running = true;
        this.abortController = new AbortController();
        this.state.setRunning(true);
        logger_1.logger.info('内容流水线已启动');
    }
    async stop() {
        this.running = false;
        this.abortController?.abort();
        this.state.setRunning(false);
        logger_1.logger.info('内容流水线已停止');
    }
    getState() {
        return { running: this.running, pipeline: this.state.getState(), failures: this.monitor.getStats() };
    }
    getEfficiencyReport() { return this.state.getEfficiencyReport(); }
    getFailureReport() { return this.monitor.generateFailureReport(); }
}
exports.ContentPipeline = ContentPipeline;
//# sourceMappingURL=ContentPipeline.js.map