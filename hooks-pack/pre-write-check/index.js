/**
 * Pre-Write Check Hook
 * 代码写入后检查 - 提醒 AI 遵守强制入口流程
 * 
 * 触发时机：tool:complete（工具调用完成后）
 * 功能：提醒 AI 检查知识库，而非强制阻止
 * 
 * @module hooks/pre-write-check
 */

const { BaseHook } = require('../lib');
const config = require('../lib/config');
const path = require('path');

class PreWriteCheckHook extends BaseHook {
  constructor() {
    super({
      name: 'pre-write-check',
      version: '1.1.0',
      description: '代码写入检查 - 提醒检查知识库',
      emoji: '🔍',
      events: ['tool:complete'],  // 使用 tool:complete
      priority: 1,  // 最高优先级
    });
    
    // 需要强制检查的项目路径
    this.watchPaths = [
      '/workspace/projects/auto-scripts/src/',
      '/workspace/projects/auto-scripts/scripts/',
    ];
    
    // 知识库文件（用于提醒）
    this.knowledgeFiles = [
      'docs/已验证代码库.md',
      'docs/DEBUG_LOG.md',
      'docs/元素选择器字典.md',
      'docs/用户教导记录.md',
    ];
    
    // 已检查标记（会话内有效）
    this._checkedInSession = new Set();
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
    
    // 检查是否是需要强制检查的路径
    const needsCheck = this.watchPaths.some(p => filePath.startsWith(p));
    if (!needsCheck) {
      return this.response(true);
    }
    
    // 检查是否已在此会话中标记过
    if (this._checkedInSession.has(filePath)) {
      return this.response(true, { alreadyChecked: true });
    }
    
    // 生成提醒消息
    const reminder = this.generateReminder(filePath);
    
    // 记录
    this.logEvent({
      type: 'reminder',
      file: filePath,
      reminded: true,
    });
    
    // 返回提醒（不阻止写入，但给出提示）
    return this.response(true, {
      feedback: this.feedback('info', reminder),
      requiresCheck: true,
    });
  }
  
  /**
   * 生成提醒消息
   */
  generateReminder(filePath) {
    const relativePath = filePath.replace('/workspace/projects/auto-scripts/', '');
    
    return `📝 即将修改: ${relativePath}

🔴 强制入口流程提醒：

修改 auto-scripts 代码前，请确认已执行：

1. 搜索知识库
   grep "关键词" /workspace/projects/auto-scripts/docs/

2. 检查已验证代码
   docs/已验证代码库.md

3. 检查历史问题
   docs/DEBUG_LOG.md

4. 使用 runTask() 入口

⚠️ 如未执行以上步骤，请先执行！
✅ 如已执行，请继续写入代码。`;
  }
  
  /**
   * 标记已检查（可由 AI 调用）
   */
  markChecked(filePath) {
    this._checkedInSession.add(filePath);
    this.logger.info(`已标记检查: ${filePath}`);
  }
  
  /**
   * 清除检查标记
   */
  clearChecks() {
    this._checkedInSession.clear();
  }
}


// 导出 - OpenClaw 兼容格式
const { createHookExport } = require('../lib');
const hookInstance = new PreWriteCheckHook();
module.exports = createHookExport(hookInstance);
module.exports.PreWriteCheckHook = PreWriteCheckHook;
