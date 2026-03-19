/**
 * Sender Trigger Hook
 * 特定发送者的消息触发任务
 * 
 * @module hooks/sender-trigger
 */

const { BaseHook, extractMessage, createLogger } = require('../lib');
const { spawn } = require('child_process');
const path = require('path');
const config = require('../lib/config');

class SenderTriggerHook extends BaseHook {
  constructor() {
    super({
      name: 'sender-trigger',
      version: '2.0.0',
      description: '特定发送者触发任务',
      emoji: '🎯',
      events: ['message:received'],
      priority: 50,
    });
    
    // 发送者规则（可扩展）
    this.senderRules = {};
    
    // 加载规则
    this.loadRules();
  }
  
  /**
   * 加载规则
   */
  loadRules() {
    // 可以从配置文件加载
    const rulesFile = this.getLogPath('rules.json');
    const fs = require('fs');
    
    if (fs.existsSync(rulesFile)) {
      try {
        this.senderRules = JSON.parse(fs.readFileSync(rulesFile, 'utf-8'));
      } catch (e) {
        this.logger.warn(`加载规则失败: ${e.message}`);
      }
    }
  }
  
  /**
   * 处理事件
   */
  async handle(event) {
    if (!this.isEnabled()) {
      return this.response(true, { skipped: true });
    }
    
    if (Object.keys(this.senderRules).length === 0) {
      return this.response(true);
    }
    
    const msg = extractMessage(event);
    const senderRule = this.senderRules[msg.from];
    
    if (!senderRule) {
      return this.response(true);
    }
    
    // 收集要执行的任务
    const tasksToRun = this.collectTasks(senderRule, msg.content);
    
    if (tasksToRun.length === 0) {
      return this.response(true);
    }
    
    this.logger.info(`发送者: ${senderRule.name || msg.from}`);
    this.logger.info(`触发任务: ${tasksToRun.join(', ')}`);
    
    // 执行任务
    const results = [];
    for (const task of tasksToRun) {
      const result = await this.runPreset(task);
      results.push({ task, ...result });
    }
    
    // 记录
    this.logEvent({
      type: 'trigger',
      from: msg.from,
      rule: senderRule.name,
      tasks: tasksToRun,
      success: results.every(r => r.success),
    });
    
    // 返回回复
    if (senderRule.reply) {
      return {
        reply: this.reply(senderRule.reply),
        tasks: tasksToRun,
        results,
      };
    }
    
    return this.response(true, { tasks: tasksToRun, results });
  }
  
  /**
   * 收集要执行的任务
   */
  collectTasks(rule, content) {
    const tasks = new Set();
    
    // always 规则
    if (rule.triggers?.always) {
      rule.triggers.always.forEach(t => tasks.add(t));
    }
    
    // 关键词规则
    if (rule.triggers?.keywords) {
      for (const [keyword, keywordTasks] of Object.entries(rule.triggers.keywords)) {
        if (content.includes(keyword)) {
          keywordTasks.forEach(t => tasks.add(t));
        }
      }
    }
    
    return Array.from(tasks);
  }
  
  /**
   * 执行预设任务
   */
  async runPreset(presetName) {
    const runnerPath = config.SKILLS.runnerPath;
    
    if (!require('fs').existsSync(runnerPath)) {
      return { success: false, error: 'Runner not found' };
    }
    
    return new Promise((resolve) => {
      const child = spawn('node', [runnerPath, presetName], {
        cwd: path.dirname(runnerPath),
        stdio: 'inherit',
        timeout: config.TIMEOUTS.heartbeat,
      });
      
      child.on('close', (code) => {
        resolve({ success: code === 0, code });
      });
      
      child.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    });
  }
  
  /**
   * 添加发送者规则
   */
  addRule(senderId, rule) {
    this.senderRules[senderId] = rule;
    this.saveRules();
  }
  
  /**
   * 保存规则
   */
  saveRules() {
    this.ensureLogDir();
    const fs = require('fs');
    fs.writeFileSync(
      this.getLogPath('rules.json'),
      JSON.stringify(this.senderRules, null, 2),
      'utf-8'
    );
  }
}


// 导出 - OpenClaw 兼容格式
const { createHookExport } = require('../lib');
const hookInstance = new SenderTriggerHook();
module.exports = createHookExport(hookInstance);
module.exports.SenderTriggerHook = SenderTriggerHook;
