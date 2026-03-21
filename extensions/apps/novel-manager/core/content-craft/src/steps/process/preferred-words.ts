/**
 * 优选词替换步骤
 * 
 * @module polish/steps/process/preferred-words
 */

import { BaseStep } from '../base';
import type { StepContext, StepResult, StepSettings, ReplacementRecord } from '../../types';

/**
 * 优选词替换步骤
 * 
 * 从 MySQL vocabulary 表中读取优选词，进行替换
 */
export class PreferredWordsStep extends BaseStep {
  readonly id = 'preferredWords';
  readonly name = '优选词替换';
  readonly phase = 'process' as const;
  readonly description = '使用优选词库替换普通词汇';
  readonly fixed = false;
  readonly dependencies = ['bannedWords'];
  
  async execute(context: StepContext): Promise<StepResult> {
    const { text, settings, resources, reportProgress } = context;
    const startTime = Date.now();
    
    try {
      reportProgress?.('正在应用优选词...');
      
      const stepSettings = settings.steps[this.id] || {};
      if (!stepSettings.enabled) {
        return this.createSkipResult(text, '优选词替换已禁用');
      }
      
      // 获取词汇表
      const vocabulary = resources?.vocabulary || [];
      
      if (vocabulary.length === 0) {
        return this.createSuccessResult(text, false, [], '优选词库为空');
      }
      
      // 构建优选词映射（简单的同义词替换逻辑）
      // 这里我们将词汇表作为优选词，替换一些常见的普通表达
      const { result, replacements } = this.applyPreferredWords(text, vocabulary);
      
      const duration = Date.now() - startTime;
      
      if (replacements.length === 0) {
        return this.createSuccessResult(text, false, [], '未找到需要替换的词汇');
      }
      
      return {
        text: result,
        modified: true,
        replacements,
        report: {
          step: this.name,
          report: `替换 ${replacements.length} 处优选词`,
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
   * 应用优选词替换
   */
  private applyPreferredWords(
    text: string,
    vocabulary: Array<{ word: string; category?: string; tags?: string; note?: string }>
  ): { result: string; replacements: ReplacementRecord[] } {
    let result = text;
    const replacements: ReplacementRecord[] = [];
    
    // 常见普通词到优选词的映射（结合 vocabulary 表）
    // 这里我们将词汇表中的词作为优选词，构造反向映射
    const commonToPreferred = new Map<string, string>();
    
    // 简单的启发式：从词汇表中提取一些常见的替换对
    // 同时也使用一些固定的常见替换
    const fixedReplacements: Array<{ common: string; preferred: string }> = [
      { common: '很多', preferred: '诸多' },
      { common: '非常', preferred: '极其' },
      { common: '特别', preferred: '格外' },
      { common: '好像', preferred: '仿佛' },
      { common: '但是', preferred: '然而' },
      { common: '所以', preferred: '故而' },
      { common: '因为', preferred: '由于' },
      { common: '如果', preferred: '倘若' },
      { common: '就', preferred: '便' },
      { common: '才', preferred: '方' },
      { common: '都', preferred: '皆' },
      { common: '也', preferred: '亦' },
      { common: '不', preferred: '弗' },
      { common: '没有', preferred: '无' },
      { common: '的', preferred: '之' },
      { common: '在', preferred: '于' },
      { common: '是', preferred: '乃' },
      { common: '有', preferred: '存有' },
      { common: '人', preferred: '人士' },
      { common: '地方', preferred: '所在' },
      { common: '时候', preferred: '之际' },
      { common: '事情', preferred: '事宜' },
      { common: '东西', preferred: '物事' },
      { common: '好看', preferred: '美观' },
      { common: '好吃', preferred: '美味' },
      { common: '好听', preferred: '悦耳' },
      { common: '好闻', preferred: '芬芳' },
    ];
    
    // 添加固定替换
    fixedReplacements.forEach(item => {
      commonToPreferred.set(item.common, item.preferred);
    });
    
    // 从 vocabulary 表中添加词汇（如果有 note 说明的话）
    vocabulary.forEach(item => {
      if (item.note && item.note.includes('替换')) {
        // 简单的解析 note 中的替换关系
        const noteParts = item.note.split(/替换|→|->/);
        if (noteParts.length >= 2) {
          const common = noteParts[0].trim();
          if (common && common.length > 0) {
            commonToPreferred.set(common, item.word);
          }
        }
      }
    });
    
    // 应用替换
    commonToPreferred.forEach((preferred, common) => {
      if (result.includes(common)) {
        const regex = new RegExp(this.escapeRegex(common), 'g');
        const matches = result.match(regex);
        
        if (matches) {
          // 只替换一部分，避免过度替换
          let applied = 0;
          result = result.replace(regex, (match) => {
            if (applied < matches.length * 0.3) { // 30%的概率替换
              applied++;
              replacements.push({
                original: match,
                replaced: preferred,
                reason: '优选词替换',
                source: '优选词库',
              });
              return preferred;
            }
            return match;
          });
        }
      }
    });
    
    return { result, replacements };
  }
  
  /**
   * 转义正则表达式特殊字符
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
