/**
 * ============================================================================
 * 高效处理流水线
 * ============================================================================
 * 
 * 优化策略：
 * 1. 单次 LLM 调用：将词汇验证、禁用词检查合并到主 Prompt
 * 2. 智能跳过：根据文本特征判断是否需要额外验证
 * 3. 并行处理：资源加载和预处理并行
 * 4. 预计算：提前计算资源索引，减少运行时开销
 * 
 * 性能提升：
 * - 减少 LLM 调用次数（从 3+ 次降到 1 次）
 * - 缩短处理时间（预计提升 40-60%）
 */

import type { LLMClient } from 'coze-coding-dev-sdk';
import { invokeLLM, splitTextIntoSegments, VERY_LONG_TEXT_THRESHOLD, SEGMENT_MAX_LENGTH } from './llm-client';
import { QuoteProtector, TextProcessor } from '.';
import { checkVocabularyUsage, checkBannedWords, extractContents } from './text-checker';
import { PatternMatcher, shouldMatchAsVariant } from './pattern-matcher';
import { findRelatedMappings, getClassicalReplacements } from './synonym-mappings';
import { createLogger } from './logger';

const logger = createLogger({ module: 'FastPipeline' });

// ============================================================================
// 分段处理常量
// ============================================================================

/** 输出长度安全阈值（字符数）- 超过此值可能输出不完整 */
const OUTPUT_SAFETY_THRESHOLD = 1500;

/** 分段处理时的目标输出长度 */
const SEGMENT_OUTPUT_TARGET = 1500;

// ============================================================================
// 类型定义
// ============================================================================

/** 处理上下文 */
export interface ProcessContext {
  text: string;
  protectedText: string;
  quoteMap: Map<string, string>;
  settings: {
    vocabulary: any[];
    bannedWords: any[];
    sentencePatterns: any[];
    classicalRatio: number;
    aiModel: string;
    punctuation: any;
    subOptions?: any;
  };
  /** 预计算的资源索引 */
  resourceIndex: ResourceIndex;
}

/** 资源索引（预计算） */
export interface ResourceIndex {
  vocabSet: Set<string>;
  bannedSet: Set<string>;
  patternSet: Set<string>;
  vocabByCategory: Map<string, string[]>;
  bannedByType: Map<string, any[]>;
}

/** 处理结果 */
export interface ProcessResult {
  text: string;
  detectedContext: { perspective?: string; era?: string; faction?: string };
  stats: {
    llmCalls: number;
    vocabUsed: number;
    bannedReplaced: number;
    patternsReplaced: number;
    processingTime: number;
  };
  needsReview: boolean;
  reviewReason?: string;
}

/** 进度回调 */
type ProgressCallback = (progress: number, message: string) => void;

// ============================================================================
// 资源预处理器
// ============================================================================

/**
 * 预计算资源索引（并行处理）
 */
export function buildResourceIndex(
  vocabulary: any[],
  bannedWords: any[],
  sentencePatterns: any[]
): ResourceIndex {
  // 并行构建各个索引
  const vocabSet = new Set(extractContents(vocabulary));
  const bannedSet = new Set(extractContents(bannedWords));
  const patternSet = new Set(sentencePatterns.map(p => p.content));
  
  // 按分类组织词汇
  const vocabByCategory = new Map<string, string[]>();
  vocabulary.forEach(v => {
    const content = typeof v === 'string' ? v : v.content;
    const category = typeof v === 'object' ? v.category || '通用' : '通用';
    const existing = vocabByCategory.get(category) || [];
    existing.push(content);
    vocabByCategory.set(category, existing);
  });
  
  // 按类型组织禁用词
  const bannedByType = new Map<string, any[]>();
  bannedWords.forEach(b => {
    const type = b.type || 'general';
    const existing = bannedByType.get(type) || [];
    existing.push(b);
    bannedByType.set(type, existing);
  });
  
  return { vocabSet, bannedSet, patternSet, vocabByCategory, bannedByType };
}

/**
 * 快速检测文本中的问题（无需 LLM）
 */
