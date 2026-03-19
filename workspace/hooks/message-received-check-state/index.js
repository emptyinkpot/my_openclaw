/**
 * Message Received Check State Hook
 * 用户发送消息时自动检测对话状态
 * 
 * @module hooks/message-received-check-state
 */

const { BaseHook, extractMessage, detectMessageType, formatTimestamp, formatLocalTime, generateTraceId, appendJsonl } = require('../../lib');
const config = require('../../lib/config');

class MessageStateHook extends BaseHook {
  constructor() {
    super({
      name: 'message-received-check-state',
      version: '2.0.0',
      description: '消息状态检测',
      emoji: '🔍',
      events: ['message:received'],
      priority: 100,
    });
    
    // 关键词规则
    this.keywordRules = {
      '润色': { action: 'polish', priority: 'high' },
      '同步': { action: 'sync', priority: 'normal' },
      '发布': { action: 'publish', priority: 'high' },
      '生成': { action: 'generate', priority: 'normal' },
      '状态': { action: 'status', priority: 'low' },
      '帮助': { action: 'help', priority: 'low' },
    };
    
    // 日志保留天数
    this.maxLogDays = 7;
  }
  
  /**
   * 处理事件
   */
  async handle(event) {
    if (!this.isEnabled()) {
      return this.response(true, { skipped: true });
    }
    
    const startTime = Date.now();
    const msg = extractMessage(event);
    
    // 检测状态
    const state = this.detectState(msg.content);
    
    // 记录
    const record = {
      traceId: generateTraceId('msg'),
      from: msg.from,
      content: msg.content.substring(0, 200),
      channelId: msg.channelId,
      state: state.type,
      confidence: state.confidence,
      suggestedAction: state.suggestedAction,
      duration: Date.now() - startTime,
    };
    
    this.logEvent(record);
    
    // 清理过期日志
    this.cleanOldLogs();
    
    return this.response(true, {
      processed: true,
      state: record.state,
      suggestedAction: record.suggestedAction,
    });
  }
  
  /**
   * 检测对话状态
   */
  detectState(content) {
    const result = {
      type: 'message',
      confidence: 0.5,
      suggestedAction: null,
    };
    
    // 使用共享工具检测
    const msgType = detectMessageType(content);
    result.type = msgType.type;
    
    if (msgType.type === 'command') {
      result.confidence = 1.0;
      result.suggestedAction = msgType.command;
      return result;
    }
    
    // 检测关键词
    const keywords = this.detectKeywords(content);
    if (keywords.length > 0) {
      result.type = 'intent';
      result.confidence = 0.8;
      result.suggestedAction = keywords[0].action;
      return result;
    }
    
    // 其他类型
    if (msgType.type === 'question') {
      result.confidence = 0.7;
    } else if (msgType.type === 'confirmation' || msgType.type === 'negation') {
      result.confidence = 0.9;
    }
    
    return result;
  }
  
  /**
   * 检测关键词
   */
  detectKeywords(content) {
    const detected = [];
    const lowerContent = content.toLowerCase();
    
    for (const [keyword, rule] of Object.entries(this.keywordRules)) {
      if (lowerContent.includes(keyword)) {
        detected.push({ keyword, ...rule });
      }
    }
    
    // 按优先级排序
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    detected.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    
    return detected;
  }
  
  /**
   * 清理过期日志
   */
  cleanOldLogs() {
    const maxAge = this.maxLogDays * 24 * 60 * 60 * 1000;
    const logFile = this.getLogPath('events.jsonl');
    
    // 使用共享工具清理
    const { cleanJsonl } = require('../../lib/utils');
    cleanJsonl(logFile, maxAge);
  }
}


// 导出 - OpenClaw 兼容格式
const { createHookExport } = require('../../lib');
const hookInstance = new MessageStateHook();
module.exports = createHookExport(hookInstance);
module.exports.MessageStateHook = MessageStateHook;
