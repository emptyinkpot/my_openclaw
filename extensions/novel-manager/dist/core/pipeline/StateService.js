"use strict";
/**
 * 状态管理服务
 * 负责流水线状态的持久化、恢复和监控
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const config_1 = require("../config");
class StateService {
    constructor(stateFilePath) {
        const config = (0, config_1.getConfig)();
        this.stateFilePath = stateFilePath || config.scheduler.stateFile;
        this.state = this.load();
    }
    getDefaultState() {
        return {
            lastRunTime: null,
            lastProcessedIndex: 0,
            isRunning: false,
            stats: {
                totalRuns: 0,
                totalPolished: 0,
                totalGenerated: 0,
                totalPublished: 0,
                totalAudited: 0,
                totalErrors: 0,
                today: {
                    date: new Date().toISOString().split('T')[0],
                    polished: 0,
                    generated: 0,
                    published: 0,
                    audited: 0,
                    errors: 0,
                },
                avgPolishTime: 0,
                avgGenerateTime: 0,
                avgPublishTime: 0,
                avgAuditTime: 0,
                polishTimes: [],
                generateTimes: [],
                publishTimes: [],
                auditTimes: [],
            },
            works: {},
            recentErrors: [],
        };
    }
    load() {
        try {
            if (fs.existsSync(this.stateFilePath)) {
                const data = JSON.parse(fs.readFileSync(this.stateFilePath, 'utf-8'));
                return { ...this.getDefaultState(), ...data };
            }
        }
        catch (e) {
            console.error('加载状态失败:', e.message);
        }
        return this.getDefaultState();
    }
    save() {
        try {
            const dir = path.dirname(this.stateFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2));
        }
        catch (e) {
            console.error('保存状态失败:', e.message);
        }
    }
    getState() {
        return { ...this.state };
    }
    setRunning(running) {
        this.state.isRunning = running;
        if (running) {
            this.state.lastRunTime = new Date().toISOString();
            this.state.stats.totalRuns++;
        }
        this.save();
    }
    setProcessedIndex(index) {
        this.state.lastProcessedIndex = index;
        this.save();
    }
    recordAction(action, workName, chapterNum, duration, success = true) {
        const today = new Date().toISOString().split('T')[0];
        if (this.state.stats.today.date !== today) {
            this.state.stats.today = {
                date: today,
                polished: 0,
                generated: 0,
                published: 0,
                audited: 0,
                errors: 0,
            };
        }
        switch (action) {
            case 'polish':
                this.state.stats.totalPolished++;
                this.state.stats.today.polished++;
                this.updateAvgTime('polish', duration);
                break;
            case 'generate':
                this.state.stats.totalGenerated++;
                this.state.stats.today.generated++;
                this.updateAvgTime('generate', duration);
                break;
            case 'publish':
                this.state.stats.totalPublished++;
                this.state.stats.today.published++;
                this.updateAvgTime('publish', duration);
                break;
            case 'audit':
                this.state.stats.totalAudited++;
                this.state.stats.today.audited++;
                this.updateAvgTime('audit', duration);
                break;
        }
        if (!success) {
            this.state.stats.totalErrors++;
            this.state.stats.today.errors++;
            this.addError(action, workName, chapterNum);
        }
        if (!this.state.works[workName]) {
            this.state.works[workName] = { polished: 0, generated: 0, published: 0, audited: 0 };
        }
        if (success) {
            const key = action === 'publish' ? 'published' : (action === 'polish' ? 'polished' : 'generated');
            this.state.works[workName][key]++;
        }
        this.save();
    }
    updateAvgTime(type, duration) {
        if (!duration)
            return;
        const timesKey = `${type}Times`;
        const avgKey = `avg${type.charAt(0).toUpperCase() + type.slice(1)}Time`;
        const times = this.state.stats[timesKey];
        times.push(duration);
        if (times.length > 100) {
            times.shift();
        }
        this.state.stats[avgKey] = times.reduce((a, b) => a + b, 0) / times.length;
    }
    addError(action, workName, chapterNum, error = '') {
        this.state.recentErrors.push({
            time: new Date().toISOString(),
            action,
            workName,
            chapterNum,
            error: error.substring(0, 200),
        });
        if (this.state.recentErrors.length > 50) {
            this.state.recentErrors.shift();
        }
    }
    getTodayStats() {
        const today = new Date().toISOString().split('T')[0];
        if (this.state.stats.today.date !== today) {
            return { date: today, polished: 0, generated: 0, published: 0, audited: 0, errors: 0 };
        }
        return { ...this.state.stats.today };
    }
    getEfficiencyReport() {
        const stats = this.state.stats;
        return {
            totalRuns: stats.totalRuns,
            total: {
                polished: stats.totalPolished,
                generated: stats.totalGenerated,
                published: stats.totalPublished,
                audited: stats.totalAudited,
                errors: stats.totalErrors,
            },
            today: this.getTodayStats(),
            avgTime: {
                polish: Math.round(stats.avgPolishTime / 1000) + '秒',
                generate: Math.round(stats.avgGenerateTime / 1000) + '秒',
                publish: Math.round(stats.avgPublishTime / 1000) + '秒',
                audit: Math.round(stats.avgAuditTime / 1000) + '秒',
            },
            recentErrors: this.state.recentErrors.slice(-5),
        };
    }
    getProcessedIndex() {
        return this.state.lastProcessedIndex || 0;
    }
    isRunning() {
        return this.state.isRunning;
    }
    reset() {
        this.state = this.getDefaultState();
        this.save();
    }
}
exports.StateService = StateService;
//# sourceMappingURL=StateService.js.map