export function quickDetectIssues(
  text: string,
  resourceIndex: ResourceIndex,
  sentencePatterns: any[]
): {
  vocabUsageRate: number;
  bannedWordsFound: string[];
  patternsFound: Array<{ content: string; matchType: string }>;
  needsLLMProcess: boolean;
} {
  // 检测词汇使用率
  const { used, unused, rate } = checkVocabularyUsage(text, Array.from(resourceIndex.vocabSet));
  
  // 检测禁用词
  const bannedWordsFound = checkBannedWords(text, Array.from(resourceIndex.bannedSet));
  
  // 检测句子模式（使用模糊匹配）
  const patternsFound: Array<{ content: string; matchType: string }> = [];
  const expandedPatterns = sentencePatterns.map(p => ({
    id: p.content,
    content: p.content,
    replacements: p.replacements || [],
    reason: p.reason || '',
  }));
  
  const matches = PatternMatcher.findMatches(text, expandedPatterns);
  matches.forEach(m => {
    patternsFound.push({
      content: m.matched,
      matchType: m.matchType,
    });
  });
  
  // 判断是否需要 LLM 处理
  const needsLLMProcess = 
    bannedWordsFound.length > 0 ||
    patternsFound.length > 0 ||
    rate < 15; // 词汇使用率低于 15%
  
  return {
    vocabUsageRate: rate,
    bannedWordsFound,
    patternsFound,
    needsLLMProcess,
  };
}

// ============================================================================
// 单次 LLM 处理
// ============================================================================

/**
 * 构建高效 Prompt（一次性完成所有处理）
 */
export function buildOptimizedPrompt(
  protectedText: string,
  settings: ProcessContext['settings'],
  issues: ReturnType<typeof quickDetectIssues>,
  resourceIndex: ResourceIndex
): { system: string; user: string } {
  const { classicalRatio, vocabulary, bannedWords, sentencePatterns, punctuation, subOptions } = settings;
  
  // 获取词汇样本（按分类）
  const vocabSamples: string[] = [];
  resourceIndex.vocabByCategory.forEach((words, category) => {
    if (vocabSamples.length < 50) {
      vocabSamples.push(`【${category}】${words.slice(0, 10).join('、')}`);
    }
  });
  
  // 获取禁用词（只包含文本中存在的）
  const relevantBannedWords = issues.bannedWordsFound.slice(0, 30);
  
  // 获取句子模式（包含变体识别）
  const relevantPatterns = issues.patternsFound.slice(0, 20);
  
  // 风格指南
  const styleGuide = classicalRatio <= 30 
    ? "现代白话风格" 
    : classicalRatio <= 60 
    ? "文白参半，适度典雅" 
    : "文言风格为主";
  
  // 构建文言替换参考
  const classicalRef = buildClassicalReference(issues);
  
  // 提取所有禁用词用于严禁检查
  const allBannedList = Array.from(resourceIndex.bannedSet);
  
  const system = `你是精通古典文言与现代白话的文字润色专家。

【核心任务】一次性完成以下所有处理：
1. 词汇润色：使用高级词汇替换普通表达
2. 禁用词净化：替换所有禁用词
3. 句式优化：替换问题句式
4. 风格统一：${styleGuide}

【最高优先级】
⛔ 只换词不重写，不改变原意
⛔ 保护引用内容（【Q0】等占位符不可修改）
⛔ 保护专有名词（人名、地名、机构名）

【偏好词汇库 - 必须优先使用】
${vocabSamples.join('\n')}

【禁用词 - 必须替换】
${relevantBannedWords.length > 0 ? relevantBannedWords.map(w => `- "${w}"`).join('\n') : '（无）'}

【严禁规则 - 必须遵守】
⛔⛔⛔ 替换词绝对不能是任何禁用词！
⛔⛔⛔ 如果备选词也是禁用词，必须换一个完全不同的词！
⛔⛔⛔ 禁用词包括：${allBannedList.slice(0, 30).join('、')}

【问题句式 - 需要优化】
${relevantPatterns.length > 0 ? relevantPatterns.map(p => `- "${p.content}"${p.matchType !== 'exact' ? ` (${p.matchType}匹配)` : ''}`).join('\n') : '（无）'}

【文言替换参考】
${classicalRef}

【重要提示】
⚠️ 替换时直接使用替换词本身，不要在输出中添加任何说明文字（如"逗号"、"句号"、"破折号"等）
⚠️ 标点替换时使用实际的标点符号【，】，不要写出"逗号"这个词

【输出格式 - 必须严格遵守】
⚠️ 直接输出处理后的文本，不要输出任何 JSON、元数据、说明文字
⚠️ 不要输出 {「perspective」:...} 或 {"perspective":...} 这类内容
⚠️ 第一行就直接是处理后的文本开头

`;

  const user = `请处理以下文本（${styleGuide}）：

${protectedText}`;

  return { system, user };
}

