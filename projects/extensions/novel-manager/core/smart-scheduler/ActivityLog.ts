/**
 * 活动日志系统 - 记录所有自动化操作
 * 
 * 功能：
 * 1. 记录所有章节处理操作
 * 2. 记录状态变化
 * 3. 提供日志查询接口
 * 4. 支持日志分页
 * 
 * @module activity-log
 */

export interface LogEntry {
  id: string | number;
  type: 'system' | 'content-craft' | 'audit' | 'publish' | 'chapter';
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: string;
  details?: {
    workId?: number;
    workTitle?: string;
    chapterNumber?: number;
    chapterTitle?: string;
    fromState?: string;
    toState?: string;
    duration?: number;
    error?: string;
    platform?: string;
    account?: string;
  };
}

export class ActivityLog {
  private logs: LogEntry[] = [];
  private maxLogs = 500; // 最多保留 500 条日志
  private listeners: ((logs: LogEntry[]) => void)[] = [];
  private nextId = 1; // 简单的自增 ID 用于前端

  constructor() {
    // 初始化时添加一条启动日志
    this.log('system', '📋 活动日志系统已初始化');
  }

  private normalizeLogIds(): void {
    let maxNumericId = 0;

    for (const log of this.logs) {
      if (typeof log.id === 'number' && Number.isFinite(log.id)) {
        maxNumericId = Math.max(maxNumericId, log.id);
      }
    }

    if (this.nextId <= maxNumericId) {
      this.nextId = maxNumericId + 1;
    }

    for (const log of this.logs) {
      if (typeof log.id !== 'number' || !Number.isFinite(log.id)) {
        (log as { id: number | string }).id = this.nextId++;
      }
    }
  }

  /**
   * 简单的 log 方法（供前端和快速使用）
   */
  log(type: string, message: string): void {
    const fullEntry: LogEntry = {
      id: this.nextId++,
      type: type as any,
      level: 'info',
      message,
      timestamp: new Date().toISOString()
    };
    
    // @ts-ignore - 临时添加 id 字段用于前端
    this.logs.unshift(fullEntry);
    
    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
    
    // 通知所有监听器
    this.notifyListeners();
  }

  /**
   * 获取最近的日志（带简单 ID，供前端使用）
   */
  getRecentLogs(limit = 50): LogEntry[] {
    // 确保所有日志都有 id
    return this.logs.slice(0, limit).map((log, index) => ({
      ...log,
      // @ts-ignore
      id: log.id || (this.nextId - this.logs.length + index)
    }));
  }

  /**
   * 清空日志
   */
  clear(): void {
    this.logs = [];
    this.nextId = 1;
    this.log('system', '🧹 日志已清除');
    this.notifyListeners();
  }

  /**
   * 添加日志条目
   */
  addEntry(entry: Omit<LogEntry, 'id'>): void {
    const fullEntry: LogEntry = {
      ...entry,
      id: this.generateId()
    };
    
    this.logs.unshift(fullEntry); // 新日志加到前面
    
    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
    
    // 通知所有监听器
    this.notifyListeners();
  }

  /**
   * 获取所有日志
   */
  getLogs(limit = 100, offset = 0): LogEntry[] {
    return this.logs.slice(offset, offset + limit);
  }

  /**
   * 获取最新的日志
   */
  getLatestLogs(count = 50): LogEntry[] {
    return this.logs.slice(0, count);
  }

  /**
   * 清除所有日志
   */
  clearLogs(): void {
    this.logs = [];
    this.addEntry({
      type: 'system',
      level: 'info',
      message: '🧹 日志已清除',
      timestamp: new Date().toISOString()
    });
    this.notifyListeners();
  }

