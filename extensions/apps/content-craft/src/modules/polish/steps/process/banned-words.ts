/**
 * 禁用词处理步骤
 * 
 * 职责：
 * 1. 检测禁用词
 * 2. 替换为规范表达
 * 
 * @module modules/polish/steps/process/banned-words
 */

import { BaseStep } from '../base';
import type { StepContext, StepResult, StepSettings, ReplacementRecord } from '../../types';

/**
 * 禁用词处理步骤
 */
export class BannedWordsStep extends BaseStep {
  readonly id = 'bannedWords';
  readonly name = '禁用词处理';
  readonly phase = 'process' as const;
  readonly description = '检测并替换禁用词、敏感词';
  readonly fixed = false;
  readonly dependencies = ['polish'];
  
  // 常见禁用词库
  private readonly BANNED_WORDS: Map<string, string> = new Map([
    // 政治敏感
    ['习近平', '某领导人'],
    ['共产党', '执政党'],
    
    // 粗俗用语
    ['傻逼', '愚蠢'],
    ['妈的', '可恶'],
    ['他妈', '真是'],
    ['卧槽', '天哪'],
    
    // 歧视用语
    ['弱智', '智力障碍'],
    ['脑残', '欠考虑'],
    ['白痴', '糊涂'],
    
    // 过时表达
    ['小编', '笔者'],
    ['亲们', '各位'],
  ]);
  
  async execute(context: StepContext): Promise<StepResult> {
    const { text, settings, resources, reportProgress } = context;
    const startTime = Date.now();
    
    try {
      reportProgress?.('正在检查禁用词...');
      
      // 获取禁用词库（优先使用资源库）
      const bannedWordsMap = this.buildBannedWordsMap(resources?.bannedWords);
      
      // 检测并替换
      const { result, replacements } = this.processBannedWords(text, bannedWordsMap);
      
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
        text: result,
        modified: true,
        replacements,
        report: {
          step: this.name,
          report: `处理 ${replacements.length} 处禁用词`,
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
   * 构建禁用词映射表
   */
  private buildBannedWordsMap(
    customBannedWords?: Array<{ word: string; replacement: string }>
  ): Map<string, string> {
    const map = new Map(this.BANNED_WORDS);
    
    // 添加自定义禁用词
    if (customBannedWords) {
      customBannedWords.forEach(item => {
        map.set(item.word, item.replacement);
      });
    }
    
    return map;
  }
  
  /**
   * 处理禁用词
   */
  private processBannedWords(
    text: string,
    bannedWordsMap: Map<string, string>
  ): { result: string; replacements: ReplacementRecord[] } {
    let result = text;
    const replacements: ReplacementRecord[] = [];
    
    bannedWordsMap.forEach((replacement, word) => {
      if (result.includes(word)) {
        const regex = new RegExp(this.escapeRegex(word), 'g');
        const matches = result.match(regex);
        
        if (matches) {
          result = result.replace(regex, replacement);
          replacements.push({
            original: word,
            replaced: replacement,
            reason: '禁用词替换',
            source: '禁用词库',
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
