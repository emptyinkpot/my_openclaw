/**
 * OpenClaw Workspace - Hooks 基类
 * 
 * 所有 Hook 的基础类，提供统一的配置、日志和工具函数
 * 
 * OpenClaw Hook 规范：
 * - 必须导出一个函数作为 handler
 * - 默认使用 `default` 导出
 * - metadata 通过 getMetadata() 方法提供
 * 
 * @module lib/base-hook
 */

const path = require('path');
const { ensureDir, formatTimestamp, formatLocalTime, appendJsonl, createLogger } = require('./utils');
const config = require('./config');

/**
 * Hook 基类
 */
class BaseHook {
  /**
   * @param {object} options - 配置选项
   * @param {string} options.name - Hook 名称
   * @param {string} options.version - 版本号
   * @param {string} options.description - 描述
   * @param {string} options.emoji - emoji 图标
   * @param {Array<string>} options.events - 监听的事件
   * @param {number} options.priority - 优先级（数字越小越先执行）
   */
  constructor(options) {
    const { name, version, description, emoji, events, priority } = options;
    
    this.name = name;
    this.version = version;
    this.description = description;
    this.emoji = emoji || '🔌';
    this.events = events || [];
    this.priority = priority || 100;
    
    this.logger = createLogger(`Hook:${name}`);
    this._enabled = true;
  }
  
  // ============================================================
  // 元数据
  // ============================================================
  
  /**
   * 获取 OpenClaw 元数据
   */
  getMetadata() {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      author: 'openclaw-workspace',
      openclaw: {
        emoji: this.emoji,
        events: this.events,
        priority: this.priority,
      },
    };
  }
  
  // ============================================================
  // 生命周期
  // ============================================================
  
  /**
   * 初始化（子类可覆盖）
   */
  async init() {
    this.logger.debug('初始化完成');
  }
  
  /**
   * 处理事件（子类必须实现）
   * @param {object} event - 事件对象
   * @returns {object} - 返回结果
   */
  async handle(event) {
    throw new Error('子类必须实现 handle 方法');
  }
  
  /**
   * 清理（子类可覆盖）
   */
  async cleanup() {
    this.logger.debug('清理完成');
  }
  
  // ============================================================
  // 响应构建
  // ============================================================
  
  /**
   * 构建允许继续的响应
   */
  response(proceed, options = {}) {
    if (proceed) {
      return {
        proceed: true,
        ...options,
      };
    } else {
      return {
        blocked: true,
        message: options.message || '操作被阻止',
        ...options,
      };
    }
  }
  
  /**
   * 构建阻止响应
   */
  block(message, options = {}) {
    return this.response(false, { message, ...options });
  }
  
  /**
   * 构建警告响应（允许继续但有警告）
   */
  warn(message, options = {}) {
    return this.response(true, {
      feedback: { type: 'warning', message },
      ...options,
    });
  }
  
  // ============================================================
  // 工具方法
  // ============================================================
  
  /**
   * 确保日志目录存在
   */
  ensureLogDir() {
    ensureDir(path.join(config.PATHS.LOGS, 'hooks'));
  }
  
  /**
   * 获取日志文件路径
   */
  getLogPath(filename) {
    return path.join(config.PATHS.LOGS, 'hooks', this.name, filename);
  }
  
  /**
   * 记录事件到 JSONL
   */
  logEvent(event, data = {}) {
    const logPath = this.getLogPath('events.jsonl');
    ensureDir(path.dirname(logPath));
    
    appendJsonl(logPath, {
      hook: this.name,
      event,
      timestamp: formatTimestamp(),
      localTime: formatLocalTime(),
      ...data,
    });
  }
  
  /**
   * 启用/禁用 Hook
   */
  setEnabled(enabled) {
    this._enabled = enabled;
    this.logger.info(enabled ? '已启用' : '已禁用');
  }
  
  /**
   * 检查是否启用
   */
  isEnabled() {
    return this._enabled;
  }
}

// ============================================================
// 导出辅助函数
// ============================================================

/**
 * 创建 OpenClaw 兼容的 Hook 导出
 * 
 * 用法:
 * ```javascript
 * class MyHook extends BaseHook {
 *   async handle(event) { ... }
 * }
 * 
 * module.exports = createHookExport(new MyHook({ ... }));
 * ```
 */
function createHookExport(hookInstance) {
  // 创建 handler 函数
  const handler = async (event) => {
    return hookInstance.handle(event);
  };
  
  // 添加 metadata 方法
  handler.getMetadata = () => hookInstance.getMetadata();
  
  // 添加实例引用
  handler.instance = hookInstance;
  
  return handler;
}

/**
 * 从类创建 Hook 并导出
 * 
 * 用法:
 * ```javascript
 * // 在文件末尾
 * module.exports = createHookFromClass(MyHookClass, {
 *   name: 'my-hook',
 *   events: ['tool:call'],
 * });
 * ```
 */
function createHookFromClass(HookClass, options) {
  const instance = new HookClass(options);
  return createHookExport(instance);
}

// ============================================================
// 消息解析工具
// ============================================================

/**
 * 从事件中提取消息内容
 */
function extractMessage(event) {
  if (!event) return null;
  
  // 尝试多种格式
  if (event.message) return event.message;
  if (event.payload?.message) return event.payload.message;
  if (event.data?.message) return event.data.message;
  
  return null;
}

/**
 * 检测消息类型
 */
function detectMessageType(message) {
  if (!message) return 'unknown';
  
  const content = typeof message === 'string' ? message : 
                  message.content || message.text || '';
  
  if (content.startsWith('/')) return 'command';
  if (content.includes('http')) return 'link';
  if (content.length < 10) return 'short';
  
  return 'normal';
}

/**
 * 提取工具调用信息
 */
function extractToolCall(event) {
  if (!event) return null;
  
  // tool:call 事件格式
  if (event.tool) {
    return {
      name: event.tool.name || event.tool,
      arguments: event.arguments || event.tool.arguments || {},
    };
  }
  
  // 其他格式
  if (event.payload?.tool) {
    return {
      name: event.payload.tool.name,
      arguments: event.payload.tool.arguments || {},
    };
  }
  
  return null;
}

// ============================================================
// 导出
// ============================================================

module.exports = {
  BaseHook,
  createHookExport,
  createHookFromClass,
  extractMessage,
  detectMessageType,
  extractToolCall,
};
