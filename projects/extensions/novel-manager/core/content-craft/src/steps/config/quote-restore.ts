/**
 * 引用恢复步骤
 * 
 * 职责：
 * 1. 从 context.data.quoteMap 中获取之前保护的引用
 * 2. 将占位符恢复成原始的引号和书名号
 * 
 * @module modules/polish/steps/config/quote-restore
 */

import { BaseStep } from '../base';
import type { StepContext, StepResult, StepSettings } from '../../types';

/**
 * 引用恢复步骤
 */
export class QuoteRestoreStep extends BaseStep {
  readonly id = 'quoteRestore';
  readonly name = '引用恢复';
  readonly phase = 'postprocess' as const; // 放在后处理阶段
  readonly description = '恢复之前保护的引号和书名号内容';
  readonly fixed = false;
  readonly dependencies = ['quoteProtect']; // 依赖 quoteProtect 步骤
  
  async execute(context: StepContext): Promise<StepResult> {
    const { text, settings, reportProgress } = context;
    const startTime = Date.now();
    
    try {
      reportProgress?.('正在执行引用恢复...');
      
      // 从 context.data 中获取 quoteMap
      const quoteMap = context.data.quoteMap as Map<string, string> | undefined;
      
      if (!quoteMap || quoteMap.size === 0) {
        return this.createSkipResult(text, '没有需要恢复的引用');
      }
      
      // 执行引用恢复
      const resultText = this.restoreQuotes(text, quoteMap);
      
      const duration = Date.now() - startTime;
      
      return this.createSuccessResult(
        resultText,
        true,
        [],
        `引用恢复完成（${quoteMap.size} 处）`
      );
      
    } catch (error) {
      return this.createErrorResult(text, error as Error);
    }
  }
  
  buildPrompt(settings: StepSettings): string {
    return '';
  }
  
  /**
   * 恢复引用内容
   */
  private restoreQuotes(text: string, map: Map<string, string>): string {
    let result = text;
    map.forEach((original, key) => {
      result = result.replace(new RegExp(key, 'g'), original);
    });
    return result;
  }
}
