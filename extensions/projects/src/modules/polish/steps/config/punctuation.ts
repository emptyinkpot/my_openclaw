/**
 * 标点规范化步骤
 * 
 * @module modules/polish/steps/config/punctuation
 */

import { BaseStep } from '../base';
import type { StepContext, StepResult, StepSettings } from '../../types';

export class PunctuationApplyStep extends BaseStep {
  readonly id = 'punctuationApply';
  readonly name = '标点规范';
  readonly phase = 'config' as const;
  readonly description = '规范化标点符号使用';
  readonly fixed = false;
  readonly dependencies = ['detect'];
  
  async execute(context: StepContext): Promise<StepResult> {
    const { text, settings } = context;
    const stepSettings = settings.steps[this.id] || {};
    
    if (!stepSettings.enabled) {
      return this.createSkipResult(text, '标点规范已禁用');
    }
    
    // 简单的标点规范化
    let result = text;
    const replacements: Array<{ original: string; replaced: string; reason: string }> = [];
    
    // 英文标点转中文
    const punctuationMap: Record<string, string> = {
      ',': '，',
      '.': '。',
      '?': '？',
      '!': '！',
      ':': '：',
      ';': '；',
      '(': '（',
      ')': '）',
    };
    
    Object.entries(punctuationMap).forEach(([en, cn]) => {
      if (result.includes(en)) {
        result = result.replace(new RegExp(`\\${en}`, 'g'), cn);
        replacements.push({ original: en, replaced: cn, reason: '标点规范化' });
      }
    });
    
    return this.createSuccessResult(
      result, 
      result !== text, 
      replacements, 
      `标点规范化完成（${replacements.length} 处）`
    );
  }
  
  buildPrompt(settings: StepSettings): string {
    return '';
  }
}
