/**
 * ============================================================================
 * 智能替换器
 * ============================================================================
 * 
 * 设计理念：
 * 1. 统一处理禁用词和句子逻辑禁用库的替换
 * 2. 最大化使用偏好词汇库
 * 3. 支持 LLM 智能生成文言风格替换
 * 4. 语义通顺优先，风格统一
 * 
 * 核心功能：
 * - 智能识别替换位置
 * - 结合偏好词汇优化替换
 * - 文言风格转换
 * - 上下文感知替换
 */

import type { LLMClient } from 'coze-coding-dev-sdk';
import { invokeLLM } from './llm-client';
import { extractContents, sampleItems } from './text-checker';
import { PatternMatcher, shouldMatchAsVariant, type BannedPattern } from './pattern-matcher';
import { getClassicalReplacements, findRelatedMappings } from './synonym-mappings';
import { createLogger } from './logger';

const logger = createLogger({ module: 'SmartReplacer' });

// ============================================================================
// 类型定义
// ============================================================================

/** 替换上下文 */
export interface ReplacementContext {
  /** 原文 */
  text: string;
  /** 文言化程度 */
  classicalRatio: number;
  /** 偏好词汇库 */
  vocabulary: string[];
  /** 禁用词列表 */
  bannedWords: Array<{ content: string; alternative?: string }>;
  /** 句子逻辑禁用库 */
  sentencePatterns: Array<{ content: string; replacements: string[] }>;
  /** 替换风格 */
  style: 'classical_chinese' | 'japanese_chinese' | 'character_morphology' | 'mixed';
}

/** 替换结果 */
export interface ReplacementResult {
  text: string;
  replacements: Array<{
    original: string;
    replaced: string;
    reason: string;
    type: 'banned_word' | 'sentence_pattern' | 'vocabulary_enhancement';
  }>;
  stats: {
    bannedWordsReplaced: number;
    patternsReplaced: number;
    vocabularyUsed: number;
  };
}

/** LLM 替换选项 */
export interface LLMReplacementOptions {
  model: string;
  temperature?: number;
  onProgress?: (progress: number, message: string) => void;
}

// ============================================================================
// 核心替换器
// ============================================================================

/**
 * 智能替换器
 */
