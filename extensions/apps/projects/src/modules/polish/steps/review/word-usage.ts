/**
 * 用词检查步骤
 * 
 * @module modules/polish/steps/review/word-usage
 */

import { BaseStep } from '../base';
import type { StepContext, StepResult, StepSettings } from '../../types';

export class WordUsageCheckStep extends BaseStep {
  readonly id = 'wordUsageCheck';
  readonly name = '用词检查';
  readonly phase = 'review' as const;
  readonly description = '检查用词是否准确、恰当';
  readonly fixed = false;
  readonly dependencies = ['semanticCheck'];
  
  async execute(context: StepContext): Promise<StepResult> {
    const { text, settings } = context;
    const stepSettings = settings.steps[this.id] || {};
    
    if (!stepSettings.enabled) {
      return this.createSkipResult(text, '用词检查已禁用');
    }
    
    return this.createSuccessResult(text, false, [], '用词检查完成');
  }
  
  buildPrompt(settings: StepSettings): string {
    return '';
  }
}
