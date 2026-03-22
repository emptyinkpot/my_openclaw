/**
 * Markdown清理步骤
 * 
 * 职责：
 * 1. 清理多余的Markdown格式
 * 2. 规范化文本格式
 * 
 * @module modules/polish/steps/postprocess/markdown-clean
 */

import { BaseStep } from '../base';
import type { StepContext, StepResult, StepSettings } from '../../types';

/**
 * Markdown清理步骤
 */
export class MarkdownCleanStep extends BaseStep {
  readonly id = 'markdownClean';
  readonly name = '格式清理';
  readonly phase = 'postprocess' as const;
  readonly description = '清理Markdown格式标记，规范化文本格式';
  readonly fixed = true;
  readonly dependencies = ['polish'];
  
  async execute(context: StepContext): Promise<StepResult> {
    const { text, reportProgress } = context;
    const startTime = Date.now();
    
    try {
      reportProgress?.('正在清理格式...');
      
      let cleanedText = text;
      
      // 1. 清理代码块
      cleanedText = this.cleanCodeBlocks(cleanedText);
      
      // 2. 清理标题
      cleanedText = this.cleanHeaders(cleanedText);
      
      // 3. 清理强调标记
      cleanedText = this.cleanEmphasis(cleanedText);
      
      // 4. 清理链接
      cleanedText = this.cleanLinks(cleanedText);
      
      // 5. 清理列表标记
      cleanedText = this.cleanLists(cleanedText);
      
      // 6. 规范化空行
      cleanedText = this.normalizeSpacing(cleanedText);
      
      const duration = Date.now() - startTime;
      const modified = cleanedText !== text;
      
      return {
        text: cleanedText,
        modified,
        report: {
          step: this.name,
          report: modified ? '格式清理完成' : '无需清理',
          duration,
          success: true,
        },
      };
      
    } catch (error) {
      return this.createErrorResult(text, error as Error);
    }
  }
  
  buildPrompt(settings: StepSettings): string {
    return '';
  }
  
  /**
   * 清理代码块
   */
  private cleanCodeBlocks(text: string): string {
    // 移除多行代码块
    return text.replace(/```[\s\S]*?```/g, (match) => {
      // 提取代码内容
      const content = match.replace(/```\w*\n?/g, '').trim();
      return content;
    });
  }
  
  /**
   * 清理标题
   */
  private cleanHeaders(text: string): string {
    return text
      .replace(/^#{1,6}\s+/gm, '') // 移除标题标记
      .replace(/^={3,}$/gm, '')     // 移除下划线标题
      .replace(/^-{3,}$/gm, '');    // 移除分隔线
  }
  
  /**
   * 清理强调标记
   */
  private cleanEmphasis(text: string): string {
    return text
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // 粗体
      .replace(/__([^_]+)__/g, '$1')      // 粗体
      .replace(/\*([^*]+)\*/g, '$1')      // 斜体
      .replace(/_([^_]+)_/g, '$1')        // 斜体
      .replace(/~~([^~]+)~~/g, '$1');     // 删除线
  }
  
  /**
   * 清理链接
   */
  private cleanLinks(text: string): string {
    // 保留链接文本，移除URL
    return text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // 行内链接
      .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1'); // 引用链接
  }
  
  /**
   * 清理列表标记
   */
  private cleanLists(text: string): string {
    return text
      .replace(/^[\*\-\+]\s+/gm, '')     // 无序列表
      .replace(/^\d+\.\s+/gm, '');       // 有序列表
  }
  
  /**
   * 规范化空行
   */
  private normalizeSpacing(text: string): string {
    return text
      .replace(/\r\n/g, '\n')           // 统一换行
      .replace(/\n{3,}/g, '\n\n')       // 最多两个换行
      .replace(/[ \t]+\n/g, '\n')       // 移除行尾空白
      .replace(/\n[ \t]+/g, '\n')       // 移除行首空白
      .trim();
  }
}
