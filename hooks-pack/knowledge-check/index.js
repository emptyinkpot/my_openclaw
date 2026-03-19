/**
 * Knowledge Check Hook
 * 知识库检查验证 - 验证 AI 是否声明已检查知识库
 * 
 * 触发时机：tool:complete（工具调用完成后）
 * 功能：检查 AI 是否在最近的对话中声明了已检查知识库
 * 
 * @module hooks/knowledge-check
 */

const { BaseHook } = require('../lib');

class KnowledgeCheckHook extends BaseHook {
  constructor() {
    super({
      name: 'knowledge-check',
      version: '1.1.0',
      description: '知识库检查验证',
      emoji: '📚',
      events: ['tool:complete'],  // 使用 tool:complete
      priority: 2,  // 仅次于 pre-write-check
    });
    
    // 需要检查的项目路径
    this.watchPaths = [
      '/workspace/projects/auto-scripts/src/',
      '/workspace/projects/auto-scripts/scripts/',
    ];
    
    // 声明格式（AI 必须在对话中输出）
    this.declarationPatterns = [
      /已验证模块[：:]\s*[\w\-,\s]+/i,
      /选择器[：:]\s*[\w\-,\s]+/i,
      /检查知识库/i,
      /📋\s*检查/i,
    ];
    
    // 会话内已验证的文件
    this._verifiedFiles = new Set();
    
    // 最近的对话内容（简化版）
    this._recentMessages = [];
    this._maxRecentMessages = 10;
  }
  
  /**
   * 处理事件
   */
  async handle(event) {
    if (!this.isEnabled()) {
      return this.response(true, { skipped: true });
    }
    
    const context = event.context || {};
    const tool = context.toolName || context.tool || event.action;
    
    // 只处理文件写入类工具
    if (!['write_file', 'edit_file', 'create_file'].includes(tool)) {
      return this.response(true);
    }
    
    const filePath = context.input?.file_path || context.input?.path || '';
    
    // 检查是否是需要验证的路径
    const needsCheck = this.watchPaths.some(p => filePath.startsWith(p));
    if (!needsCheck) {
      return this.response(true);
    }
    
    // 检查是否已在此会话中验证过
    if (this._verifiedFiles.has(filePath)) {
      return this.response(true, { verified: true });
    }
    
    // 检查最近的对话中是否有声明
    const hasDeclaration = this.checkRecentDeclaration();
    
    if (hasDeclaration) {
      // 标记为已验证
      this._verifiedFiles.add(filePath);
      this.logEvent({ type: 'verified', file: filePath, method: 'declaration' });
      return this.response(true, { verified: true });
    }
    
    // 未找到声明，给出提醒
    this.logEvent({ type: 'reminder', file: filePath, method: 'missing_declaration' });
    
    return this.response(true, {
      feedback: this.feedback('warning', this.generateReminder(filePath)),
      needsDeclaration: true,
    });
  }
  
  /**
   * 检查最近的对话中是否有声明
   */
  checkRecentDeclaration() {
    // 由于 Hook 无法访问完整对话历史，
    // 我们采用一个简化方案：返回 false，每次都提醒
    // 实际效果：AI 每次写入代码都会收到提醒
    // 
    // 更好的方案需要 OpenClaw 提供 message:sent 事件
    return false;
  }
  
  /**
   * 记录消息（供外部调用）
   */
  recordMessage(content) {
    this._recentMessages.push({
      content,
      timestamp: Date.now(),
    });
    
    // 保持最近 N 条
    if (this._recentMessages.length > this._maxRecentMessages) {
      this._recentMessages.shift();
    }
  }
  
  /**
   * 生成提醒消息
   */
  generateReminder(filePath) {
    const relativePath = filePath.replace('/workspace/projects/auto-scripts/', '');
    
    return `📚 知识库检查提醒

即将修改: ${relativePath}

⚠️ 在写入代码前，请先在对话中声明：

📋 检查知识库：
- 已验证模块: [使用的模块名]
- 选择器: [使用的选择器]

然后再写入代码。

提示：这是自动提醒，如已声明请继续。`;
  }
  
  /**
   * 手动标记为已验证
   */
  markVerified(filePath) {
    this._verifiedFiles.add(filePath);
    this.logger.info(`已标记验证: ${filePath}`);
  }
}


// 导出 - OpenClaw 兼容格式
const { createHookExport } = require('../lib');
const hookInstance = new KnowledgeCheckHook();
module.exports = createHookExport(hookInstance);
module.exports.KnowledgeCheckHook = KnowledgeCheckHook;
