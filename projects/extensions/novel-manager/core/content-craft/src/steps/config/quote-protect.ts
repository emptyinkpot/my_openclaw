/**
 * 引用保护步骤
 * 
 * 职责：
 * 1. 保护引号内的内容不被修改
 * 2. 保护书名号内的内容
 * 3. 保护特殊标记的内容
 * 4. 将保护的 map 存储在 context.data.quoteMap 中，供后续步骤使用
 * 
 * @module modules/polish/steps/config/quote-protect
 */

import { BaseStep } from '../base';
import type { StepContext, StepResult, StepSettings } from '../../types';

/**
 * 引用保护步骤
 * 
 * 注意：此步骤现在是真正的步骤，会执行引用保护，
 * 并将保护的 map 存储在 context.data.quoteMap 中
 */
export class QuoteProtectStep extends BaseStep {
  readonly id = 'quoteProtect';
  readonly name = '引用保护';
  readonly phase = 'config' as const;
  readonly description = '保护引号和书名号内的内容不被修改';
  readonly fixed = false; // 不再是固定步骤，可以调整顺序
  readonly dependencies = ['detect'];
  
  async execute(context: StepContext): Promise<StepResult> {
    const { text, settings, reportProgress } = context;
    const startTime = Date.now();
    
    try {
      reportProgress?.('正在执行引用保护...');
      
      // 执行引用保护
      const result = this.protectQuotes(text);
      
      // 将 quoteMap 存储在 context.data 中，供后续步骤使用
      context.data.quoteMap = result.quoteMap;
      
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
   * 保护引用内容
   */
  private protectQuotes(text: string): { text: string; quoteMap: Map<string, string>; count: number } {
    const quoteMap = new Map<string, string>();
    let resultText = text;
    let counter = 0;
    
    // 保护双引号内容
    resultText = resultText.replace(/"([^"]+)"/g, (match) => {
      const key = `__QUOTE_${++counter}__`;
      quoteMap.set(key, match);
      return key;
    });
    
    // 保护单引号内容
    resultText = resultText.replace(/'([^']+)'/g, (match) => {
      const key = `__QUOTE_${++counter}__`;
      quoteMap.set(key, match);
      return key;
    });
    
    // 保护书名号内容
    resultText = resultText.replace(/《([^》]+)》/g, (match) => {
      const key = `__BOOK_${++counter}__`;
      quoteMap.set(key, match);
      return key;
    });
    
    return { text: resultText, quoteMap, count: counter };
  }
}