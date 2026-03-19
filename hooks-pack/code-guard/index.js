/**
 * Code Guard Hook
 * 代码规范守护 - 检查代码写入是否符合规范
 * 
 * 触发时机：tool:complete（工具调用完成后检查）
 * 
 * 注意：由于 OpenClaw 当前版本不支持 tool:call 事件，
 * 本 Hook 在 tool:complete 时检查，虽然无法阻止写入，
 * 但可以记录违规并发出警告。
 * 
 * @module hooks/code-guard
 */

const { BaseHook } = require('../lib');
const config = require('../lib/config');

class CodeGuardHook extends BaseHook {
  constructor() {
    super({
      name: 'code-guard',
      version: '3.1.0',
      description: '代码规范守护 - 检查代码合规性',
      emoji: '🛡️',
      events: ['tool:complete'],  // 使用 tool:complete（当前支持的事件）
      priority: 5,  // 高优先级
    });
    
    // 禁止模式（严重违规，阻止写入）
    this.forbiddenPatterns = [
      { 
        pattern: /localStorage\.clear\s*\(/, 
        message: 'localStorage.clear() 会导致白屏！',
        severity: 'block'
      },
      { 
        pattern: /require\(['"]playwright['"]\)/, 
        message: '直接 require playwright，应使用平台模块',
        severity: 'warn'
      },
      { 
        pattern: /import.*from\s+['"]playwright['"]/, 
        message: '直接 import playwright，应使用平台模块',
        severity: 'warn'
      },
    ];
    
    // 建议模式（警告但不阻止）
    this.suggestedPatterns = [
      { pattern: /runTask\s*\(/, message: '✓ 使用 runTask 入口' },
      { pattern: /BaseController|BaseHook/, message: '✓ 使用基类模式' },
    ];
  }
  
  /**
   * 处理事件（在工具调用前）
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
    const content = context.input?.content || '';
    
    // 只检查 JS/TS 文件
    if (!filePath.endsWith('.js') && !filePath.endsWith('.ts')) {
      return this.response(true);
    }
    
    // 执行检查
    const result = this.checkContent(content, filePath);
    
    // 记录检查结果
    this.logEvent({
      type: 'check',
      file: filePath,
      violations: result.violations,
      warnings: result.warnings,
    });
    
    // 有严重违规，阻止写入
    if (result.blocked) {
      return {
        blocked: true,
        message: this.formatBlockMessage(filePath, result.violations),
      };
    }
    
    // 有警告，允许写入但给出反馈
    if (result.warnings.length > 0) {
      return this.response(true, {
        feedback: this.feedback('warning', this.formatWarningMessage(filePath, result.warnings)),
      });
    }
    
    // 检查通过
    if (result.suggestions.length > 0) {
      return this.response(true, {
        feedback: this.feedback('info', `✓ 代码规范检查通过\n\n${result.suggestions.join('\n')}`),
      });
    }
    
    return this.response(true);
  }
  
  /**
   * 检查内容
   */
  checkContent(content, filePath) {
    const violations = [];  // 严重违规
    const warnings = [];    // 警告
    const suggestions = []; // 建议
    
    // 检查禁止模式
    for (const { pattern, message, severity } of this.forbiddenPatterns) {
      if (pattern.test(content)) {
        if (severity === 'block') {
          violations.push(message);
        } else {
          warnings.push(message);
        }
      }
    }
    
    // 检查建议模式
    for (const { pattern, message } of this.suggestedPatterns) {
      if (pattern.test(content)) {
        suggestions.push(message);
      }
    }
    
    return {
      violations,
      warnings,
      suggestions,
      blocked: violations.length > 0,
    };
  }
  
  /**
   * 格式化阻止消息
   */
  formatBlockMessage(filePath, violations) {
    return `🚫 代码写入被阻止

文件: ${filePath}

严重违规:
${violations.map(v => `  ❌ ${v}`).join('\n')}

请修复以上问题后重新提交。`;
  }
  
  /**
   * 格式化警告消息
   */
  formatWarningMessage(filePath, warnings) {
    return `⚠️ 代码规范警告

文件: ${filePath}

警告:
${warnings.map(w => `  ⚠ ${w}`).join('\n')}

建议修复，但不阻止写入。`;
  }
}


// 导出 - OpenClaw 兼容格式
const { createHookExport } = require('../lib');
const hookInstance = new CodeGuardHook();
module.exports = createHookExport(hookInstance);
module.exports.CodeGuardHook = CodeGuardHook;
