/**
 * 语义检查步骤（使用LLM智能审稿）
 * 
 * @module modules/polish/steps/review/semantic
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
  console.warn('[SemanticCheckStep] coze-coding-dev-sdk not available');
}

export class SemanticCheckStep extends BaseStep {
  readonly id = 'semanticCheck';
  readonly name = '语义检查';
  readonly phase = 'review' as const;
  readonly description = '使用LLM智能检查语义是否保持一致、是否有语义不当的词汇';
  readonly fixed = true;
  readonly dependencies = ['markdownClean'];
  
  async execute(context: StepContext): Promise<StepResult> {
    const { text, reportProgress } = context;
    const startTime = Date.now();
    
    reportProgress?.('正在使用LLM进行语义检查...');
    
    try {
      let resultText = text;
      const issues: string[] = [];
      
      if (LLMClient && Config) {
        const config = new Config();
        const client = new LLMClient(config);
        
        const systemPrompt = `你是一个专业的中文文本审校专家，专门检查文本的语义问题。

任务要求：
1. 检查给定文本是否有语义不当的词汇
2. 检查是否前言不搭后语
3. 检查文章脉络是否一致且清晰
4. 检查同一篇文章的修辞比喻是否系统成体系
5. 检查是否有禁用词替换后仍然是禁用词的情况
6. 严格禁止欧化表达，禁止不符合中文习惯的外文语序
7. 严格禁止使用破折号（——、—、–、-）
8. 严格禁止使用冒号（：、:）
9. 确保所有句子都是纯正的中文语序和表达方式
10. 如果发现问题，请直接返回修改后的文本；如果没有问题，返回原文本
11. 不要添加任何解释或说明，只返回文本

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
        
        if (resultText !== text) {
          issues.push('发现语义问题并进行了修正');
        }
      }
      
      const duration = Date.now() - startTime;
      
      if (issues.length > 0) {
        return {
          text: resultText,
          modified: resultText !== text,
          report: {
            step: this.name,
            report: `语义检查完成: ${issues.join('; ')}`,
            duration,
            success: true,
          },
        };
      }
      
      return this.createSuccessResult(text, false, [], '语义检查通过');
      
    } catch (error) {
      console.error('[SemanticCheckStep] Error:', error);
      return this.createErrorResult(text, error as Error);
    }
  }
  
  buildPrompt(settings: StepSettings): string {
    return '';
  }
}