export const SmartReplacer = {
  /**
   * 执行智能替换（主入口）
   */
  async replace(
    context: ReplacementContext,
    llmClient: LLMClient,
    options: LLMReplacementOptions
  ): Promise<ReplacementResult> {
    const { text, classicalRatio, vocabulary, bannedWords, sentencePatterns, style } = context;
    
    let result = text;
    const allReplacements: ReplacementResult['replacements'] = [];
    const stats = {
      bannedWordsReplaced: 0,
      patternsReplaced: 0,
      vocabularyUsed: 0,
    };

    // 阶段1：禁用词替换（优先级最高）
    options.onProgress?.(10, '执行禁用词智能替换...');
    const bannedResult = await this.replaceBannedWords(
      result,
      bannedWords,
      vocabulary,
      classicalRatio,
      style,
      llmClient,
      options
    );
    result = bannedResult.text;
    allReplacements.push(...bannedResult.replacements);
    stats.bannedWordsReplaced = bannedResult.replacements.length;

    // 阶段2：句子逻辑禁用库替换（含模糊识别）
    options.onProgress?.(40, '执行句子逻辑智能替换...');
    const patternResult = await this.replaceSentencePatterns(
      result,
      sentencePatterns,
      vocabulary,
      classicalRatio,
      llmClient,
      options
    );
    result = patternResult.text;
    allReplacements.push(...patternResult.replacements);
    stats.patternsReplaced = patternResult.replacements.length;

    // 阶段3：词汇强化（最大化使用偏好词汇）
    if (vocabulary.length > 0) {
      options.onProgress?.(70, '执行偏好词汇强化...');
      const vocabResult = await this.enhanceVocabulary(
        result,
        vocabulary,
        classicalRatio,
        llmClient,
        options
      );
      result = vocabResult.text;
      allReplacements.push(...vocabResult.replacements);
      stats.vocabularyUsed = vocabResult.replacements.length;
    }

    options.onProgress?.(95, '智能替换完成');

    return { text: result, replacements: allReplacements, stats };
  },

  /**
   * 禁用词智能替换
   */
  async replaceBannedWords(
    text: string,
    bannedWords: Array<{ content: string; alternative?: string }>,
    vocabulary: string[],
    classicalRatio: number,
    style: string,
    llmClient: LLMClient,
    options: LLMReplacementOptions
  ): Promise<{ text: string; replacements: ReplacementResult['replacements'] }> {
    if (bannedWords.length === 0) {
      return { text, replacements: [] };
    }

    // 构建禁用词映射
    const bannedMap = new Map<string, string | undefined>();
    bannedWords.forEach(b => bannedMap.set(b.content, b.alternative));

    // 检查文本中存在的禁用词
    const found = bannedWords.filter(b => text.includes(b.content));
    if (found.length === 0) {
      return { text, replacements: [] };
    }

    // 根据文言化程度选择替换风格
    const styleGuide = getStyleGuide(classicalRatio, style);
    
    // 构建替换 Prompt
    const prompt = buildBannedWordsPrompt(text, found, vocabulary, styleGuide, classicalRatio);

    try {
      const response = await invokeLLM(llmClient, [{ role: 'user', content: prompt }], {
        model: options.model,
        temperature: options.temperature ?? 0.2,
      });

      const processed = response.trim();
      if (processed && processed.length > 50) {
        // 分析替换
        const replacements = analyzeReplacements(text, processed, found, 'banned_word');
        return { text: processed, replacements };
      }
    } catch (error) {
      logger.error('禁用词替换失败', error);
    }

    return { text, replacements: [] };
  },

  /**
   * 句子逻辑禁用库智能替换（含模糊识别）
   */
  async replaceSentencePatterns(
    text: string,
    sentencePatterns: Array<{ content: string; replacements: string[] }>,
    vocabulary: string[],
    classicalRatio: number,
    llmClient: LLMClient,
    options: LLMReplacementOptions
  ): Promise<{ text: string; replacements: ReplacementResult['replacements'] }> {
    if (sentencePatterns.length === 0) {
      return { text, replacements: [] };
    }

    // 扩展模式，添加模糊识别
    const expandedPatterns = sentencePatterns.map(p => ({
      id: p.content,
      content: p.content,
      replacements: p.replacements,
      reason: '句式逻辑优化',
    }));

    // 查找匹配（包括变体）
    const matches = PatternMatcher.findMatches(text, expandedPatterns);
    
    if (matches.length === 0) {
      return { text, replacements: [] };
    }

    // 获取文言替换建议
    const classicalSuggestions = new Map<string, string[]>();
    matches.forEach(m => {
      const classical = getClassicalReplacements(m.matched);
      if (classical.length > 0) {
        classicalSuggestions.set(m.matched, classical);
      }
    });

    // 构建替换 Prompt
    const prompt = buildSentencePatternPrompt(
      text,
      matches,
      sentencePatterns,
      classicalSuggestions,
      vocabulary,
      classicalRatio
    );

    try {
      const response = await invokeLLM(llmClient, [{ role: 'user', content: prompt }], {
        model: options.model,
        temperature: options.temperature ?? 0.2,
      });

      const processed = response.trim();
      if (processed && processed.length > 50) {
        // 分析替换
        const replacements = analyzePatternReplacements(text, processed, matches);
        return { text: processed, replacements };
      }
    } catch (error) {
      logger.error('句子逻辑替换失败', error);
    }

    return { text, replacements: [] };
  },

  /**
   * 词汇强化（最大化使用偏好词汇）
   */
  async enhanceVocabulary(
    text: string,
    vocabulary: string[],
    classicalRatio: number,
    llmClient: LLMClient,
    options: LLMReplacementOptions
  ): Promise<{ text: string; replacements: ReplacementResult['replacements'] }> {
    if (vocabulary.length === 0) {
      return { text, replacements: [] };
    }

    // 检查词汇使用率
    const used = vocabulary.filter(v => text.includes(v));
    const unused = vocabulary.filter(v => !text.includes(v));
    
    // 如果使用率已经很高，跳过
    if (unused.length <= Math.floor(vocabulary.length * 0.3)) {
      logger.info(`词汇使用率已达 ${((used.length / vocabulary.length) * 100).toFixed(1)}%`);
      return { text, replacements: [] };
    }

    // 构建词汇强化 Prompt
    const prompt = buildVocabularyEnhancementPrompt(text, used, unused, classicalRatio);

    try {
      const response = await invokeLLM(llmClient, [{ role: 'user', content: prompt }], {
        model: options.model,
        temperature: options.temperature ?? 0.25,
      });

      const processed = response.trim();
      if (processed && processed.length > 50) {
        // 分析词汇使用情况
        const newUsed = vocabulary.filter(v => processed.includes(v));
        const newlyUsed = newUsed.filter(v => !used.includes(v));
        
        const replacements = newlyUsed.map(v => {
          // 尝试找出被替换的原文（简化处理）
          return {
            original: '普通表达',
            replaced: v,
            reason: '偏好词汇强化',
            type: 'vocabulary_enhancement' as const,
          };
        });

        logger.info(`词汇强化：新增 ${newlyUsed.length} 条词汇使用`);
        return { text: processed, replacements };
      }
    } catch (error) {
      logger.error('词汇强化失败', error);
    }

    return { text, replacements: [] };
  },
};

