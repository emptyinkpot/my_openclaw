/**
 * 引用保护步骤（简化版，无外部依赖）
 * 
 * 职责：
 * 1. 保护引号内的内容不被修改
 * 2. 保护书名号内的内容
 * 3. 保护特殊标记的内容
 * 
 * @module modules/polish/steps/config/quote-protect
 */

import { BaseStep } from '../base';
import type { StepContext, StepResult, StepSettings } from '../../types';

/**
 * 引用保护步骤
 * 
 * 注意：此步骤是一个"伪步骤"，实际的引用保护
 * 是在流水线开始时完成的，这里只是为了提供配置入口
 */
export class QuoteProtectStep extends BaseStep {
  readonly id = 'quoteProtect';
  readonly name = '引用保护';
  readonly phase = 'config' as const;
  readonly description = '保护引号和书名号内的内容不被修改';
  readonly fixed = true;
  readonly dependencies = ['detect'];
  
  async execute(context: StepContext): Promise<StepResult> {
    const { text, settings, reportProgress } = context;
    const startTime = Date.now();
    
    try {
      reportProgress?.('正在执行引用保护...');
      
      // 使用内置保护逻辑
      const result = this.builtinProtect(text);
      
      const duration = Date.now() - startTime;
      
      return this.createSuccessResult(
        result.text,
        true,
        [],
        `引用保护完成（${result.count} 处）`
      );
      
    } catch (error) {
      return this.createErrorResult(text, error as Error);
    }
  }
  
  buildPrompt(settings: StepSettings): string {
    return '';
  }
  
  /**
   * 内置保护逻辑
   */
  private builtinProtect(text: string): { text: string; count: number } {
    let count = 0;
    let result = text;
    
    // 保护双引号内容
    result = result.replace(/"([^"]+)"/g, (match) => {
      count++;
      return `__QUOTE_${count}__`;
    });
    
    // 保护单引号内容
    result = result.replace(/'([^']+)'/g, (match) => {
      count++;
      return `__QUOTE_${count}__`;
    });
    
    // 保护书名号内容
    result = result.replace(/《([^》]+)》/g, (match) => {
      count++;
      return `__BOOK_${count}__`;
    });
    
    return { text: result, count };
  }
}