  /**
   * 添加监听器
   */
  addListener(listener: (logs: LogEntry[]) => void): () => void {
    this.listeners.push(listener);
    
    // 返回取消订阅函数
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.logs);
      } catch (e) {
        console.error('[ActivityLog] 监听器出错:', e);
      }
    });
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // ========== 便捷方法 ==========

  /**
   * 记录章节生成开始
   */
  logChapterGenerationStart(workId: number, workTitle: string, chapterNumber: number, chapterTitle?: string): void {
    this.addEntry({
      type: 'content-craft',
      level: 'info',
      message: `🚀 开始生成: ${workTitle} 第${chapterNumber}章`,
      timestamp: new Date().toISOString(),
      details: {
        workId,
        workTitle,
        chapterNumber,
        chapterTitle
      }
    });
  }

  /**
   * 记录章节生成成功
   */
  logChapterGenerationSuccess(workId: number, workTitle: string, chapterNumber: number, chapterTitle?: string, duration?: number): void {
    this.addEntry({
      type: 'content-craft',
      level: 'success',
      message: `✅ 生成完成: ${workTitle} 第${chapterNumber}章`,
      timestamp: new Date().toISOString(),
      details: {
        workId,
        workTitle,
        chapterNumber,
        chapterTitle,
        duration,
        fromState: 'outline',
        toState: 'content_generated'
      }
    });
  }

  /**
   * 记录章节生成失败
   */
  logChapterGenerationError(workId: number, workTitle: string, chapterNumber: number, error: string, chapterTitle?: string): void {
    this.addEntry({
      type: 'content-craft',
      level: 'error',
      message: `❌ 生成失败: ${workTitle} 第${chapterNumber}章 - ${error}`,
      timestamp: new Date().toISOString(),
      details: {
        workId,
        workTitle,
        chapterNumber,
        chapterTitle,
        error
      }
    });
  }

  /**
   * 记录章节润色开始
   */
  logChapterPolishStart(workId: number, workTitle: string, chapterNumber: number, chapterTitle?: string): void {
    this.addEntry({
      type: 'content-craft',
      level: 'info',
      message: `✨ 开始润色: ${workTitle} 第${chapterNumber}章`,
      timestamp: new Date().toISOString(),
      details: {
        workId,
        workTitle,
        chapterNumber,
        chapterTitle
      }
    });
  }

  /**
   * 记录章节润色成功
   */
  logChapterPolishSuccess(workId: number, workTitle: string, chapterNumber: number, chapterTitle?: string, duration?: number): void {
    this.addEntry({
      type: 'content-craft',
      level: 'success',
      message: `✅ 润色完成: ${workTitle} 第${chapterNumber}章`,
      timestamp: new Date().toISOString(),
      details: {
        workId,
        workTitle,
        chapterNumber,
        chapterTitle,
        duration,
        fromState: 'first_draft',
        toState: 'polished'
      }
    });
  }

  /**
   * 记录章节润色失败
   */
  logChapterPolishError(workId: number, workTitle: string, chapterNumber: number, error: string, chapterTitle?: string): void {
    this.addEntry({
      type: 'content-craft',
      level: 'error',
      message: `❌ 润色失败: ${workTitle} 第${chapterNumber}章 - ${error}`,
      timestamp: new Date().toISOString(),
      details: {
        workId,
        workTitle,
        chapterNumber,
        chapterTitle,
        error
      }
    });
  }

  /**
   * 记录章节审核开始
   */
  logChapterAuditStart(workId: number, workTitle: string, chapterNumber: number, chapterTitle?: string): void {
    this.addEntry({
      type: 'audit',
      level: 'info',
      message: `🔍 开始审核: ${workTitle} 第${chapterNumber}章`,
      timestamp: new Date().toISOString(),
      details: {
        workId,
        workTitle,
        chapterNumber,
        chapterTitle
      }
    });
  }

  /**
   * 记录章节审核通过
   */
  logChapterAuditSuccess(workId: number, workTitle: string, chapterNumber: number, chapterTitle?: string, duration?: number, autoFixed?: boolean): void {
    const message = autoFixed 
      ? `✅ 审核通过（已自动修复）: ${workTitle} 第${chapterNumber}章`
      : `✅ 审核通过: ${workTitle} 第${chapterNumber}章`;
      
    this.addEntry({
      type: 'audit',
      level: 'success',
      message,
      timestamp: new Date().toISOString(),
      details: {
        workId,
        workTitle,
        chapterNumber,
        chapterTitle,
        duration,
        fromState: 'polished',
        toState: 'audited'
      }
    });
  }

  /**
   * 记录章节审核失败
   */
  logChapterAuditError(workId: number, workTitle: string, chapterNumber: number, error: string, chapterTitle?: string): void {
    this.addEntry({
      type: 'audit',
      level: 'error',
      message: `❌ 审核失败: ${workTitle} 第${chapterNumber}章 - ${error}`,
      timestamp: new Date().toISOString(),
      details: {
        workId,
        workTitle,
        chapterNumber,
        chapterTitle,
        error
      }
    });
  }

  // ========== 发布相关日志 ==========

  /**
   * 记录章节发布开始
   */
  logChapterPublishStart(workId: number, workTitle: string, chapterNumber: number, chapterTitle?: string, platform?: string, account?: string): void {
    this.addEntry({
      type: 'publish',
      level: 'info',
      message: `🚀 开始发布: ${workTitle} 第${chapterNumber}章`,
      timestamp: new Date().toISOString(),
      details: {
        workId,
        workTitle,
        chapterNumber,
        chapterTitle,
        platform,
        account
      }
    });
  }

  /**
   * 记录章节发布成功
   */
  logChapterPublishSuccess(workId: number, workTitle: string, chapterNumber: number, chapterTitle?: string, duration?: number, platform?: string, account?: string): void {
    this.addEntry({
      type: 'publish',
      level: 'success',
      message: `✅ 发布成功: ${workTitle} 第${chapterNumber}章`,
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
        toState: 'published'
      }
    });
  }

  /**
   * 记录章节发布失败
   */
  logChapterPublishError(workId: number, workTitle: string, chapterNumber: number, error: string, chapterTitle?: string, platform?: string, account?: string): void {
    this.addEntry({
      type: 'publish',
      level: 'error',
      message: `❌ 发布失败: ${workTitle} 第${chapterNumber}章 - ${error}`,
      timestamp: new Date().toISOString(),
      details: {
        workId,
        workTitle,
        chapterNumber,
        chapterTitle,
        error,
        platform,
        account
      }
    });
  }

  /**
   * 记录发布服务启动
   */
  logPublishServiceStart(): void {
    this.addEntry({
      type: 'system',
      level: 'info',
      message: '🚀 自动发布服务已启动',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录发布服务停止
   */
  logPublishServiceStop(): void {
    this.addEntry({
      type: 'system',
      level: 'info',
      message: '🛑 自动发布服务已停止',
      timestamp: new Date().toISOString()
    });
  }
}

// 单例实例
let activityLogInstance: ActivityLog | null = null;

export function getActivityLog(): ActivityLog {
  if (!activityLogInstance) {
    activityLogInstance = new ActivityLog();
  }
  return activityLogInstance;
}
