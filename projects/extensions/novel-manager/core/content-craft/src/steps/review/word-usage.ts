/**
 * 用词检查步骤（使用LLM智能检查）
 * 
 * @module modules/polish/steps/review/word-usage
 */

import { BaseStep } from '../base';
import type { StepContext, StepResult, StepSettings } from '../../types';
import { resolveContentCraftModel } from '../../utils/model-default';

// 动态导入LLM SDK
let LLMClient: any;
let Config: any;

try {
  const sdk = require('coze-coding-dev-sdk');
  LLMClient = sdk.LLMClient;
  Config = sdk.Config;
} catch (e) {
  console.warn('[WordUsageCheckStep] coze-coding-dev-sdk not available');
}

export class WordUsageCheckStep extends BaseStep {
  readonly id = 'wordUsageCheck';
  readonly name = '用词检查';
  readonly phase = 'review' as const;
  readonly description = '使用LLM智能检查用词是否准确、恰当，是否有词汇语义不当';
  readonly fixed = false;
  readonly dependencies = ['semanticCheck'];
  
  async execute(context: StepContext): Promise<StepResult> {
    const { text, settings, reportProgress } = context;
    const stepSettings = settings.steps[this.id] || {};
    const startTime = Date.now();
    
    if (!stepSettings.enabled) {
      return this.createSkipResult(text, '用词检查已禁用');
    }
    
    reportProgress?.('正在使用LLM进行用词检查...');
    
    try {
      let resultText = text;
      
      if (LLMClient && Config) {
        const config = new Config();
        const client = new LLMClient(config);
        
        const systemPrompt = `你是一个专业的中文用词检查专家，专门检查文本的用词是否准确恰当。

任务要求：
1. 检查是否有词汇语义不当
2. 检查用词是否准确、恰当
3. 检查是否有禁用词替换后仍然不合适的情况
4. 如果发现问题，请进行修正；如果没有问题，返回原文本
5. 不要添加任何解释或说明，只返回文本

请直接返回处理后的完整文本，不要添加任何解释或说明。`;

        const messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ];
        
        const response = await client.invoke(messages, { 
          temperature: 0.3,
          model: resolveContentCraftModel(),
        });
        
        resultText = response.content;
      }
      
      const duration = Date.now() - startTime;
      
      return {
        text: resultText,
        modified: resultText !== text,
        report: {
          step: this.name,
          report: '用词智能检查完成',
          duration,
          success: true,
        },
      };
      
    } catch (error) {
      console.error('[WordUsageCheckStep] Error:', error);
      return this.createErrorResult(text, error as Error);
    }
  }
  
  buildPrompt(settings: StepSettings): string {
    return '';
  }
}
