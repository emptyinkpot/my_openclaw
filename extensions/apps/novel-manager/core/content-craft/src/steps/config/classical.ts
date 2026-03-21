/**
 * 古典润色步骤
 * 
 * @module modules/polish/steps/config/classical
 */

import { BaseStep } from '../base';
import type { StepContext, StepResult, StepSettings } from '../../types';

export class ClassicalApplyStep extends BaseStep {
  readonly id = 'classicalApply';
  readonly name = '古典润色';
  readonly phase = 'config' as const;
  readonly description = '应用古典文学风格润色';
  readonly fixed = false;
  readonly dependencies = ['detect'];
  
  async execute(context: StepContext): Promise<StepResult> {
    const { text, settings } = context;
    const stepSettings = settings.steps[this.id] || {};
    
    if (!stepSettings.enabled) {
      return this.createSkipResult(text, '古典润色已禁用');
    }
    
    return this.createSuccessResult(text, false, [], '古典润色检查完成');
  }
  
  buildPrompt(settings: StepSettings): string {
    return '';
  }
}
