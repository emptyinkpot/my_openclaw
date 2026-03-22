/**
 * 最终审校步骤（使用LLM智能审校）
 * 
 * @module modules/polish/steps/review/final
 */

import { BaseStep } from '../base';
import type { StepContext, StepResult, StepSettings } from '../../types';

// 动态导入LLM SDK
let LLMClient: any;
let Config: any;

try {
  const sdk = require('coze-coding-dev-sdk');
  LLMClient = sdk.LLMClient;
  Config = sdk.Config;
} catch (e) {
  console.warn('[FinalReviewStep] coze-coding-dev-sdk not available');
}

export class FinalReviewStep extends BaseStep {
  readonly id = 'finalReview';
  readonly name = '最终审校';
  readonly phase = 'review' as const;
  readonly description = '使用LLM进行最终智能审校，确保整体文章逻辑、修辞比喻系统成体系、文章脉络一致清晰';
  readonly fixed = true;
  readonly dependencies = ['semanticCheck'];
  
  async execute(context: StepContext): Promise<StepResult> {
    const { text, reportProgress } = context;
    const startTime = Date.now();
    
    reportProgress?.('正在使用LLM进行最终审校...');
    
    try {
      let resultText = text;
      
      if (LLMClient && Config) {
        const config = new Config();
        const client = new LLMClient(config);
        
        const systemPrompt = `你是一个专业的中文文学审校专家，专门负责文本的最终审校。

任务要求：
1. 检查整体文章逻辑是否通顺
2. 确保同一篇文章的修辞比喻系统成体系
3. 确保文章脉络一致且清晰
4. 确保没有前言不搭后语的情况
5. 检查禁用词替换后是否还是禁用词
6. 检查语义是否通顺、流畅、无歧义
7. 检查是否损失原义
8. 禁止欧化表达，禁止不符合中文习惯的外文语序
9. 如果发现问题，请进行修正；如果没有问题，返回原文本
10. 不要添加任何解释或说明，只返回文本

请直接返回处理后的完整文本，不要添加任何解释或说明。`;

        const messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ];
        
        const response = await client.invoke(messages, { 
          temperature: 0.3,
          model: "doubao-seed-1-8-251228"
        });
        
        resultText = response.content;
      }
      
      const duration = Date.now() - startTime;
      
      return {
        text: resultText,
        modified: resultText !== text,
        report: {
          step: this.name,
          report: '最终智能审校完成',
          duration,
          success: true,
        },
      };
      
    } catch (error) {
      console.error('[FinalReviewStep] Error:', error);
      return this.createErrorResult(text, error as Error);
    }
  }
  
  buildPrompt(settings: StepSettings): string {
    return '';
  }
}
