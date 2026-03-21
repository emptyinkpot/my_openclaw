/**
 * 智能润色步骤
 * 
 * 职责：
 * 1. 调用LLM进行智能润色
 * 2. 提升文本表达质量
 * 3. 保持原意不变
 * 
 * @module polish/steps/process/polish
 */

import { BaseStep } from '../base';
import type { StepContext, StepResult, StepSettings } from '../../types';

/**
 * 智能润色步骤（占位实现）
 */
export class PolishStep extends BaseStep {
  readonly id = 'polish';
  readonly name = '智能润色';
  readonly phase = 'process' as const;
  readonly description = '调用LLM进行智能润色，提升文本表达质量';
  readonly fixed = false;
  readonly dependencies = ['quoteProtect'];
  readonly timeout = 120000;
  
  async execute(context: StepContext): Promise<StepResult> {
    const { text, reportProgress } = context;
    const startTime = Date.now();
    
    try {
      reportProgress?.('正在进行智能润色...');
      
      // 占位实现：直接返回原文本
      await this.delay(500);
      
      const duration = Date.now() - startTime;
      
      return {
        text,
        modified: false,
        report: {
          step: this.name,
          report: '智能润色待实现',
          duration,
          success: true,
        },
      };
      
    } catch (error) {
      return this.createErrorResult(text, error as Error);
    }
  }
  
  buildPrompt(settings: StepSettings): string {
    return '';
  }
}
