/**
 * AI检测步骤
 * 
 * 职责：
 * 1. 检测文本是否由AI生成
 * 2. 分析文本特征
 * 3. 返回检测结果
 * 
 * @module modules/polish/steps/config/detect
 */

import { BaseStep } from '../base';
import type { StepContext, StepResult, StepSettings } from '../../types';
import { ServiceTokens, container } from '@/core/di';

/**
 * AI检测步骤
 */
export class DetectStep extends BaseStep {
  readonly id = 'detect';
  readonly name = 'AI检测';
  readonly phase = 'config' as const;
  readonly description = '检测文本是否由AI生成，分析文本特征';
  readonly fixed = true;
  readonly dependencies: string[] = [];
  
  async execute(context: StepContext): Promise<StepResult> {
    const { text, settings, reportProgress } = context;
    const startTime = Date.now();
    
    try {
      reportProgress?.('正在分析文本特征...');
      
      // 检查是否启用AI检测
      const stepSettings = settings.steps[this.id] || {};
      if (!stepSettings.enabled) {
        return this.createSkipResult(text, 'AI检测已禁用');
      }
      
      // 获取AI检测器（如果有）
      const detector = container.tryResolve<IAIDetector>(ServiceTokens.AI_DETECTOR);
      
      if (!detector) {
        // 如果没有注册检测器，使用简单的启发式检测
        const result = this.heuristicDetect(text);
        return this.createSuccessResult(
          text,
          false,
          [],
          `AI检测完成: 可能性 ${result.probability}% (${result.method})`
        );
      }
      
      // 使用专业检测器
      const result = await detector.detect(text);
      
      const duration = Date.now() - startTime;
      
      return {
        text,
        modified: false,
        report: {
          step: this.name,
          report: `AI生成可能性: ${(result.probability * 100).toFixed(1)}%`,
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
   * 启发式检测方法
   */
  private heuristicDetect(text: string): {
    probability: number;
    method: string;
  } {
    // 1. 句子长度均匀度检测
    const sentences = text.split(/[。！？\n]+/).filter(s => s.trim());
    const lengths = sentences.map(s => s.length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, l) => sum + Math.pow(l - avgLength, 2), 0) / lengths.length;
    const uniformityScore = Math.max(0, 100 - variance / 10);
    
    // 2. 词汇重复度检测
    const words = text.split(/\s+/);
    const uniqueWords = new Set(words);
    const repetitionScore = (1 - uniqueWords.size / words.length) * 100;
    
    // 3. 特征词检测
    const aiPatterns = [
      /首先[，,]/g,
      /其次[，,]/g,
      /最后[，,]/g,
      /总而言之/g,
      /综上所述/g,
      /值得注意的是/g,
      /另一方面/g,
    ];
    const patternMatches = aiPatterns.reduce((sum, p) => sum + (text.match(p)?.length || 0), 0);
    const patternScore = Math.min(100, patternMatches * 20);
    
    // 综合评分
    const probability = (uniformityScore * 0.3 + repetitionScore * 0.3 + patternScore * 0.4);
    
    return {
      probability: Math.round(probability),
      method: '启发式分析',
    };
  }
}

/**
 * AI检测器接口（简化版）
 */
interface IAIDetector {
  detect(text: string): Promise<{
    probability: number;
    features?: string[];
  }>;
}
