/**
 * Self-Heal Hook
 * 自我维护系统 - 自动监控、诊断、修复、学习
 * 
 * @module hooks/self-heal
 */

const { BaseHook, extractMessage, formatTimestamp, appendJsonl, readJsonl, createLogger } = require('../../lib');
const config = require('../../lib/config');
const fs = require('fs');
const path = require('path');

class SelfHealHook extends BaseHook {
  constructor() {
    super({
      name: 'self-heal',
      version: '2.1.0',
      description: '自我维护系统',
      emoji: '🔧',
      events: ['tool:complete', 'command'],  // 使用支持的事件
      priority: 150,
    });
    
    // 知识库文档
    this.knowledgeDocs = [
      'DEBUG_LOG.md',
      '已验证代码库.md',
      '用户教导记录.md',
      '元素选择器字典.md',
    ];
  }
  
  /**
   * 处理事件
   */
  async handle(event) {
    if (!this.isEnabled()) {
      return this.response(true, { skipped: true });
    }
    
    // 处理命令
    if (event.type === 'message') {
      return this.handleCommand(event);
    }
    
    // 监控任务完成
    if (event.type === 'task:complete') {
      return this.handleTaskComplete(event);
    }
    
    // 监控错误
    if (event.type === 'error') {
      return this.handleError(event);
    }
    
    return this.response(true);
  }
  
  /**
   * 处理命令
   */
  async handleCommand(event) {
    const { content } = extractMessage(event);
    const lowerContent = content.toLowerCase();
    
    if (content === '/heal' || lowerContent.includes('自我修复') || lowerContent.includes('自动修复')) {
      const result = await this.heal();
      return { reply: this.reply(`\`\`\`\n${result}\n\`\`\``) };
    }
    
    if (content === '/diagnose' || lowerContent.includes('诊断')) {
      const keyword = content.replace('/diagnose', '').replace('诊断', '').trim();
      const result = this.diagnose(keyword);
      return { reply: this.reply(`\`\`\`\n${result}\n\`\`\``) };
    }
    
    if (content === '/learn' || lowerContent.includes('学习')) {
      const result = this.learn();
      return { reply: this.reply(`\`\`\`\n${result}\n\`\`\``) };
    }
    
    if (content === '/report' || lowerContent.includes('报告')) {
      const result = this.report();
      return { reply: this.reply(`\`\`\`\n${result}\n\`\`\``) };
    }
    
    return this.response(true);
  }
  
  /**
   * 处理任务完成
   */
  handleTaskComplete(event) {
    const { success, task, error } = event;
    
    // 记录经验
    this.recordExperience(success ? 'success' : 'failure', {
      task: task?.name || 'unknown',
      duration: task?.duration,
      steps: task?.steps,
      error: error?.message,
    });
    
    return this.response(true, { recorded: true });
  }
  
  /**
   * 处理错误
   */
  handleError(event) {
    const { error, context } = event;
    
    // 记录错误
    this.logError(error, context);
    
    // 搜索相关经验
    const keyword = error?.message?.split(' ').slice(0, 3).join(' ') || '';
    const experiences = this.searchExperience(keyword);
    const knowledge = this.searchKnowledge(keyword);
    
    if (experiences.length > 0 || knowledge.length > 0) {
      return this.response(true, {
        feedback: this.feedback('suggestion', 
          `🔍 发现相关历史经验\n\n知识库: ${knowledge.length} 条\n经验库: ${experiences.length} 条\n\n运行 /diagnose ${keyword} 查看详情`
        ),
      });
    }
    
    return this.response(true);
  }
  
  /**
   * 记录经验
   */
  recordExperience(type, data) {
    const experienceDir = config.HOOKS.experienceDir;
    fs.mkdirSync(experienceDir, { recursive: true });
    
    const file = type === 'success'
      ? path.join(experienceDir, 'success.jsonl')
      : path.join(experienceDir, 'failures.jsonl');
    
    appendJsonl(file, {
      timestamp: formatTimestamp(),
      ...data,
    });
  }
  
  /**
   * 搜索经验
   */
  searchExperience(keyword) {
    const experienceDir = config.HOOKS.experienceDir;
    const results = [];
    
    const files = ['success.jsonl', 'failures.jsonl'].map(f => path.join(experienceDir, f));
    
    for (const file of files) {
      const records = readJsonl(file, { limit: 100 });
      for (const record of records) {
        if (JSON.stringify(record).toLowerCase().includes(keyword.toLowerCase())) {
          results.push(record);
        }
      }
    }
    
    return results;
  }
  
