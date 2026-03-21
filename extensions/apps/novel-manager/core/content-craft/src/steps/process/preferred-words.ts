/**
 * 优选词替换步骤（使用LLM智能评估）
 * 
 * @module polish/steps/process/preferred-words
 */

import { BaseStep } from '../base';
import type { StepContext, StepResult, StepSettings, ReplacementRecord } from '../../types';

// 动态导入LLM SDK
let LLMClient: any;
let Config: any;

try {
  const sdk = require('coze-coding-dev-sdk');
  LLMClient = sdk.LLMClient;
  Config = sdk.Config;
} catch (e) {
  console.warn('[PreferredWordsStep] coze-coding-dev-sdk not available');
}

/**
 * 优选词替换步骤
 * 
 * 从 MySQL vocabulary 表中读取优选词，使用LLM智能评估和替换
 */
export class PreferredWordsStep extends BaseStep {
  readonly id = 'preferredWords';
  readonly name = '优选词替换';
  readonly phase = 'process' as const;
  readonly description = '使用LLM智能评估并应用优选词库替换普通词汇';
  readonly fixed = false;
  readonly dependencies = ['bannedWords'];
  
  async execute(context: StepContext): Promise<StepResult> {
    const { text, settings, resources, reportProgress } = context;
    const startTime = Date.now();
    
    try {
      reportProgress?.('正在使用LLM应用优选词...');
      
      const stepSettings = settings.steps[this.id] || {};
      if (!stepSettings.enabled) {
        return this.createSkipResult(text, '优选词替换已禁用');
      }
      
      // 获取词汇表（从MySQL加载的所有908个优选词）
      const vocabulary = resources?.vocabulary || [];
      
      if (vocabulary.length === 0) {
        return this.createSuccessResult(text, false, [], '优选词库为空');
      }
      
      // 使用LLM进行智能评估和替换
      let resultText = text;
      const replacements: ReplacementRecord[] = [];
      
      if (LLMClient && Config) {
        const config = new Config();
        const client = new LLMClient(config);
        
        const systemPrompt = `你是一个专业的文本润色专家，专门处理优选词替换任务。

任务要求：
1. 给定一段文本和优选词库，将文本中的普通词汇智能替换为更合适的优选词
2. 替换后的文本必须：
   - 语义通顺、流畅、无歧义
   - 不损失原文语义和信息
   - 符合文学性表达（适合小说创作）
   - 不要过度替换，保持自然
3. 优选词库（共${vocabulary.length}个，部分示例）：
${vocabulary.slice(0, 50).map((w: any) => `- ${w.word}`).join('\n')}

请直接返回替换后的完整文本，不要添加任何解释或说明。`;

        const messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ];
        
        const response = await client.invoke(messages, { 
          temperature: 0.5,
          model: "doubao-seed-1-8-251228"
        });
        
        resultText = response.content;
        
        // 简单记录替换（因为是LLM智能替换，难以精确记录每一处）
        if (resultText !== text) {
          replacements.push({
            original: '(原文本)',
            replaced: '(智能润色)',
            reason: '优选词智能替换',
            source: 'MySQL优选词库+LLM智能评估'
          });
        }
      } else {
        // 如果LLM不可用，返回原文本
        return this.createSuccessResult(
          text,
          false,
          [],
          'LLM SDK不可用，跳过优选词替换'
        );
      }
      
      const duration = Date.now() - startTime;
      
      if (replacements.length === 0) {
        return this.createSuccessResult(text, false, [], '未找到需要替换的词汇');
      }
      
      return {
        text: resultText,
        modified: true,
        replacements,
        report: {
          step: this.name,
          report: `使用LLM智能优选词替换（共${vocabulary.length}个优选词）`,
          duration,
          success: true,
        },
      };
      
    } catch (error) {
      console.error('[PreferredWordsStep] Error:', error);
      return this.createErrorResult(text, error as Error);
    }
  }
  
  buildPrompt(settings: StepSettings): string {
    return '';
  }
}
