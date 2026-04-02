"use strict";
/**
 * 审稿模块 - 唯一入口点
 * 外部只需要调用这个函数就能走完所有审核流程
 * 低耦合高内聚，模块化设计
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAuditPipeline = runAuditPipeline;
const logger_1 = require("../utils/logger");
const helpers_1 = require("../utils/helpers");
const repository_1 = require("./repository");
const service_1 = require("./service");
// 导出所有类型供外部使用
__exportStar(require("./types"), exports);
__exportStar(require("./audit-auto-service"), exports);
/**
 * 运行完整审稿流程 - 唯一对外暴露的函数
 * @param options 审核选项
 * @returns 审核任务结果列表
 */
async function runAuditPipeline(options = {}) {
    logger_1.logger.info('开始运行审稿流程');
    const results = [];
    const progressResults = [];
    const startTime = Date.now();
    try {
        // 1. 获取待审核章节
        const chapters = await (0, repository_1.getPendingAuditChapters)({
            workId: options.workId,
            chapterRange: options.chapterRange,
        });
        logger_1.logger.info(`找到 ${chapters.length} 个待审核章节`);
        if (options.onProgress) {
            options.onProgress({
                status: 'running',
                current: 0,
                total: chapters.length,
                task: '初始化完成，开始审核',
                percent: 0,
                results: progressResults,
                startTime,
                elapsed: 0,
            });
        }
        // 2. 逐个审核章节
        for (let i = 0; i < chapters.length; i++) {
            const chapter = chapters[i];
            const chapterStartTime = Date.now();
            // 获取作品标题
            let workTitle = '作品';
            try {
                const work = await (0, repository_1.getWork)(chapter.workId);
                if (work)
                    workTitle = work.title;
            }
            catch (e) {
                // 忽略错误
            }
            // 发送进度更新
            if (options.onProgress) {
                options.onProgress({
                    status: 'running',
                    current: i + 1,
                    total: chapters.length,
                    task: `正在审核 ${workTitle} 第${chapter.chapterNumber}章`,
                    percent: Math.round(((i + 1) / chapters.length) * 100),
                    results: progressResults,
                    startTime,
                    elapsed: Date.now() - startTime,
                });
            }
            // 执行审核
            try {
                const auditResult = await (0, service_1.auditChapter)(chapter.workId, chapter.chapterNumber);
                let duration = Date.now() - chapterStartTime;
                let message = '';
                let fixed = false;
                // 如果开启了自动修复，并且可以自动修复
                if (options.autoFix && auditResult.canAutoFix) {
                    logger_1.logger.info(`自动修复章节: workId=${chapter.workId}, chapter=${chapter.chapterNumber}`);
                    const fixSuccess = await (0, service_1.autoFixChapter)(chapter.workId, chapter.chapterNumber);
                    fixed = fixSuccess;
                    message = fixed ? '审核失败，但已自动修复' : '审核失败，自动修复失败';
                    duration = Date.now() - chapterStartTime;
                }
                const taskResult = {
                    success: auditResult.status === 'passed' || fixed,
                    chapter,
                    duration,
                    error: (!(auditResult.status === 'passed') && !fixed)
                        ? auditResult.issues.map(i => i.message).join('; ')
                        : undefined,
                };
                results.push(taskResult);
                // 如果审核通过或已自动修复，更新章节状态为 audited
                if (taskResult.success) {
                    await (0, repository_1.updateChapterStatus)(chapter.workId, chapter.chapterNumber, 'audited');
                    progressResults.push({
                        success: true,
                        workTitle,
                        chapterNumber: chapter.chapterNumber,
                        chapterTitle: chapter.title || `第${chapter.chapterNumber}章`,
                        message: fixed ? '审核失败，但已自动修复，状态已更新为 audited' : '审核通过，状态已更新为 audited',
                        duration,
                    });
                }
                else {
                    progressResults.push({
                        success: false,
                        workTitle,
                        chapterNumber: chapter.chapterNumber,
                        chapterTitle: chapter.title || `第${chapter.chapterNumber}章`,
                        message: message || taskResult.error || '审核失败',
                        duration,
                    });
                }
            }
            catch (error) {
                const duration = Date.now() - chapterStartTime;
                const taskResult = {
                    success: false,
                    chapter,
                    duration,
                    error: error.message,
                };
                results.push(taskResult);
                progressResults.push({
                    success: false,
                    workTitle,
                    chapterNumber: chapter.chapterNumber,
                    chapterTitle: chapter.title || `第${chapter.chapterNumber}章`,
                    message: error.message,
                    duration,
                });
            }
            // 避免过快请求
            if (i < chapters.length - 1) {
                await (0, helpers_1.delay)(500);
            }
        }
        // 3. 完成
        if (options.onProgress) {
            options.onProgress({
                status: 'completed',
                current: chapters.length,
                total: chapters.length,
                task: '审核完成',
                percent: 100,
                results: progressResults,
                startTime,
                elapsed: Date.now() - startTime,
            });
        }
        logger_1.logger.info(`审稿流程完成，共审核 ${chapters.length} 个章节，耗时 ${Date.now() - startTime}ms`);
    }
    catch (error) {
        logger_1.logger.error('审稿流程失败:', error);
        if (options.onProgress) {
            options.onProgress({
                status: 'error',
                current: 0,
                total: 0,
                task: '审核失败',
                detail: error.message,
                percent: 0,
                results: progressResults,
                startTime,
                elapsed: Date.now() - startTime,
                error: error.message,
            });
        }
        throw error;
    }
    return results;
}
// 默认导出
exports.default = {
    run: runAuditPipeline,
};
//# sourceMappingURL=index.js.map