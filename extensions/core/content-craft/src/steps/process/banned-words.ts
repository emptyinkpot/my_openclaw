/**
 * 禁用词处理步骤（使用LLM智能评估）
 * 
 * 职责：
 * 1. 检测禁用词
 * 2. 使用LLM智能评估并替换为合适的表达
 * 
 * @module modules/polish/steps/process/banned-words
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
  console.warn('[BannedWordsStep] coze-coding-dev-sdk not available');
}

/**
 * 禁用词处理步骤
 */
export class BannedWordsStep extends BaseStep {
  readonly id = 'bannedWords';
  readonly name = '禁用词处理';
  readonly phase = 'process' as const;
  readonly description = '检测并使用LLM智能替换禁用词、敏感词';
  readonly fixed = false;
  readonly dependencies = ['polish'];
  
  async execute(context: StepContext): Promise<StepResult> {
    const { text, settings, resources, reportProgress } = context;
    const startTime = Date.now();
    
    try {
      reportProgress?.('正在使用LLM检查禁用词...');
      
      // 检查是否启用禁用词处理
      const stepSettings = settings.steps[this.id] || {};
      if (!stepSettings.enabled) {
        return this.createSkipResult(text, '禁用词处理已禁用');
      }
      
      // 获取禁用词列表（从MySQL加载的所有禁用词）
      const bannedWords = resources?.bannedWords || [];
      
      if (bannedWords.length === 0) {
        return this.createSuccessResult(
          text,
          false,
          [],
          '未加载禁用词库'
        );
      }
      
      // 使用LLM进行智能评估和替换
      let resultText = text;
      const replacements: ReplacementRecord[] = [];
      
      if (LLMClient && Config) {
        const config = new Config();
        const client = new LLMClient(config);
        
        const systemPrompt = `你是一个专业的中文文本润色专家，专门处理禁用词替换任务。

任务要求：
1. 给定一段文本和禁用词列表，将文本中的禁用词替换为合适的词
2. 替换后的文本必须：
   - 语义通顺、流畅、无歧义
   - 不损失原文语义和信息
   - 符合文学性表达（适合小说创作）
   - 严格禁止欧化表达，禁止不符合中文习惯的外文语序
   - 严格禁止使用破折号（——、—、–、-）
   - 严格禁止使用冒号（：、:）
   - 确保所有句子都是纯正的中文语序和表达方式
   - 如果有括号，去除括号时必须同时调整语句使之通顺，不能单纯去除括号
   - 确保整体文章逻辑通顺
   - 确保同一篇文章的修辞比喻系统成体系
   - 确保文章脉络一致且清晰
   - 确保不前言不搭后语
   - 确保禁用词替换后不再是禁用词
3. 禁用词列表（共${bannedWords.length}个）：
${bannedWords.map((w: any) => `- ${w.word}`).join('\n')}

请直接返回替换后的完整文本，不要添加任何解释或说明。`;

        const messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ];
        
        const response = await client.invoke(messages, { 
          temperature: 0.3,
          model: "doubao-seed-1-8-251228"
        });
        
        resultText = response.content;
        
        // 生成替换记录
        bannedWords.forEach((w: any) => {
          if (text.includes(w.word) && !resultText.includes(w.word)) {
            replacements.push({
              original: w.word,
              replaced: w.replacement || '(智能替换)',
              reason: w.reason || '禁用词替换',
              source: 'MySQL禁用词库+LLM智能评估'
            });
          }
        });
      } else {
        // 如果LLM不可用，返回原文本
        return this.createSuccessResult(
          text,
          false,
          [],
          'LLM SDK不可用，跳过禁用词处理'
        );
      }
      
      const duration = Date.now() - startTime;
      
      if (replacements.length === 0) {
        return this.createSuccessResult(
          text,
          false,
          [],
          '未发现禁用词'
        );
      }
      
      return {
        text: resultText,
        modified: true,
        replacements,
        report: {
          step: this.name,
          report: `使用LLM处理 ${replacements.length} 处禁用词`,
          duration,
          success: true,
        },
      };
      
    } catch (error) {
      console.error('[BannedWordsStep] Error:', error);
      return this.createErrorResult(text, error as Error);
    }
  }
  
  buildPrompt(settings: StepSettings): string {
    return '';
  }
}
