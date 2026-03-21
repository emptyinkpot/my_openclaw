/**
 * 语义检查步骤
 * 
 * @module modules/polish/steps/review/semantic
 */

import { BaseStep } from '../base';
import type { StepContext, StepResult, StepSettings } from '../../types';

export class SemanticCheckStep extends BaseStep {
  readonly id = 'semanticCheck';
  readonly name = '语义检查';
  readonly phase = 'review' as const;
  readonly description = '检查语义是否保持一致';
  readonly fixed = true;
  readonly dependencies = ['markdownClean'];
  
  async execute(context: StepContext): Promise<StepResult> {
    const { text, reportProgress } = context;
    
    reportProgress?.('正在进行语义检查...');
    
    // 简单的语义检查占位
    const issues: string[] = [];
    
    // 检查明显的语义问题
    if (text.includes('的地的')) {
      issues.push('发现"的地的"连用');
    }
    
    if (issues.length > 0) {
      return this.createSuccessResult(
        text, 
        false, 
        [], 
        `语义检查发现问题: ${issues.join('; ')}`
      );
    }
    
    return this.createSuccessResult(text, false, [], '语义检查通过');
  }
  
  buildPrompt(settings: StepSettings): string {
    return '';
  }
}