// ============================================================================
// Prompt 构建器
// ============================================================================

/**
 * 构建禁用词替换 Prompt
 */
function buildBannedWordsPrompt(
  text: string,
  bannedWords: Array<{ content: string; alternative?: string }>,
  vocabulary: string[],
  styleGuide: string,
  classicalRatio: number
): string {
  // 准备词汇样本
  const vocabSample = sampleItems(vocabulary, 20);
  
  // 准备禁用词列表
  const bannedList = bannedWords.map(b => {
    const alt = b.alternative ? ` → 建议替换: ${b.alternative}` : '';
    const classical = getClassicalReplacements(b.content);
    const classicalHint = classical.length > 0 ? ` | 文言: ${classical.slice(0, 3).join('/')}` : '';
    return `- "${b.content}"${alt}${classicalHint}`;
  });

  return `你是精通古典文言与现代白话的文字润色专家。请执行禁用词替换任务。

【原文】
${text}

【禁用词列表 - 必须全部替换】
${bannedList.join('\n')}

【偏好词汇库 - 优先使用】
${vocabSample.length > 0 ? vocabSample.join('、') : '（无）'}

【替换风格】${styleGuide}
${classicalRatio >= 50 ? '\n文言化程度较高，优先使用文言表达替换' : ''}

【替换原则】
✅ 必须替换所有禁用词
✅ 优先使用偏好词汇库中的词
✅ 语义保持不变，语句通顺
✅ 风格统一，符合原文基调
❌ 不可删除内容或改变原意

【输出】
直接输出替换后的完整文本，不要解释。`;
}

/**
 * 构建句子逻辑禁用库替换 Prompt
 */
function buildSentencePatternPrompt(
  text: string,
  matches: Array<{ matched: string; matchType: string; confidence: number }>,
  patterns: Array<{ content: string; replacements: string[] }>,
  classicalSuggestions: Map<string, string[]>,
  vocabulary: string[],
  classicalRatio: number
): string {
  // 准备匹配列表
  const matchList = matches.map(m => {
    const pattern = patterns.find(p => p.content === m.matched || 
      shouldMatchAsVariant(p.content, m.matched).shouldMatch
    );
    const replacements = pattern?.replacements || [];
    const classical = classicalSuggestions.get(m.matched) || [];
    
    let hint = '';
    if (replacements.length > 0) {
      hint += ` | 替换: ${replacements.slice(0, 3).join('/')}`;
    }
    if (classical.length > 0) {
      hint += ` | 文言: ${classical.slice(0, 3).join('/')}`;
    }
    
    const typeLabel = m.matchType === 'exact' ? '[精确]' : 
                      m.matchType === 'variant' ? '[变体]' : '[模糊]';
    
    return `- ${typeLabel} "${m.matched}"${hint}`;
  });

  // 准备词汇样本
  const vocabSample = sampleItems(vocabulary, 15);

  return `你是精通古典文言与现代白话的文字润色专家。请执行句式优化替换任务。

【原文】
${text}

【问题句式 - 需要优化替换】
${matchList.join('\n')}

【偏好词汇库 - 替换时优先使用】
${vocabSample.length > 0 ? vocabSample.join('、') : '（无）'}

【文言化程度】${classicalRatio}%
${classicalRatio >= 50 ? '\n倾向使用文言表达，如：既...又...、虽...然...、是以、由是等' : ''}

【替换原则】
✅ 将问题句式替换为更优雅的表达
✅ 优先使用偏好词汇
✅ 保持语义不变，逻辑清晰
✅ 注意变体识别（如"不但...而且"等同于"不仅...而且"）
❌ 不可删除内容或改变原意

【文言替换参考】
- 进递关系: 既...又...、非独...亦...、不特...且...
- 转折关系: 虽...然...、纵...亦...、然、顾
- 因果关系: 以...故...、因...遂...、故、是以
- 总结关系: 要之、总之、统而言之
- 强调关系: 诚、实、确、洵、良
- 过渡关系: 易言之、质言之、即、盖

【输出】
直接输出优化后的完整文本，不要解释。`;
}

