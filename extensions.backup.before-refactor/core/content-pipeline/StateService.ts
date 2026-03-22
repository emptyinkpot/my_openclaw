/**
 * 状态管理服务
 * 负责流水线状态的持久化、恢复和监控
 */

import * as fs from 'fs';
import * as path from 'path';
import { getConfig } from '../config';

export interface DailyStats {
  date: string;
  polished: number;
  generated: number;
  published: number;
  audited: number;
  errors: number;
}

export interface WorkStats {
  polished: number;
  generated: number;
  published: number;
  audited: number;
}

export interface PipelineState {
  lastRunTime: string | null;
  lastProcessedIndex: number;
  isRunning: boolean;
  stats: {
    totalRuns: number;
    totalPolished: number;
    totalGenerated: number;
    totalPublished: number;
    totalAudited: number;
    totalErrors: number;
    today: DailyStats;
    avgPolishTime: number;
    avgGenerateTime: number;
    avgPublishTime: number;
    avgAuditTime: number;
    polishTimes: number[];
    generateTimes: number[];
    publishTimes: number[];
    auditTimes: number[];
  };
  works: Record<string, WorkStats>;
  recentErrors: Array<{
    time: string;
    action: string;
    workName: string;
    chapterNum: number;
    error: string;
  }>;
}

export interface EfficiencyReport {
  totalRuns: number;
  total: {
    polished: number;
    generated: number;
    published: number;
    audited: number;
    errors: number;
  };
  today: DailyStats;
  avgTime: {
    polish: string;
    generate: string;
    publish: string;
    audit: string;
  };
  recentErrors: Array<any>;
}

export class StateService {
  private stateFilePath: string;
  private state: PipelineState;
  
  constructor(stateFilePath?: string) {
    const config = getConfig();
    this.stateFilePath = stateFilePath || config.scheduler.stateFile;
    this.state = this.load();
  }
  
  private getDefaultState(): PipelineState {
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
  
  private load(): PipelineState {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const data = JSON.parse(fs.readFileSync(this.stateFilePath, 'utf-8'));
        return { ...this.getDefaultState(), ...data };
      }
    } catch (e) {
      console.error('加载状态失败:', (e as Error).message);
    }
    return this.getDefaultState();
  }
  
  save(): void {
    try {
      const dir = path.dirname(this.stateFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2));
    } catch (e) {
      console.error('保存状态失败:', (e as Error).message);
    }
  }
  
  getState(): PipelineState {
    return { ...this.state };
  }
  
  setRunning(running: boolean): void {
    this.state.isRunning = running;
    if (running) {
      this.state.lastRunTime = new Date().toISOString();
      this.state.stats.totalRuns++;
    }
    this.save();
  }
  
  setProcessedIndex(index: number): void {
    this.state.lastProcessedIndex = index;
    this.save();
  }
  
  recordAction(
    action: 'polish' | 'generate' | 'publish' | 'audit',
    workName: string,
    chapterNum: number,
    duration?: number,
    success: boolean = true
  ): void {
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
  
  private updateAvgTime(type: 'polish' | 'generate' | 'publish' | 'audit', duration?: number): void {
    if (!duration) return;
    
    const timesKey = `${type}Times` as keyof PipelineState['stats'];
    const avgKey = `avg${type.charAt(0).toUpperCase() + type.slice(1)}Time` as keyof PipelineState['stats'];
    
    const times = this.state.stats[timesKey] as number[];
    times.push(duration);
    
    if (times.length > 100) {
      times.shift();
    }
    
    (this.state.stats[avgKey] as number) = times.reduce((a, b) => a + b, 0) / times.length;
  }
  
  private addError(action: string, workName: string, chapterNum: number, error: string = ''): void {
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
  
  getTodayStats(): DailyStats {
    const today = new Date().toISOString().split('T')[0];
    if (this.state.stats.today.date !== today) {
      return { date: today, polished: 0, generated: 0, published: 0, audited: 0, errors: 0 };
    }
    return { ...this.state.stats.today };
  }
  
  getEfficiencyReport(): EfficiencyReport {
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
  
  getProcessedIndex(): number {
    return this.state.lastProcessedIndex || 0;
  }
  
  isRunning(): boolean {
    return this.state.isRunning;
  }
  
  reset(): void {
    this.state = this.getDefaultState();
    this.save();
  }
}
