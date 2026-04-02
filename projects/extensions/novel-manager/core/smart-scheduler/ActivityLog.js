"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityLog = void 0;
exports.getActivityLog = getActivityLog;
class ActivityLog {
    constructor() {
        this.logs = [];
        this.maxLogs = 500;
        this.listeners = [];
        this.nextId = 1;
        this.log('system', '\uD83D\uDCCB \u6D3B\u52A8\u65E5\u5FD7\u7CFB\u7EDF\u5DF2\u521D\u59CB\u5316');
    }
    log(type, message) {
        const fullEntry = {
            id: this.generateId(),
            type,
            level: 'info',
            message,
            timestamp: new Date().toISOString(),
        };
        this.logs.unshift(fullEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }
        this.notifyListeners();
    }
    getRecentLogs(limit = 50) {
        return this.logs.slice(0, limit).map((log) => ({ ...log }));
    }
    clear() {
        this.logs = [];
        this.nextId = 1;
        this.log('system', '\uD83E\uDDF9 \u65E5\u5FD7\u5DF2\u6E05\u9664');
        this.notifyListeners();
    }
    addEntry(entry) {
        const fullEntry = {
            ...entry,
            id: this.generateId(),
        };
        this.logs.unshift(fullEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }
        this.notifyListeners();
    }
    getLogs(limit = 100, offset = 0) {
        return this.logs.slice(offset, offset + limit);
    }
    getLatestLogs(count = 50) {
        return this.logs.slice(0, count);
    }
    clearLogs() {
        this.logs = [];
        this.nextId = 1;
        this.addEntry({
            type: 'system',
            level: 'info',
            message: '\uD83E\uDDF9 \u65E5\u5FD7\u5DF2\u6E05\u9664',
            timestamp: new Date().toISOString(),
        });
        this.notifyListeners();
    }
    addListener(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((item) => item !== listener);
        };
    }
    notifyListeners() {
        this.listeners.forEach((listener) => {
            try {
                listener(this.logs);
            }
            catch (error) {
                console.error('[ActivityLog] listener failed:', error);
            }
        });
    }
    generateId() {
        return this.nextId++;
    }
    logChapterGenerationStart(workId, workTitle, chapterNumber, chapterTitle) {
        this.addEntry({
            type: 'content-craft',
            level: 'info',
            message: `\u5F00\u59CB\u751F\u6210\uFF1A${workTitle} \u7B2C${chapterNumber}\u7AE0`,
            timestamp: new Date().toISOString(),
            details: { workId, workTitle, chapterNumber, chapterTitle },
        });
    }
    logChapterGenerationSuccess(workId, workTitle, chapterNumber, chapterTitle, duration) {
        this.addEntry({
            type: 'content-craft',
            level: 'success',
            message: `\u751F\u6210\u5B8C\u6210\uFF1A${workTitle} \u7B2C${chapterNumber}\u7AE0`,
            timestamp: new Date().toISOString(),
            details: {
                workId,
                workTitle,
                chapterNumber,
                chapterTitle,
                duration,
                fromState: 'outline',
                toState: 'content_generated',
            },
        });
    }
    logChapterGenerationError(workId, workTitle, chapterNumber, error, chapterTitle) {
        this.addEntry({
            type: 'content-craft',
            level: 'error',
            message: `\u751F\u6210\u5931\u8D25\uFF1A${workTitle} \u7B2C${chapterNumber}\u7AE0 - ${error}`,
            timestamp: new Date().toISOString(),
            details: { workId, workTitle, chapterNumber, chapterTitle, error },
        });
    }
    logChapterPolishStart(workId, workTitle, chapterNumber, chapterTitle) {
        this.addEntry({
            type: 'content-craft',
            level: 'info',
            message: `\u5F00\u59CB\u6DA6\u8272\uFF1A${workTitle} \u7B2C${chapterNumber}\u7AE0`,
            timestamp: new Date().toISOString(),
            details: { workId, workTitle, chapterNumber, chapterTitle },
        });
    }
    logChapterPolishSuccess(workId, workTitle, chapterNumber, chapterTitle, duration) {
        this.addEntry({
            type: 'content-craft',
            level: 'success',
            message: `\u6DA6\u8272\u5B8C\u6210\uFF1A${workTitle} \u7B2C${chapterNumber}\u7AE0`,
            timestamp: new Date().toISOString(),
            details: {
                workId,
                workTitle,
                chapterNumber,
                chapterTitle,
                duration,
                fromState: 'first_draft',
                toState: 'polished',
            },
        });
    }
    logChapterPolishError(workId, workTitle, chapterNumber, error, chapterTitle) {
        this.addEntry({
            type: 'content-craft',
            level: 'error',
            message: `\u6DA6\u8272\u5931\u8D25\uFF1A${workTitle} \u7B2C${chapterNumber}\u7AE0 - ${error}`,
            timestamp: new Date().toISOString(),
            details: { workId, workTitle, chapterNumber, chapterTitle, error },
        });
    }
    logChapterAuditStart(workId, workTitle, chapterNumber, chapterTitle) {
        this.addEntry({
            type: 'audit',
            level: 'info',
            message: `\u5F00\u59CB\u5BA1\u6838\uFF1A${workTitle} \u7B2C${chapterNumber}\u7AE0`,
            timestamp: new Date().toISOString(),
            details: { workId, workTitle, chapterNumber, chapterTitle },
        });
    }
    logChapterAuditSuccess(workId, workTitle, chapterNumber, chapterTitle, duration, autoFixed) {
        this.addEntry({
            type: 'audit',
            level: 'success',
            message: autoFixed
                ? `\u5BA1\u6838\u901A\u8FC7\uFF08\u5DF2\u81EA\u52A8\u4FEE\u590D\uFF09\uFF1A${workTitle} \u7B2C${chapterNumber}\u7AE0`
                : `\u5BA1\u6838\u901A\u8FC7\uFF1A${workTitle} \u7B2C${chapterNumber}\u7AE0`,
            timestamp: new Date().toISOString(),
            details: {
                workId,
                workTitle,
                chapterNumber,
                chapterTitle,
                duration,
                fromState: 'polished',
                toState: 'audited',
            },
        });
    }
    logChapterAuditError(workId, workTitle, chapterNumber, error, chapterTitle) {
        this.addEntry({
            type: 'audit',
            level: 'error',
            message: `\u5BA1\u6838\u5931\u8D25\uFF1A${workTitle} \u7B2C${chapterNumber}\u7AE0 - ${error}`,
            timestamp: new Date().toISOString(),
            details: { workId, workTitle, chapterNumber, chapterTitle, error },
        });
    }
    logChapterPublishStart(workId, workTitle, chapterNumber, chapterTitle, platform, account) {
        this.addEntry({
            type: 'publish',
            level: 'info',
            message: `\u5F00\u59CB\u53D1\u5E03\uFF1A${workTitle} \u7B2C${chapterNumber}\u7AE0`,
            timestamp: new Date().toISOString(),
            details: { workId, workTitle, chapterNumber, chapterTitle, platform, account },
        });
    }
    logChapterPublishSuccess(workId, workTitle, chapterNumber, chapterTitle, duration, platform, account) {
        this.addEntry({
            type: 'publish',
            level: 'success',
            message: `\u53D1\u5E03\u6210\u529F\uFF1A${workTitle} \u7B2C${chapterNumber}\u7AE0`,
            timestamp: new Date().toISOString(),
            details: {
                workId,
                workTitle,
                chapterNumber,
                chapterTitle,
                duration,
                platform,
                account,
                fromState: 'audited',
                toState: 'published',
            },
        });
    }
    logChapterPublishError(workId, workTitle, chapterNumber, error, chapterTitle, platform, account) {
        this.addEntry({
            type: 'publish',
            level: 'error',
            message: `\u53D1\u5E03\u5931\u8D25\uFF1A${workTitle} \u7B2C${chapterNumber}\u7AE0 - ${error}`,
            timestamp: new Date().toISOString(),
            details: { workId, workTitle, chapterNumber, chapterTitle, error, platform, account },
        });
    }
    logPublishServiceStart() {
        this.addEntry({
            type: 'system',
            level: 'info',
            message: '\u81EA\u52A8\u53D1\u5E03\u670D\u52A1\u5DF2\u542F\u52A8',
            timestamp: new Date().toISOString(),
        });
    }
    logPublishServiceStop() {
        this.addEntry({
            type: 'system',
            level: 'info',
            message: '\u81EA\u52A8\u53D1\u5E03\u670D\u52A1\u5DF2\u505C\u6B62',
            timestamp: new Date().toISOString(),
        });
    }
}
exports.ActivityLog = ActivityLog;
let activityLogInstance = null;
function getActivityLog() {
    if (!activityLogInstance) {
        activityLogInstance = new ActivityLog();
    }
    return activityLogInstance;
}