/**
 * 构建词汇强化 Prompt
 */
function buildVocabularyEnhancementPrompt(
  text: string,
  used: string[],
  unused: string[],
  classicalRatio: number
): string {
  // 随机抽取未使用的词汇
  const targetVocab = sampleItems(unused, 30);
  
  // 已使用的词汇作为风格参考
  const styleSample = sampleItems(used, 10);

  return `你是文本润色专家。请在保持原意的前提下，最大化使用高级词汇。

【原文】
${text}

【已使用的高级词汇】（风格参考）
${styleSample.length > 0 ? styleSample.join('、') : '（暂无）'}

【必须尝试使用的高级词汇】
${targetVocab.join('、')}

【文言化程度】${classicalRatio}%

【任务】
1. 扫描原文，找出可以用高级词汇替换的普通表达
2. 建立映射：普通表达 → 高级词汇
3. 执行替换（确保通顺）

【映射示例】
"重要" → "关键"（如词汇库有"关键"）
"改变" → "鼎革"（如词汇库有"鼎革"）
"因此" → "是以"（如词汇库有"是以"）

【原则】
✅ 找到合适的普通表达 → 执行替换
✅ 替换后句子通顺 → 保留
❌ 找不到对应表达 → 不强行替换
❌ 替换后不通顺 → 保留原词

【输出】
直接输出优化后的完整文本，不要解释。`;
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 根据文言化程度和风格获取风格指南
 */
function getStyleGuide(classicalRatio: number, style: string): string {
  if (style === 'classical_chinese') {
    return '古典文言风格，使用之乎者也、是以、由是等文言表达';
  }
  if (style === 'japanese_chinese') {
    return '和风汉文风格，保留典雅感但偏向现代';
  }
  if (style === 'character_morphology') {
    return '字形演变风格，注意词语的古雅形态';
  }
  
  // 混合风格，根据文言化程度调整
  if (classicalRatio >= 70) {
    return '文言为主，大量使用古雅表达';
  }
  if (classicalRatio >= 40) {
    return '文白参半，适度使用文言点缀';
  }
  return '白话为主，少量古雅词汇点缀';
}

/**
 * 分析替换结果
 */
function analyzeReplacements(
  original: string,
  processed: string,
  items: Array<{ content: string; alternative?: string }>,
  type: 'banned_word' | 'sentence_pattern' | 'vocabulary_enhancement'
): ReplacementResult['replacements'] {
  const replacements: ReplacementResult['replacements'] = [];
  
  for (const item of items) {
    if (!processed.includes(item.content)) {
      // 禁用词被替换了，尝试找出替换词
      const idx = original.indexOf(item.content);
      if (idx !== -1) {
        // 获取原文中的上下文
        const before = original.slice(Math.max(0, idx - 5), idx);
        const after = original.slice(idx + item.content.length, Math.min(original.length, idx + item.content.length + 5));
        
        // 在处理后的文本中查找相似上下文
        const beforeIdx = processed.indexOf(before);
        if (beforeIdx !== -1) {
          const afterIdx = processed.indexOf(after, beforeIdx + before.length + 1);
          if (afterIdx !== -1 && afterIdx > beforeIdx + before.length) {
            const replacement = processed.slice(beforeIdx + before.length, afterIdx);
            if (replacement && replacement !== item.content) {
              replacements.push({
                original: item.content,
                replaced: replacement,
                reason: type === 'banned_word' ? '禁用词替换' : '句式优化',
                type,
              });
            }
          }
        }
      }
    }
  }
  
  return replacements;
}

/**
 * 分析句式替换结果
 */
function analyzePatternReplacements(
  original: string,
  processed: string,
  matches: Array<{ matched: string; matchType: string }>
): ReplacementResult['replacements'] {
  const replacements: ReplacementResult['replacements'] = [];
  
  for (const match of matches) {
    if (!processed.includes(match.matched)) {
      replacements.push({
        original: match.matched,
        replaced: '智能替换',
        reason: `句式优化（${match.matchType === 'exact' ? '精确匹配' : '变体识别'}）`,
        type: 'sentence_pattern',
      });
    }
  }
  
  return replacements;
}
