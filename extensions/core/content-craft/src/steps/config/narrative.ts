/**
 * 叙事视角转换步骤
 * 
 * @module modules/polish/steps/config/narrative
 */

import { BaseStep } from '../base';
import type { StepContext, StepResult, StepSettings } from '../../types';

export class NarrativePerspectiveStep extends BaseStep {
  readonly id = 'narrativePerspective';
  readonly name = '叙事视角';
  readonly phase = 'config' as const;
  readonly description = '转换叙事视角（第一人称/第三人称）';
  readonly fixed = false;
  readonly dependencies = ['detect'];
  
  async execute(context: StepContext): Promise<StepResult> {
    const { text, settings, reportProgress } = context;
    const stepSettings = settings.steps[this.id] || {};
    
    if (!stepSettings.enabled) {
      return this.createSkipResult(text, '叙事视角转换已禁用');
    }
    
    // 占位实现，实际需要调用LLM
    return this.createSuccessResult(text, false, [], '叙事视角检查完成');
  }
  
  buildPrompt(settings: StepSettings): string {
    return '';
  }
}
