/**
 * 任务监控服务
 * 监控流水线各阶段的失败原因
 */
export class TaskMonitor {
    constructor() {
        this.externalErrorKeywords = [
            'timeout', 'ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND',
            'network', 'NetworkError', 'net::ERR',
            'Target page, context or browser has been closed',
            'Navigation timeout', 'page.goto', 'locator.click: Timeout',
            'element is not stable', 'intercepts pointer events', 'Session closed',
            'WebSocket', '502', '503', '504',
            'Service Unavailable', 'Bad Gateway', 'Gateway Timeout',
        ];
        this.criticalErrorKeywords = [
            'authentication', 'unauthorized', 'login', 'token',
            'permission', 'forbidden', '401', '403',
            'not found', '404', 'invalid', 'expired',
        ];
        this.failedTasks = [];
        this.maxRecords = 50;
    }
    analyzeError(errorMessage) {
        const msg = (errorMessage || '').toLowerCase();
        const isExternal = this.externalErrorKeywords.some(kw => msg.includes(kw.toLowerCase()));
        const isCritical = this.criticalErrorKeywords.some(kw => msg.includes(kw.toLowerCase()));
        let errorType = 'unknown';
        let shouldSkip = false;
        let shouldNotify = true;
        if (isExternal) {
            errorType = 'external';
            shouldSkip = true;
            shouldNotify = false;
        }
        else if (isCritical) {
            errorType = 'critical';
            shouldSkip = false;
            shouldNotify = true;
        }
        else {
            errorType = 'internal';
            shouldSkip = false;
            shouldNotify = true;
        }
        return {
            errorType,
            isExternal,
            isCritical,
            shouldSkip,
            shouldNotify,
            summary: this.summarizeError(errorMessage),
        };
    }
    recordFailure(workName, action, chapterNum, errorMessage, analysis) {
        const record = {
            workName,
            action,
            chapterNum,
            errorMessage: errorMessage === null || errorMessage === void 0 ? void 0 : errorMessage.substring(0, 500),
            errorType: analysis.errorType,
            summary: analysis.summary,
            timestamp: new Date().toISOString(),
            notified: false,
        };
        this.failedTasks.unshift(record);
        if (this.failedTasks.length > this.maxRecords) {
            this.failedTasks = this.failedTasks.slice(0, this.maxRecords);
        }
        return record;
    }
    markNotified(workName, action, chapterNum) {
        const task = this.failedTasks.find(t => t.workName === workName &&
            t.action === action &&
            t.chapterNum === chapterNum &&
            !t.notified);
        if (task) {
            task.notified = true;
        }
    }
    getUnnotifiedFailures() {
        return this.failedTasks.filter(t => !t.notified);
    }
    getRecentFailures(limit = 10) {
        return this.failedTasks.slice(0, limit);
    }
    getStats() {
        return {
            total: this.failedTasks.length,
            external: this.failedTasks.filter(t => t.errorType === 'external').length,
            critical: this.failedTasks.filter(t => t.errorType === 'critical').length,
            internal: this.failedTasks.filter(t => t.errorType === 'internal').length,
        };
    }
    generateFailureReport() {
        const unnotified = this.getUnnotifiedFailures();
        const stats = this.getStats();
        if (unnotified.length === 0) {
            return null;
        }
        const lines = [
            '⚠️ 任务失败报告',
            `时间: ${new Date().toLocaleString('zh-CN')}`,
            '',
            `📊 统计: 共 ${stats.total} 个失败任务`,
            `  - 外部网站问题: ${stats.external} (已跳过)`,
            `  - 关键错误: ${stats.critical}`,
            `  - 其他错误: ${stats.internal}`,
            '',
            '📝 未处理失败:',
        ];
        unnotified.slice(0, 5).forEach((task, i) => {
            lines.push(`${i + 1}. ${task.workName} - ${task.action} 第${task.chapterNum}章`);
            lines.push(`   原因: ${task.summary}`);
        });
        if (unnotified.length > 5) {
            lines.push(`... 还有 ${unnotified.length - 5} 个未显示`);
        }
        return lines.join('\n');
    }
    summarizeError(errorMessage) {
        if (!errorMessage)
            return '未知错误';
        const msg = errorMessage.substring(0, 200).toLowerCase();
        if (msg.includes('timeout'))
            return '超时';
        if (msg.includes('econnrefused') || msg.includes('econnreset'))
            return '网络连接失败';
        if (msg.includes('target page, context or browser has been closed'))
            return '浏览器会话关闭';
        if (msg.includes('not found') || msg.includes('404'))
            return '资源未找到';
        if (msg.includes('authentication') || msg.includes('unauthorized') || msg.includes('401'))
            return '认证失败';
        if (msg.includes('permission') || msg.includes('forbidden') || msg.includes('403'))
            return '权限不足';
        if (msg.includes('element is not stable'))
            return '页面元素不稳定';
        if (msg.includes('intercepts pointer events'))
            return '元素被遮挡';
        return errorMessage.substring(0, 100).replace(/\n/g, ' ');
    }
}
