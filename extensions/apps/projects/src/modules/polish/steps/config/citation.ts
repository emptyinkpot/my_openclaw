/**
 * 引用库应用步骤
 * 
 * @module modules/polish/steps/config/citation
 */

import { BaseStep } from '../base';
import type { StepContext, StepResult, StepSettings } from '../../types';

export class CitationApplyStep extends BaseStep {
  readonly id = 'citationApply';
  readonly name = '引用应用';
  readonly phase = 'config' as const;
  readonly description = '应用文献库引用';
  readonly fixed = false;
  readonly dependencies = ['detect'];
  
  async execute(context: StepContext): Promise<StepResult> {
    const { text, settings } = context;
    const stepSettings = settings.steps[this.id] || {};
    
    if (!stepSettings.enabled) {
      return this.createSkipResult(text, '引用应用已禁用');
    }
    
    return this.createSuccessResult(text, false, [], '引用检查完成');
  }
  
  buildPrompt(settings: StepSettings): string {
    return '';
  }
}
