/**
 * Task Logger Hook
 * AI 完成任务后自动记录并执行预设任务
 * 
 * @module hooks/task-logger
 */

const { BaseHook, extractToolCall, ensureDir, createLogger } = require('../../lib');
const { spawn } = require('child_process');
const path = require('path');
const config = require('../../lib/config');

class TaskLoggerHook extends BaseHook {
  constructor() {
    super({
      name: 'task-logger',
      version: '3.0.0',
      description: '任务日志记录',
      emoji: '📋',
      events: ['tool:complete', 'command'],
      priority: 200,
    });
    
    // 工具映射到预设任务
    this.toolMappings = {
      'write_file': 'after-script',
      'edit_file': 'after-script',
      'bash': 'after-command',
      'exec': 'after-command',
    };
    
    // 预设任务
    this.presetTasks = {
      'after-script': ['step-trace', 'tree-diagram'],
      'after-command': ['git-sync'],
    };
    
    // 防抖
    this.lastExecutionTime = 0;
    this.debounceMs = config.TIMEOUTS.debounce;
    
    // 操作统计
    this.operationStats = {};
    this.modifiedFiles = [];
  }
  
  /**
   * 处理事件
   */
  async handle(event) {
    if (!this.isEnabled()) {
      return this.response(true, { skipped: true });
    }
    
    const eventType = event.type;
    const action = event.action;
    
    // 1. 记录操作
    if (eventType === 'tool' && action === 'complete') {
      const toolCall = extractToolCall(event);
      this.updateStats(toolCall.tool, toolCall.input);
      
      // 记录到 auto-logger
      await this.logToAutoLogger(toolCall);
    }
    
    // 2. 确定预设任务
    const presetName = this.determinePreset(eventType, action, event.context);
    if (!presetName) {
      return this.response(true, { logged: true });
    }
    
    this.logger.info(`触发预设: ${presetName}`);
    
    // 3. 执行预设任务（带防抖）
    const result = await this.debouncedRun(presetName);
    
    // 4. 重置统计
    if (!result.skipped) {
      this.resetStats();
    }
    
    return this.response(true, {
      processed: true,
      preset: presetName,
      ...result,
    });
  }
  
  /**
   * 更新操作统计
   */
  updateStats(toolName, input) {
    // 标准化工具名
    let normalized = toolName;
    for (const tool of Object.keys(this.toolMappings)) {
      if (toolName && toolName.toLowerCase().includes(tool.toLowerCase())) {
        normalized = tool;
        break;
      }
    }
    
    this.operationStats[normalized] = (this.operationStats[normalized] || 0) + 1;
    
    if (input?.file_path || input?.path) {
      this.modifiedFiles.push(input.file_path || input.path);
    }
  }
  
  /**
   * 确定预设任务
   */
  determinePreset(eventType, action, context) {
    if (eventType === 'tool' && action === 'complete') {
      const tool = context?.toolName || context?.tool;
      
      for (const [t, preset] of Object.entries(this.toolMappings)) {
        if (tool && tool.toLowerCase().includes(t.toLowerCase())) {
          return preset;
        }
      }
    }
    
    if (eventType === 'command') {
      if (['new', 'reset'].includes(action)) {
        return 'after-reset';
      }
    }
    
    return null;
  }
  
  /**
   * 防抖执行
   */
  async debouncedRun(presetName) {
    const now = Date.now();
    const timeSinceLast = now - this.lastExecutionTime;
    
    if (timeSinceLast < this.debounceMs) {
      this.logger.info(`防抖跳过 (${timeSinceLast}ms < ${this.debounceMs}ms)`);
      return { skipped: true };
    }
    
    this.lastExecutionTime = now;
    return this.runPreset(presetName);
  }
  
  /**
   * 执行预设任务
   */
  async runPreset(presetName) {
    const runnerPath = config.SKILLS.runnerPath;
    
    if (!require('fs').existsSync(runnerPath)) {
      this.logger.warn('runner.js 不存在，跳过');
      return { success: false, error: 'Runner not found' };
    }
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const child = spawn('node', [runnerPath, presetName], {
        cwd: path.dirname(runnerPath),
        stdio: 'inherit',
        timeout: config.TIMEOUTS.heartbeat,
      });
      
      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        
        if (code === 0) {
          this.logger.success(`预设 ${presetName} 完成 (${duration}ms)`);
        } else {
          this.logger.error(`预设 ${presetName} 失败 (code: ${code})`);
        }
        
        resolve({ success: code === 0, code, duration });
      });
      
      child.on('error', (err) => {
        this.logger.error(`执行错误: ${err.message}`);
        resolve({ success: false, error: err.message });
      });
    });
  }
  
  /**
   * 记录到 auto-logger
   */
  async logToAutoLogger(toolCall) {
    const autoLoggerPath = config.SKILLS.autoLoggerPath;
    
    if (!require('fs').existsSync(autoLoggerPath)) return;
    
    try {
      const module = require(autoLoggerPath);
      if (typeof module.logAction === 'function') {
        module.logAction({
          tool: toolCall.tool,
          input: toolCall.input,
          output: toolCall.output,
          success: toolCall.success,
        });
      }
    } catch (e) {
      this.logger.warn(`auto-logger 调用失败: ${e.message}`);
    }
  }
  
  /**
   * 重置统计
   */
  resetStats() {
    this.operationStats = {};
    this.modifiedFiles = [];
  }
  
  /**
   * 格式化统计
   */
  formatStats() {
    const parts = [];
    for (const [tool, count] of Object.entries(this.operationStats)) {
      parts.push(count > 1 ? `${tool} ×${count}` : tool);
    }
    return parts.join(', ');
  }
}

// 导出 - 使用 createHookExport 创建 OpenClaw 兼容的导出
const { createHookExport } = require('../../lib');
const taskLoggerInstance = new TaskLoggerHook();

module.exports = createHookExport(taskLoggerInstance);
module.exports.TaskLoggerHook = TaskLoggerHook;
module.exports.instance = taskLoggerInstance;
