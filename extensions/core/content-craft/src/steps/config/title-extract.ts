/**
 * 标题提取步骤
 * 
 * @module modules/polish/steps/config/title-extract
 */

import { BaseStep } from '../base';
import type { StepContext, StepResult, StepSettings } from '../../types';

export class TitleExtractStep extends BaseStep {
  readonly id = 'titleExtract';
  readonly name = '标题提取';
  readonly phase = 'config' as const;
  readonly description = '提取或生成文章标题';
  readonly fixed = false;
  readonly dependencies = ['detect'];
  
  async execute(context: StepContext): Promise<StepResult> {
    const { text, settings } = context;
    const stepSettings = settings.steps[this.id] || {};
    
    if (!stepSettings.enabled) {
      return this.createSkipResult(text, '标题提取已禁用');
    }
    
    // 简单的标题提取逻辑
    const lines = text.split('\n').filter(l => l.trim());
    const firstLine = lines[0] || '';
    
    // 如果第一行较短，可能是标题
    const title = firstLine.length <= 50 ? firstLine : '无标题';
    
    return this.createSuccessResult(text, false, [], `标题: ${title}`);
  }
  
  buildPrompt(settings: StepSettings): string {
    return '';
  }
}
