"use strict";
/**
 * 审稿模块 - 核心服务
 * 负责协调规则和数据访问，高内聚
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditChapter = auditChapter;
exports.autoFixChapter = autoFixChapter;
const logger_1 = require("../../plugins/novel-manager/utils/logger");
const rules_1 = require("./rules");
const repository_1 = require("./repository");
/**
 * 审核章节
 */
async function auditChapter(workId, chapterNumber) {
    logger_1.logger.info(`开始审核: workId=${workId}, chapter=${chapterNumber}`);
    const chapter = await (0, repository_1.getChapter)(workId, chapterNumber);
    if (!chapter || !chapter.content) {
        const result = {
            status: 'failed',
            issues: [{ type: 'content', message: '章节不存在或内容为空', severity: 'error' }],
            score: 0,
            suggestedAction: 'manual',
            canAutoFix: false,
        };
        await (0, repository_1.saveAuditResult)(workId, chapterNumber, 'failed', result.issues, 'manual');
        return result;
    }
    // 运行所有审稿规则
    const { issues, score, canAutoFix } = (0, rules_1.runAllAuditRules)(chapter.title, chapter.content);
    // 确定审核状态
    const hasErrors = issues.some(issue => issue.severity === 'error');
    const auditStatus = hasErrors ? 'failed' : 'passed';
    // 确定建议操作
    let suggestedAction = 'none';
    if (hasErrors) {
        suggestedAction = canAutoFix ? 'auto_fix' : 'manual';
    }
    const result = {
        status: auditStatus,
        issues,
        score,
        suggestedAction,
        canAutoFix,
    };
    // 保存审核结果
    await (0, repository_1.saveAuditResult)(workId, chapterNumber, auditStatus, issues, suggestedAction);
    // 如果审核通过，更新状态为 audited
    if (auditStatus === 'passed') {
        await (0, repository_1.updateChapterStatus)(workId, chapterNumber, 'audited');
    }
    logger_1.logger.info(`审核完成: workId=${workId}, chapter=${chapterNumber}, status=${auditStatus}, score=${score}`);
    return result;
}
/**
 * 自动修复章节（完整修复：删除标题、修复Markdown、删除垃圾字符、转换全角符号）
 */
async function autoFixChapter(workId, chapterNumber) {
    logger_1.logger.info(`开始自动修复: workId=${workId}, chapter=${chapterNumber}`);
    const chapter = await (0, repository_1.getChapter)(workId, chapterNumber);
    if (!chapter || !chapter.content) {
        logger_1.logger.warn('章节不存在或内容为空，无法自动修复');
        return false;
    }
    // 执行完整自动修复
    const fixedContent = (0, rules_1.autoFixAll)(chapter.content);
    if (fixedContent === chapter.content) {
        logger_1.logger.info('没有需要自动修复的内容');
        return true;
    }
    // 更新章节内容到数据库
    await (0, repository_1.updateChapterContent)(workId, chapterNumber, fixedContent);
    logger_1.logger.info(`自动修复完成: workId=${workId}, chapter=${chapterNumber}, 内容已更新到 MySQL`);
    return true;
}
//# sourceMappingURL=service.js.map