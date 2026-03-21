/**
 * 最终审校步骤
 * 
 * @module modules/polish/steps/review/final
 */

import { BaseStep } from '../base';
import type { StepContext, StepResult, StepSettings } from '../../types';

export class FinalReviewStep extends BaseStep {
  readonly id = 'finalReview';
  readonly name = '最终审校';
  readonly phase = 'review' as const;
  readonly description = '最终审校，确保质量';
  readonly fixed = true;
  readonly dependencies = ['semanticCheck'];
  
  async execute(context: StepContext): Promise<StepResult> {
    const { text, reportProgress } = context;
    
    reportProgress?.('正在进行最终审校...');
    
    // 最终审校逻辑
    let result = text;
    
    // 清理多余的空格
    result = result.replace(/  +/g, ' ');
    
    // 确保中文之间没有多余空格
    result = result.replace(/(\S) +(\S)/g, '$1$2');
    
    return this.createSuccessResult(
      result,
      result !== text,
      [],
      '最终审校完成'
    );
  }
  
  buildPrompt(settings: StepSettings): string {
    return '';
  }
}
