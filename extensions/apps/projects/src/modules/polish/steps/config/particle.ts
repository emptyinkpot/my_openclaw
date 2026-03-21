/**
 * 助词应用步骤
 * 
 * @module modules/polish/steps/config/particle
 */

import { BaseStep } from '../base';
import type { StepContext, StepResult, StepSettings } from '../../types';

export class ParticleApplyStep extends BaseStep {
  readonly id = 'particleApply';
  readonly name = '助词优化';
  readonly phase = 'config' as const;
  readonly description = '优化助词使用';
  readonly fixed = false;
  readonly dependencies = ['detect'];
  
  async execute(context: StepContext): Promise<StepResult> {
    const { text, settings } = context;
    const stepSettings = settings.steps[this.id] || {};
    
    if (!stepSettings.enabled) {
      return this.createSkipResult(text, '助词优化已禁用');
    }
    
    return this.createSuccessResult(text, false, [], '助词优化检查完成');
  }
  
  buildPrompt(settings: StepSettings): string {
    return '';
  }
}
