"use strict";
/**
 * 内容处理流水线
 * 协调检测 → 润色 → 审核 → 发布的完整流程
 *
 * 这是核心编排层，统筹整个内容发布流水线
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentPipeline = void 0;
const StateService_1 = require("./pipeline/StateService");
const TaskMonitor_1 = require("./pipeline/TaskMonitor");
const PolishFeatureDetector_1 = require("./pipeline/PolishFeatureDetector");
const AuditService_1 = require("./pipeline/AuditService");
const FanqiePublisher_1 = require("./pipeline/FanqiePublisher");
const FanqieScanner_1 = require("./pipeline/FanqieScanner");
const ChapterRepository_1 = require("./pipeline/ChapterRepository");
const logger_1 = require("../utils/logger");
const config_1 = require("./config");
const helpers_1 = require("../utils/helpers");
// 步骤标签映射
const STEP_LABELS = {
    init: '初始化',
    scan: '扫描',
    audit: '审核',
    detect: '检测',
    polish: '润色',
    publish: '发布',
    done: '完成',
};
/**
 * 内容处理流水线
 */
class ContentPipeline {
    constructor() {
        this.running = false;
        this.abortController = null;
        this.progressResults = [];
        this.state = new StateService_1.StateService();
        this.monitor = new TaskMonitor_1.TaskMonitor();
        this.detector = new PolishFeatureDetector_1.PolishFeatureDetector();
        this.auditService = new AuditService_1.AuditService();
        this.fanqiePublisher = new FanqiePublisher_1.FanqiePublisher();
        this.scanner = (0, FanqieScanner_1.getFanqieScanner)();
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
    }
    /**
     * 添加结果
     */
    addResult(success, workTitle, chapterNumber, chapterTitle, message, duration) {
        this.progressResults.push({ success, workTitle, chapterNumber, chapterTitle, message, duration });
    }
    /**
     * 直接发布到番茄（简化流程）
     */
    async publishToFanqie(options) {
        const { workId, chapterNumber, startChapter, endChapter, headless = false, dryRun = false, skipStatusCheck = true, onProgress } = options;
        // 初始化进度
        this.progressCallback = onProgress;
        this.startTime = Date.now();
        this.progressResults = [];
        const results = [];
        const config = (0, config_1.getConfig)();
        const accounts = config.scheduler.fanqieAccounts;
        if (!accounts || accounts.length === 0) {
            this.emitProgress('error', 'init', 0, 0, '初始化失败', undefined, '未配置番茄账号');
            throw new Error('未配置番茄账号');
        }
        const account = accounts[0];
        // 步骤1: 初始化
        this.emitProgress('running', 'init', 0, 0, '初始化发布流程...');
        await (0, helpers_1.delay)(500);
        // 步骤2: 扫描待发布章节
        this.emitProgress('running', 'scan', 0, 0, '扫描待发布章节...');
        // 根据是否跳过状态检查，使用不同的查询
        let chapters;
        if (skipStatusCheck) {
            // 跳过状态检查，只获取有内容的章节
            const repo = (0, ChapterRepository_1.getChapterRepository)();
            const pendingChapters = await repo.getPendingProcess({
                workId,
                chapterRange: startChapter && endChapter ? [startChapter, endChapter] : undefined,
                limit: 100
            });
            chapters = pendingChapters.map(ch => ({
                workId: ch.workId,
                workTitle: ch.workTitle,
                chapterNumber: ch.chapterNumber,
                chapterTitle: ch.chapterTitle || `第${ch.chapterNumber}章`,
                content: ch.content || '',
                wordCount: ch.wordCount || ch.content?.length || 0,
            }));
        }
        else {
            chapters = await this.fanqiePublisher.getPendingChapters(workId, chapterNumber ? 1 : 100);
        }
        // 如果指定了章节号，只发布那个章节
        const toPublish = chapterNumber
            ? chapters.filter(c => c.chapterNumber === chapterNumber)
            : chapters;
        if (toPublish.length === 0) {
            this.emitProgress('completed', 'scan', 0, 0, '没有待发布章节');
            logger_1.logger.info('没有待发布章节');
            return results;
        }
        this.emitProgress('running', 'scan', 0, toPublish.length, `找到 ${toPublish.length} 个待发布章节`);
        logger_1.logger.info(`待发布 ${toPublish.length} 个章节到番茄`);
        // 步骤3: 发布章节
        for (let i = 0; i < toPublish.length; i++) {
            const chapter = toPublish[i];
            const taskStartTime = Date.now();
            const taskDesc = `${chapter.workTitle} 第${chapter.chapterNumber}章`;
            this.emitProgress('running', 'publish', i + 1, toPublish.length, `正在发布: ${taskDesc}`);
            logger_1.logger.info(`[${i + 1}/${toPublish.length}] 发布: ${taskDesc}`);
            if (dryRun) {
                const duration = Date.now() - taskStartTime;
                results.push({ success: true, task: chapter, duration });
                this.addResult(true, chapter.workTitle, chapter.chapterNumber, chapter.chapterTitle, '模拟发布成功', duration);
                continue;
            }
            try {
                const result = await this.fanqiePublisher.publishChapter(chapter, account, {
                    headless,
                    onProgress: (p) => {
                        this.emitProgress('running', 'publish', i + 1, toPublish.length, taskDesc, p.action);
                    }
                });
                const duration = Date.now() - taskStartTime;
                results.push({
                    success: result.success,
                    task: chapter,
                    duration,
                    error: result.error,
                });
                this.addResult(result.success, chapter.workTitle, chapter.chapterNumber, chapter.chapterTitle, result.message, duration);
                if (result.success) {
                    logger_1.logger.info(`  ✓ 发布成功`);
                }
                else {
                    logger_1.logger.error(`  ✗ 发布失败: ${result.error}`);
                }
                // 发布间隔
                if (i < toPublish.length - 1) {
                    await (0, helpers_1.delay)(3000);
                }
            }
            catch (error) {
                const duration = Date.now() - taskStartTime;
                results.push({
                    success: false,
                    task: chapter,
                    duration,
                    error: error.message,
                });
                this.addResult(false, chapter.workTitle, chapter.chapterNumber, chapter.chapterTitle, error.message, duration);
            }
        }
        // 完成
        const successCount = results.filter(r => r.success).length;
        this.emitProgress('completed', 'done', results.length, toPublish.length, `发布完成: 成功 ${successCount}/${toPublish.length}`);
        return results;
    }
    /**
     * 运行完整流程：检测 → 润色 → 审核 → 发布
     */
    async runSchedule(options = {}) {
        return this.run(options);
    }
    async run(options = {}) {
        if (!this.running) {
            await this.start();
        }
        const results = [];
        const startTime = Date.now();
        try {
            const chapters = await this.getPendingChapters(options);
            logger_1.logger.info(`找到 ${chapters.length} 个待处理章节`);
            for (let i = 0; i < chapters.length; i++) {
                if (this.abortController?.signal.aborted)
                    break;
                const chapter = chapters[i];
                this.emitProgress('running', 'publish', i + 1, chapters.length, `处理 ${chapter.workTitle} 第${chapter.chapterNumber}章`);
                // 跳过审核直接发布
                if (options.skipAudit || chapter.auditStatus === 'passed') {
                    for (const platform of (options.platforms || ['fanqie'])) {
                        const result = await this.publishChapter(chapter, platform, options);
                        results.push(result);
                    }
                }
                else {
                    // 审核后发布
                    const auditResult = await this.runAuditTask(chapter);
                    if (auditResult.success) {
                        for (const platform of (options.platforms || ['fanqie'])) {
                            const result = await this.publishChapter(chapter, platform, options);
                            results.push(result);
                        }
                    }
                    else {
                        results.push(auditResult);
                    }
                }
                this.state.setProcessedIndex(i + 1);
                if (i < chapters.length - 1)
                    await (0, helpers_1.delay)(2000);
            }
            logger_1.logger.info(`流水线完成，共处理 ${chapters.length} 个章节，耗时 ${Date.now() - startTime}ms`);
        }
        catch (error) {
            logger_1.logger.error('流水线失败:', error);
            throw error;
        }
        return results;
    }
    /**
     * 发布单个章节
     */
    async publishChapter(chapter, platform, options) {
        const startTime = Date.now();
        try {
            if (platform === 'fanqie') {
                const config = (0, config_1.getConfig)();
                const account = config.scheduler.fanqieAccounts[0];
                const chapterData = {
                    workId: chapter.workId,
                    workTitle: chapter.workTitle,
                    chapterNumber: chapter.chapterNumber,
                    chapterTitle: chapter.chapterTitle,
                    content: chapter.content,
                    wordCount: chapter.content?.length || 0,
                };
                const result = await this.fanqiePublisher.publishChapter(chapterData, account, {
                    headless: options.headless ?? true,
                    dryRun: options.dryRun,
                });
                return {
                    success: result.success,
                    task: chapter,
                    duration: Date.now() - startTime,
                    error: result.error,
                };
            }
            return { success: false, task: chapter, duration: 0, error: `平台 ${platform} 未实现` };
        }
        catch (error) {
            return { success: false, task: chapter, duration: Date.now() - startTime, error: error.message };
        }
    }
    /**
     * 获取待处理章节
     */
    async getPendingChapters(options) {
        const repo = (0, ChapterRepository_1.getChapterRepository)();
        return await repo.getPendingProcess({
            workId: options.workId,
            chapterRange: options.chapterRange,
            limit: 100,
        });
    }
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
    /**
     * 扫描番茄作品列表
     */
    async scanFanqieWorks(options) {
        this.emitProgress('running', 'scan', 0, 0, '正在扫描番茄作品...');
        const result = await this.scanner.scan({
            accountId: options?.accountId,
            headed: options?.headed,
            onProgress: (progress) => {
                this.emitProgress('running', 'scan', 0, 0, progress.message);
            }
        });
        if (result.success) {
            this.emitProgress('completed', 'scan', result.works.length, result.works.length, `扫描完成，共 ${result.works.length} 个作品`);
        }
        else {
            this.emitProgress('error', 'scan', 0, 0, '扫描失败', result.error);
        }
        return result;
    }
    /**
     * 获取扫描缓存
     */
    getScanCache(accountId) {
        return this.scanner.readCache(accountId);
    }
}
exports.ContentPipeline = ContentPipeline;
//# sourceMappingURL=ContentPipeline.js.map