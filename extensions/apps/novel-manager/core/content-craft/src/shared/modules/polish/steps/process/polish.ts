/**
 * 智能润色步骤
 * 
 * 职责：
 * 1. 调用LLM进行智能润色
 * 2. 提升文本表达质量
 * 3. 保持原意不变
 * 
 * @module modules/polish/steps/process/polish
 */

import { BaseStep } from '../base';
import type { StepContext, StepResult, StepSettings } from '../../types';
import { ServiceTokens, container } from '@/core/di';
import type { ILLMClient, LLMMessage } from '@/core/di/types';

/**
 * 智能润色步骤
 */
export class PolishStep extends BaseStep {
  readonly id = 'polish';
  readonly name = '智能润色';
  readonly phase = 'process' as const;
  readonly description = '调用LLM进行智能润色，提升文本表达质量';
  readonly fixed = false;
  readonly dependencies = ['quoteProtect'];
  readonly timeout = 120000; // 润色可能需要更长时间
  
  async execute(context: StepContext): Promise<StepResult> {
    const { text, settings, reportProgress, streamChunk } = context;
    const startTime = Date.now();
    
    try {
      reportProgress?.('正在进行智能润色...');
      
      // 获取步骤设置
      const stepSettings = (settings.steps[this.id] || {}) as Record<string, unknown>;
      const style = (stepSettings.style as string) || settings.global?.style || 'narrative';
      const temperature = settings.global?.temperature || 0.7;
      
      // 获取LLM客户端
      const llmClient = container.resolve<ILLMClient>(ServiceTokens.LLM_CLIENT);
      
      // 构建Prompt
      const systemPrompt = this.buildSystemPrompt(style);
      const userPrompt = this.buildUserPrompt(text, stepSettings);
      
      const messages: LLMMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];
      
      // 调用LLM
      let polishedText: string;
      
      if (streamChunk) {
        // 流式输出
        polishedText = await llmClient.generateStream(
          messages,
          { temperature, maxTokens: 4000 },
          (chunk) => streamChunk(chunk)
        );
      } else {
        // 同步调用
        polishedText = await llmClient.generate(messages, {
          temperature,
          maxTokens: 4000,
        });
      }
      
      // 清理可能的Markdown格式
      polishedText = this.cleanMarkdown(polishedText);
      
      const duration = Date.now() - startTime;
      
      return {
        text: polishedText,
        modified: true,
        report: {
          step: this.name,
          report: '润色完成',
          duration,
          success: true,
        },
      };
      
    } catch (error) {
      return this.createErrorResult(text, error as Error);
    }
  }
  
  buildPrompt(settings: StepSettings): string {
    const style = (settings as Record<string, unknown>).style as string || 'narrative';
    return this.buildSystemPrompt(style);
  }
  
  /**
   * 构建系统Prompt
   */
  private buildSystemPrompt(style: string): string {
    const styleGuides: Record<string, string> = {
      narrative: `你是一位专业的文学编辑，擅长历史叙事风格的文本润色。
你的任务是提升文本的表达质量，使其更加生动、流畅。
风格要求：
- 保持历史叙事的韵味
- 使用典雅但不晦涩的词汇
- 注重节奏感和画面感
- 适当使用修辞手法`,
      
      formal: `你是一位专业的文字编辑，擅长正式文体润色。
你的任务是提升文本的专业性和严谨性。
风格要求：
- 使用规范、正式的词汇
- 避免口语化表达
- 注重逻辑清晰
- 保持客观中立`,
      
      academic: `你是一位学术编辑，擅长学术论文润色。
你的任务是提升文本的学术规范性。
风格要求：
- 使用学术规范用语
- 注重论述的严谨性
- 保持客观、准确
- 适当使用学术连接词`,
      
      casual: `你是一位轻松风格的编辑，擅长生活化文本润色。
你的任务是让文本更加亲切、易读。
风格要求：
- 使用自然、口语化的表达
- 避免过于书面化的词汇
- 保持轻松愉快的语气
- 增强可读性和亲和力`,
    };
    
    return styleGuides[style] || styleGuides.narrative;
  }
  
  /**
   * 构建用户Prompt
   */
  private buildUserPrompt(text: string, settings: Record<string, unknown>): string {
    const instructions: string[] = [];
    
    if (settings.enhanceDescription) {
      instructions.push('- 加强场景描写');
    }
    if (settings.enhanceDialogue) {
      instructions.push('- 优化对话表达');
    }
    if (settings.enhanceEmotion) {
      instructions.push('- 增强情感表达');
    }
    
    const instructionText = instructions.length > 0 
      ? `\n\n【额外要求】\n${instructions.join('\n')}` 
      : '';
    
    return `请润色以下文本：

【原文】
${text}

【润色要求】
1. 保持原意不变
2. 提升表达质量
3. 使语句更加流畅自然
4. 修正明显的语法错误
5. 直接输出润色后的文本，不要添加解释${instructionText}

【润色后的文本】`;
  }
  
  /**
   * 清理Markdown格式
   */
  private cleanMarkdown(text: string): string {
    return text
      // 移除代码块标记
      .replace(/```[\s\S]*?```/g, '')
      // 移除行内代码
      .replace(/`([^`]+)`/g, '$1')
      // 移除标题标记
      .replace(/^#+\s*/gm, '')
      // 移除粗体/斜体标记
      .replace(/[*_]+([^*_]+)[*_]+/g, '$1')
      // 清理多余空行
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