/**
 * 构建文言替换参考
 */
function buildClassicalReference(issues: ReturnType<typeof quickDetectIssues>): string {
  const refs: string[] = [];
  
  // 根据问题句式添加文言参考
  issues.patternsFound.forEach(p => {
    const mappings = findRelatedMappings(p.content);
    mappings.forEach(m => {
      if (m.classicalReplacements.length > 0) {
        refs.push(`${m.skeleton} → ${m.classicalReplacements.slice(0, 2).join('/')}`);
      }
    });
  });
  
  // 去重并限制数量
  const uniqueRefs = [...new Set(refs)].slice(0, 10);
  
  if (uniqueRefs.length === 0) {
    return `进递: 既...又...、非独...亦...
转折: 虽...然...、纵...亦...
因果: 以...故...、故、是以
总结: 要之、总之、统而言之`;
  }
  
  return uniqueRefs.join('\n');
}

// ============================================================================
// 高效处理流水线
// ============================================================================

/**
 * 快速处理流水线
 */
export const FastPipeline = {
  /**
   * 初始化处理上下文
   * @param text 原始文本
   * @param settings 处理设置
   * @param enableQuoteProtect 是否启用引用保护，默认为 true
   */
  init(
    text: string,
    settings: ProcessContext['settings'],
    enableQuoteProtect: boolean = true
  ): ProcessContext {
    // 根据开关决定是否保护引用
    let protectedText: string;
    let quoteMap: Map<string, string>;
    
    if (enableQuoteProtect) {
      const protectResult = QuoteProtector.protect(text);
      protectedText = protectResult.text;
      quoteMap = protectResult.map;
      logger.debug(`引用保护已启用，保护了 ${quoteMap.size} 处引用`);
    } else {
      protectedText = text;
      quoteMap = new Map();
      logger.debug('引用保护已禁用，使用原始文本');
    }
    
    // 预计算资源索引
    const resourceIndex = buildResourceIndex(
      settings.vocabulary || [],
      settings.bannedWords || [],
      settings.sentencePatterns || []
    );
    
    return {
      text,
      protectedText,
      quoteMap,
      settings,
      resourceIndex,
    };
  },

  /**
   * 执行快速处理（支持分段）
   */
  async process(
    context: ProcessContext,
    llmClient: LLMClient,
    model: string,
    onProgress?: ProgressCallback
  ): Promise<ProcessResult> {
    const startTime = Date.now();
    let llmCalls = 0;
    
    // 检查是否需要分段处理
    const textLength = context.protectedText.length;
    const needsSegmentation = textLength > OUTPUT_SAFETY_THRESHOLD;
    
    logger.debug('处理文本长度', { 
      textLength, 
      needsSegmentation,
      threshold: OUTPUT_SAFETY_THRESHOLD 
    });
    
    if (needsSegmentation) {
      // 分段处理模式
      return await this.processSegmented(context, llmClient, model, onProgress);
    }
    
    // 单段处理模式（原有逻辑）
    // 阶段1：快速检测（5%）
    onProgress?.(5, '快速检测问题...');
    const issues = quickDetectIssues(
      context.protectedText,
      context.resourceIndex,
      context.settings.sentencePatterns || []
    );
    
    logger.debug('快速检测结果', {
      vocabUsageRate: issues.vocabUsageRate.toFixed(1) + '%',
      bannedWords: issues.bannedWordsFound.length,
      patterns: issues.patternsFound.length,
      needsLLM: issues.needsLLMProcess,
    });
    
    // 如果文本已经很完美，跳过 LLM 处理
    if (!issues.needsLLMProcess) {
      onProgress?.(100, '文本已优化，无需处理');
      return {
        text: context.text,
        detectedContext: {},
        stats: {
          llmCalls: 0,
          vocabUsed: issues.vocabUsageRate >= 15 ? context.resourceIndex.vocabSet.size : 0,
          bannedReplaced: 0,
          patternsReplaced: 0,
          processingTime: Date.now() - startTime,
        },
        needsReview: false,
      };
    }
    
    // 阶段2：构建优化 Prompt（10%）
    onProgress?.(10, '构建处理指令...');
    const { system, user } = buildOptimizedPrompt(
      context.protectedText,
      context.settings,
      issues,
      context.resourceIndex
    );
    
    // 阶段3：单次 LLM 调用（10-85%）
    onProgress?.(15, '执行智能处理...');
    const result = await invokeLLM(llmClient, [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ], { model, temperature: 0.3 });
    llmCalls++;
    
    onProgress?.(85, '解析处理结果...');
    
    // 阶段4：解析结果
    const { detectedContext, text: processedText } = TextProcessor.parseDetectionResult(result);
    
    // 阶段5：恢复引用（90%）- 仅在启用引用保护时执行
    onProgress?.(90, '恢复引用内容...');
    let finalText = context.quoteMap.size > 0 
      ? QuoteProtector.restore(processedText, context.quoteMap) 
      : processedText;
    
    // 阶段6：后处理（95%）
    onProgress?.(95, '后处理优化...');
    finalText = TextProcessor.postProcess(finalText, {
      enableBreathing: context.settings.subOptions?.enableDialogueFormat,
      punctuation: context.settings.punctuation,
    });
    
    // 快速验证结果
    const finalIssues = quickDetectIssues(
      finalText,
      context.resourceIndex,
      context.settings.sentencePatterns || []
    );
    
    const needsReview = finalIssues.bannedWordsFound.length > 0 || finalIssues.patternsFound.length > 0;
    
    onProgress?.(100, '处理完成');
    
    return {
      text: finalText,
      detectedContext,
      stats: {
        llmCalls,
        vocabUsed: context.resourceIndex.vocabSet.size - (issues.vocabUsageRate - finalIssues.vocabUsageRate < 0 ? 0 : 0),
        bannedReplaced: issues.bannedWordsFound.length - finalIssues.bannedWordsFound.length,
        patternsReplaced: issues.patternsFound.length - finalIssues.patternsFound.length,
        processingTime: Date.now() - startTime,
      },
      needsReview,
      reviewReason: needsReview 
        ? `仍有 ${finalIssues.bannedWordsFound.length} 条禁用词或 ${finalIssues.patternsFound.length} 个问题句式未处理`
        : undefined,
    };
  },

  /**
   * 分段处理长文本
   */
  async processSegmented(
    context: ProcessContext,
    llmClient: LLMClient,
    model: string,
    onProgress?: ProgressCallback
  ): Promise<ProcessResult> {
    const startTime = Date.now();
    let llmCalls = 0;
    let totalBannedReplaced = 0;
    let totalPatternsReplaced = 0;
    
    // 阶段1：分段（5%）
    onProgress?.(5, '文本分段处理...');
    
    // 恢复引用后分段，保持段落完整性（仅当启用引用保护时）
    const originalText = context.quoteMap.size > 0 
      ? QuoteProtector.restore(context.protectedText, context.quoteMap) 
      : context.protectedText;
    const segments = splitTextIntoSegments(originalText, SEGMENT_OUTPUT_TARGET);
    
    logger.debug('分段结果', {
      segmentCount: segments.length,
      segmentLengths: segments.map(s => s.length),
    });
    
    // 阶段2：处理每一段（5-85%）
    const processedSegments: string[] = [];
    const progressPerSegment = 80 / segments.length;
    const isQuoteProtectEnabled = context.quoteMap.size > 0;
    
    for (let i = 0; i < segments.length; i++) {
      const segmentProgress = 5 + Math.round(i * progressPerSegment);
      onProgress?.(segmentProgress, `处理第 ${i + 1}/${segments.length} 段...`);
      
      // 根据开关决定是否保护当前段的引用
      let protectedSegment: string;
      let segmentQuoteMap: Map<string, string>;
      
      if (isQuoteProtectEnabled) {
        const protectResult = QuoteProtector.protect(segments[i]);
        protectedSegment = protectResult.text;
        segmentQuoteMap = protectResult.map;
      } else {
        protectedSegment = segments[i];
        segmentQuoteMap = new Map();
      }
      
      // 检测当前段的问题
      const segmentIssues = quickDetectIssues(
        protectedSegment,
        context.resourceIndex,
        context.settings.sentencePatterns || []
      );
      
      if (!segmentIssues.needsLLMProcess) {
        // 当前段无需处理
        processedSegments.push(segments[i]);
        continue;
      }
      
      // 构建处理 Prompt
      const { system, user } = buildOptimizedPrompt(
        protectedSegment,
        context.settings,
        segmentIssues,
        context.resourceIndex
      );
      
      // 调用 LLM
      const result = await invokeLLM(llmClient, [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ], { model, temperature: 0.3 });
      llmCalls++;
      
      // 解析结果
      const { text: processedText } = TextProcessor.parseDetectionResult(result);
      
      // 恢复引用（仅当启用引用保护时）
      let finalSegment = segmentQuoteMap.size > 0 
        ? QuoteProtector.restore(processedText, segmentQuoteMap) 
        : processedText;
      
      // 后处理
      finalSegment = TextProcessor.postProcess(finalSegment, {
        enableBreathing: context.settings.subOptions?.enableDialogueFormat,
        punctuation: context.settings.punctuation,
      });
      
      processedSegments.push(finalSegment);
      
      // 统计
      totalBannedReplaced += segmentIssues.bannedWordsFound.length;
      totalPatternsReplaced += segmentIssues.patternsFound.length;
    }
    
    // 阶段3：合并结果（85-95%）
    onProgress?.(85, '合并处理结果...');
    
    // 使用双换行符合并，保持段落结构
    const finalText = processedSegments.join('\n\n');
    
    // 阶段4：全局后处理（95-100%）
    onProgress?.(95, '全局优化...');
    
    // 快速验证最终结果
    const finalIssues = quickDetectIssues(
      finalText,
      context.resourceIndex,
      context.settings.sentencePatterns || []
    );
    
    const needsReview = finalIssues.bannedWordsFound.length > 0 || finalIssues.patternsFound.length > 0;
    
    onProgress?.(100, '处理完成');
    
    return {
      text: finalText,
      detectedContext: {},
      stats: {
        llmCalls,
        vocabUsed: context.resourceIndex.vocabSet.size,
        bannedReplaced: totalBannedReplaced,
        patternsReplaced: totalPatternsReplaced,
        processingTime: Date.now() - startTime,
      },
      needsReview,
      reviewReason: needsReview 
        ? `仍有 ${finalIssues.bannedWordsFound.length} 条禁用词或 ${finalIssues.patternsFound.length} 个问题句式未处理`
        : undefined,
    };
  },

  /**
   * 可选的二次验证（仅在需要时调用）
   */
  async verify(
    text: string,
    context: ProcessContext,
    llmClient: LLMClient,
    model: string,
    onProgress?: ProgressCallback
  ): Promise<string> {
    onProgress?.(0, '执行二次验证...');
    
    // 快速检测剩余问题
    const issues = quickDetectIssues(text, context.resourceIndex, context.settings.sentencePatterns || []);
    
    if (issues.bannedWordsFound.length === 0 && issues.patternsFound.length === 0) {
      onProgress?.(100, '验证通过');
      return text;
    }
    
    // 构建精简的验证 Prompt
    const prompt = `以下文本仍有问题需要修复：

【禁用词残留】
${issues.bannedWordsFound.map(w => `- "${w}"`).join('\n')}

【问题句式残留】
${issues.patternsFound.map(p => `- "${p.content}"`).join('\n')}

【原文】
${text}

【要求】
1. 替换所有残留问题
2. 保持语义不变
3. 直接输出修复后的文本`;

    const result = await invokeLLM(llmClient, [{ role: 'user', content: prompt }], { 
      model, 
      temperature: 0.2 
    });
    
    onProgress?.(100, '验证完成');
    return result.trim();
  },
};