  /**
   * 搜索知识库
   */
  searchKnowledge(keyword) {
    const docsDir = path.join(config.ROOT.autoScripts, 'docs');
    const results = [];
    
    for (const docName of this.knowledgeDocs) {
      const docPath = path.join(docsDir, docName);
      
      if (fs.existsSync(docPath)) {
        const content = fs.readFileSync(docPath, 'utf-8');
        
        if (content.toLowerCase().includes(keyword.toLowerCase())) {
          const lines = content.split('\n');
          const matches = lines.filter(l => l.toLowerCase().includes(keyword.toLowerCase()));
          
          results.push({
            file: docName,
            matches: matches.slice(0, 5),
          });
        }
      }
    }
    
    return results;
  }
  
  /**
   * 执行修复
   */
  async heal() {
    // 检查常见问题并修复
    const fixes = [];
    
    // 1. 清理锁文件
    const browserDirs = [config.PLATFORMS.baimeng.browserDir, config.PLATFORMS.fanqie.browserDir];
    for (const dir of browserDirs) {
      for (const lockFile of ['SingletonLock', 'SingletonSocket', 'SingletonCookie']) {
        const lockPath = path.join(dir, lockFile);
        if (fs.existsSync(lockPath)) {
          fs.unlinkSync(lockPath);
          fixes.push(`清理锁文件: ${lockFile}`);
        }
      }
    }
    
    // 2. 清理过期日志
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    const logFiles = [
      this.getLogPath('events.jsonl'),
      this.getLogPath('errors.jsonl'),
    ];
    
    for (const file of logFiles) {
      const { cleanJsonl } = require('../../lib/utils');
      cleanJsonl(file, maxAge);
    }
    fixes.push('清理过期日志');
    
    return fixes.length > 0 
      ? `修复完成:\n${fixes.map(f => `  ✓ ${f}`).join('\n')}`
      : '无需修复';
  }
  
  /**
   * 诊断
   */
  diagnose(keyword) {
    let result = '📊 诊断结果\n\n';
    
    if (keyword) {
      const knowledge = this.searchKnowledge(keyword);
      result += `知识库搜索 "${keyword}":\n`;
      
      for (const item of knowledge) {
        result += `\n📄 ${item.file}:\n`;
        for (const match of item.matches) {
          result += `  - ${match.substring(0, 100)}\n`;
        }
      }
      
      const experiences = this.searchExperience(keyword);
      if (experiences.length > 0) {
        result += `\n📚 经验库 (${experiences.length} 条):\n`;
        for (const exp of experiences.slice(0, 3)) {
          result += `  - ${exp.task}: ${exp.error || '成功'}\n`;
        }
      }
    } else {
      result += '请提供关键词，如: /diagnose playwright';
    }
    
    return result;
  }
  
  /**
   * 学习（从最近的成功经验中提取模式）
   */
  learn() {
    const experienceDir = config.HOOKS.experienceDir;
    const successFile = path.join(experienceDir, 'success.jsonl');
    
    const records = readJsonl(successFile, { limit: 50 });
    
    if (records.length === 0) {
      return '暂无成功经验可学习';
    }
    
    // 统计任务类型
    const taskCounts = {};
    for (const record of records) {
      const task = record.task || 'unknown';
      taskCounts[task] = (taskCounts[task] || 0) + 1;
    }
    
    let result = `📖 学习结果（基于 ${records.length} 条成功经验）\n\n`;
    result += '任务统计:\n';
    
    for (const [task, count] of Object.entries(taskCounts).sort((a, b) => b[1] - a[1])) {
      result += `  ${task}: ${count} 次\n`;
    }
    
    return result;
  }
  
  /**
   * 生成报告
   */
  report() {
    const experienceDir = config.HOOKS.experienceDir;
    
    const successRecords = readJsonl(path.join(experienceDir, 'success.jsonl'), { limit: 100 });
    const failureRecords = readJsonl(path.join(experienceDir, 'failures.jsonl'), { limit: 100 });
    
    let result = '📈 运行报告\n\n';
    result += `成功: ${successRecords.length} 次\n`;
    result += `失败: ${failureRecords.length} 次\n`;
    
    if (failureRecords.length > 0) {
      result += '\n最近失败:\n';
      for (const record of failureRecords.slice(0, 5)) {
        result += `  - ${record.task}: ${record.error || '未知错误'}\n`;
      }
    }
    
    return result;
  }
}


// 导出 - OpenClaw 兼容格式
const { createHookExport } = require('../../lib');
const hookInstance = new SelfHealHook();
module.exports = createHookExport(hookInstance);
module.exports.SelfHealHook = SelfHealHook;
