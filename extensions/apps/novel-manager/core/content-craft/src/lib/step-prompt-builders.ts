/**
 * ============================================================================
 * 步骤指令构建器
 * ============================================================================
 * 
 * 每个处理步骤对应一个指令构建函数
 */

import type { 
  HistoricalNarrativeSettings, 
  ResourceItem,
  LiteratureResource,
} from '@/types';
import { 
  getClassicalDescription, 
  getCitationDescription,
} from '@/constants';
import { buildParticleLimits } from '@/constants/particles';
import {
  compressVocabulary,
  compressMemes,
  toResourceItems,
} from './prompt-compression';

// ============================================================================
// 前置配置阶段指令
// ============================================================================

/**
 * 叙事视角指令
 * 调整文本的叙事视角
 */
export function buildNarrativePerspectivePrompt(perspective: string): string {
  const perspectiveMap: Record<string, { title: string; instruction: string }> = {
    'first-person': {
      title: '第一人称沉浸',
      instruction: `【叙事视角 - 第一人称沉浸】
要求：
1. 使用"我"作为叙述主体
2. 仅描写"我"所能感知的事物
3. 展现"我"的内心活动和情感
4. 其他人物的内心活动只能通过外在表现推测
5. 增强沉浸感和代入感

示例转换：
- 原文：他心里想，这件事不能告诉她。
- 转换：我看见他欲言又止，似乎有什么事不想让我知道。
`
    },
    'limited-omniscient': {
      title: '有限上帝视角',
      instruction: `【叙事视角 - 有限上帝视角】
要求：
1. 以第三人称叙述，但聚焦于某一角色的视角
2. 可以描写聚焦角色的内心活动
3. 其他角色只能描写外在行为和语言
4. 保持叙事的连贯性和聚焦感
5. 适度揭示聚焦角色的心理

示例转换：
- 原文：大家都觉得这件事很奇怪。
- 转换：他觉得这件事颇为蹊跷，其他人似乎也有同感。
`
    },
    'full-omniscient': {
      title: '全知上帝视角',
      instruction: `【叙事视角 - 全知上帝视角】
要求：
1. 以第三人称全知视角叙述
2. 可以自由切换不同角色的视角
3. 可以描写所有角色的内心活动
4. 可以揭示事件的因果关系和背景信息
5. 保持叙事的宏大感和历史感

示例转换：
- 原文：他想了很久，终于做出了决定。
- 转换：他思忖良久，权衡利弊，最终下定决心。而此时的他还不知道，这个决定将改变一切。
`
    }
  };

  const config = perspectiveMap[perspective] || perspectiveMap['limited-omniscient'];
  
  return config.instruction;
}

/**
 * 文言化应用指令（精简版）
 */
export function buildClassicalApplyPrompt(ratio: number): string {
  if (ratio <= 0) return "";
  
  if (ratio <= 20) {
    return `【文言化 ${ratio}% - 现代白话】
禁止：之乎者也、是以、由是
要求：使用现代汉语口语表达
`;
  }
  
  if (ratio <= 40) {
    return `【文言化 ${ratio}% - 白话为主】
要求：95%白话，全文最多5个古雅词点缀
禁止：之乎者也、文言句式
`;
  }
  
  if (ratio <= 60) {
    return `【文言化 ${ratio}% - 文白参半】
要求：约50%句子使用文言表达，保持可读性
`;
  }
  
  if (ratio <= 80) {
    return `【文言化 ${ratio}% - 偏向文言】
要求：约70%句子使用文言表达，保持典雅风格
`;
  }
  
  return `【文言化 ${ratio}% - 以文言为主】
要求：90%以上使用文言表达
`;
}

/**
 * 引用应用指令
 */
export function buildCitationApplyPrompt(ratio: number, literature?: LiteratureResource[]): string {
  if (!literature || literature.length === 0) return "";
  
  const books = literature.filter(l => l.type === 'book');
  const getCitationCount = () => {
    if (ratio <= 10) return "0-1处";
    if (ratio <= 30) return "1-2处";
    if (ratio <= 50) return "3-5处";
    return "5处以上";
  };
  
  return `【引用应用】目标：${getCitationCount()}
可用文献：
${books.slice(0, 10).map(b => `• 《${b.title}》${b.author ? `（${b.author}）` : ''}`).join('\n')}
`;
}

/**
 * 虚词限制指令
 */
export function buildParticleApplyPrompt(settings: any): string {
  if (!settings) return "";
  
  const limits = buildParticleLimits(settings);
  const mode = settings.enableSmart ? "智能" : "严格";
  
  return `【虚词限制】${mode}模式
${limits || "无限制"}
`;
}

/**
 * 标点规范指令
 */
export function buildPunctuationApplyPrompt(punctuation: any): string {
  if (!punctuation) return "";
  
  const rules: string[] = [];
  if (punctuation.banDash) rules.push("禁破折号【——】，替换为逗号【，】");
  if (punctuation.banColon) rules.push("禁冒号【：】，替换为逗号【，】");
  if (punctuation.banParentheses) rules.push("禁括号【（）】，内容转为正文");
  if (punctuation.useJapaneseQuotes) rules.push("中文引号\"\"转为日文引号「」");
  if (punctuation.useJapaneseBookMarks) rules.push("中文书名号《》转为日文书名号『』");
  
  if (rules.length === 0) return "";
  return `【标点规范】${rules.join('、')}
`;
}

// ============================================================================
// 核心处理阶段指令
// ============================================================================

/**
 * 词汇润色指令
 */
export function buildPolishPrompt(vocabulary: (ResourceItem | string)[], classicalRatio: number = 20): string {
  const items = toResourceItems(vocabulary, 'vocabulary');
  if (items.length === 0) return "";
  
  // 按分类组织词汇
  const categorizedItems: Record<string, string[]> = {};
  items.forEach(item => {
    const cat = item.category || '通用';
    if (!categorizedItems[cat]) categorizedItems[cat] = [];
    categorizedItems[cat].push(item.content);
  });
  
  // 格式化词汇库（每个分类最多20个）
  const formattedVocab = Object.entries(categorizedItems)
    .slice(0, 5)
    .map(([cat, words]) => `【${cat}】${words.slice(0, 20).join('、')}`)
    .join('\n');
  
  const styleGuide = classicalRatio <= 30 
    ? "保持现代白话风格" 
    : classicalRatio <= 60 
    ? "文白参半" 
    : "偏向文言";
  
  return `【词汇润色】${items.length} 条词汇，${styleGuide}
【词汇库】
${formattedVocab}

【执行步骤】
1. 建立"普通表达→高级词汇"映射表
2. 扫描原文找出可替换位置
3. 执行替换（替换后必须通顺、语义不变）

【保护规则】
⛔ 引用内容、专有名词、历史术语、【Q0】等占位符不可修改
`;
}

/**
 * 禁用词净化指令（智能版 - 支持偏好词汇优先）
 */
export function buildBannedWordsPrompt(
  bannedWords: any[],
  replacementStyle: string = 'classical_chinese',
  classicalRatio: number = 20,
  vocabulary: (ResourceItem | string)[] = []
): string {
  if (!bannedWords || bannedWords.length === 0) return "";
  
  // 导入同义映射获取文言替换建议
  const { getClassicalReplacements } = require('./synonym-mappings');
  
  // 提取偏好词汇
  const vocabItems = toResourceItems(vocabulary, 'vocabulary');
  const vocabWords = vocabItems.map(v => v.content);
  
  // 扩展禁用词，添加文言建议
  const bannedList = bannedWords.slice(0, 50).map(item => {
    const alt = item.alternative ? ` → ${item.alternative}` : '';
    
    // 获取文言替换建议
    const classicalOpts = getClassicalReplacements(item.content);
    
    // 合并替换建议
    const allOpts = [item.alternative, ...classicalOpts].filter(Boolean);
    const optsHint = allOpts.length > 0 ? ` [备选: ${allOpts.slice(0, 3).join('/')}]` : '';
    
    return `- ${item.content}${alt}${optsHint}`;
  });
  
  const styleGuide = classicalRatio <= 30 
    ? "用通俗词汇替换" 
    : classicalRatio <= 60 
    ? "可用古雅词汇替换" 
    : "用古雅词汇替换";
  
  // 偏好词汇提示
  const vocabHint = vocabWords.length > 0 
    ? `\n【偏好词汇优先】以下词汇替换时优先使用：\n${vocabWords.slice(0, 20).join('、')}`
    : '';
  
  // 提取所有禁用词用于检查
  const allBannedContents = bannedWords.map(b => b.content);
  
  return `【反感词净化】${bannedWords.length} 条，${styleGuide}
【禁用词列表】
${bannedList.join('\n')}
${vocabHint}

【执行原则】
✅ 禁用词出现 → 必须替换
✅ 有替换建议 → 优先使用该词
✅ 偏好词汇库有匹配词 → 优先使用
✅ 语义保持不变，语句通顺
❌ 不能删除句子或改变原意

【严禁规则 - 必须遵守】
⛔⛔⛔ 替换词不能是任何禁用词列表中的词汇！
⛔⛔⛔ 如果给出的备选词也是禁用词，必须换一个词！
⛔⛔⛔ 禁用词包括但不限于：${allBannedContents.slice(0, 20).join('、')}

【重要提示】
⚠️ 替换时直接使用替换词本身，不要在输出中添加任何说明文字

【保护规则】
⛔ 引用内容、专有名词、历史术语、【Q0】等占位符不可修改
`;
}

/**
 * 句子逻辑禁用库指令（智能版 - 支持模糊识别）
 */
export function buildSentencePatternsPrompt(
  sentencePatterns: Array<{ content: string; replacements?: string[]; replacement?: string; reason: string }>,
  classicalRatio: number = 20
): string {
  if (!sentencePatterns || sentencePatterns.length === 0) return "";
  
  // 导入同义映射获取文言替换建议
  const { findRelatedMappings, getClassicalReplacements } = require('./synonym-mappings');
  
  // 扩展模式，添加变体和文言建议
  const expandedPatterns = sentencePatterns.slice(0, 30).map(item => {
    const opts = item.replacements?.length 
      ? item.replacements 
      : item.replacement 
        ? [item.replacement] 
        : [];
    
    // 获取同义映射
    const relatedMappings = findRelatedMappings(item.content);
    
    // 获取文言替换建议
    const classicalOpts = getClassicalReplacements(item.content);
    
    // 合并所有替换选项
    const allOpts = [...new Set([...opts, ...classicalOpts])];
    
    // 构建变体提示
    let variantHint = '';
    if (relatedMappings.length > 0) {
      const variants = relatedMappings.flatMap((m: any) => m.variants).filter((v: string) => v !== item.content);
      if (variants.length > 0) {
        variantHint = `\n  ⚠ 变体识别: ${variants.slice(0, 5).join('、')}`;
      }
    }
    
    let line = `- ${item.content}`;
    if (allOpts.length > 0) {
      line += ` → [${allOpts.slice(0, 5).join(' / ')}]`;
    }
    
    return line + variantHint;
  }).join('\n');
  
  // 根据文言化程度选择风格
  const styleGuide = classicalRatio <= 30 
    ? "现代白话风格替换" 
    : classicalRatio <= 60 
    ? "文白参半，可用古雅表达" 
    : "文言风格替换优先";
  
  return `【句式逻辑净化】${sentencePatterns.length} 条，${styleGuide}

【禁用表述及替换建议】（含变体识别）
${expandedPatterns}

【核心原则】
✅ 有多个替换建议 → 根据上下文选择最合适的一个
✅ 发现变体形式 → 同样需要替换（如"不但...而且"等同"不仅...而且"）
✅ 替换后语句通顺 → 执行替换
❌ 替换会改变原意 → 保留原句

【重要提示】
⚠️ 替换时直接使用替换词本身，不要在输出中添加任何说明文字（如"逗号"、"句号"等）

【文言替换速查】
- 进递: 既...又...、非独...亦...、不特...且...
- 转折: 虽...然...、纵...亦...、然、顾
- 因果: 以...故...、因...遂...、故、是以
- 总结: 要之、总之、统而言之
- 强调: 诚、实、确、洵、良
- 过渡: 易言之、质言之、即、盖

【保护规则】
⛔ 引用内容、专有名词、【Q0】等占位符不可修改
`;
}

/**
 * 梗融合指令
 */
export function buildMemeFusePrompt(memes: any[], ratio: number, satire: boolean): string {
  const items = toResourceItems(memes, 'meme');
  if (items.length === 0) return "";
  
  const compressed = compressMemes(memes);
  
  return `【梗融合】${satire ? '反讽优先' : '自然融合'}
【梗资源】
${compressed}

【执行原则】
✅ 语境契合 → 可融合
❌ 生硬突兀 → 不融合

【保护规则】
⛔ 引用内容、专有名词、【Q0】等占位符不可修改
`;
}

/**
 * 风格熔铸指令
 */
export function buildStyleForgePrompt(): string {
  return `【风格熔铸】
【执行要求】
1. 统一比喻风格
2. 植入细节描写
3. 增强文本文学质感
`;
}

// ============================================================================
// 后处理阶段指令
// ============================================================================

/**
 * Markdown 语法净化指令
 * 清理 LLM 输出中的原始 Markdown 语法
 */
export function buildMarkdownCleanPrompt(): string {
  return `【格式净化】清理 Markdown 语法
【必须清理的格式】
1. **加粗** → 移除 ** 符号，保留内容
   例：**重要** → 重要

2. *斜体* 或 _斜体_ → 移除符号，保留内容
   例：*强调* → 强调

3. ~~删除线~~ → 移除 ~~ 符号，保留内容
   例：~~错误~~ → 错误

4. # 标题 → 移除 # 符号
   例：## 章节 → 章节

5. > 引用块 → 移除 > 符号
   例：> 引用内容 → 引用内容

6. - 列表 → 移除 - 符号
   例：- 项目 → 项目

7. \`代码\` → 移除反引号
   例：\`代码\` → 代码

【执行原则】
只清理格式符号，保留所有文字内容
输出纯净的文本，不包含任何 Markdown 语法
`;
}

// ============================================================================
// 审稿验证阶段指令
// ============================================================================

/**
 * 语义检查指令
 */
export function buildSemanticCheckPrompt(): string {
  return `【语义检查】
【检查项】
1. 原文语义是否完整保留？
2. 是否有歧义？
3. 逻辑是否自洽？

【发现问题必须修正】
`;
}

/**
 * 综合审稿指令
 */
export function buildFinalReviewPrompt(): string {
  return `【综合审稿】
【检查项】
1. □ 引用内容是否完整保留？
2. □ 专有名词是否正确？
3. □ 禁用词是否都已处理？
4. □ 语义是否改变？
5. □ 风格是否统一？
6. □ 标点规范是否执行？
7. □ 是否有 Markdown 语法残留？

【发现问题必须修正】
`;
}

/**
 * 用词审查指令
 */
export function buildWordUsageCheckPrompt(): string {
  return `【用词审查】检查替换产生的错误
【检查重点】
1. 用词不当：替换词与语境不匹配
2. 语义错配：替换后语义偏移
3. 逻辑断裂：因果关系被破坏

【常见错误示例】
- "目光如日月" → 错误（"日月"不能形容目光）
- "问题很江河" → 错误（"江河"不能作形容词）

【输出格式】
【用词问题】
1. 第X句"XXX"中的"YYY"用词不当，建议修改为"ZZZ"
...
或：无问题
`;
}

/**
 * 智能微调指令
 */
export function buildSmartFixPrompt(): string {
  return `【智能微调】修正用词错误
【修正原则】
1. 语义优先：准确表达原意
2. 风格统一：与全文风格一致
3. 自然流畅：读起来通顺
4. 最小改动：只修改有问题的地方

【保护规则】
⛔ 引用内容、专有名词、历史术语不可修改

【执行要求】
直接在正文中修正，修改后为最终输出
`;
}

/**
 * 呼吸感分段指令
 */
export function buildBreathSegmentPrompt(): string {
  return `【呼吸感分段】
【执行要求】
1. 按朗读节奏调整段落分段
2. 不改变内容，只调整分段
3. 确保每段长度适中
`;
}

/**
 * 标题提取指令
 * 识别并提取文本标题，分开输出标题和正文
 */
export function buildTitleExtractPrompt(): string {
  return `【标题提取】
【执行要求】
1. 识别文本的第一行或明显的标题行
2. 如果存在标题，将其与正文分开
3. 标题格式：独立成行，简洁明了
4. 正文从第二行开始

【识别规则】
- 第一行如果较短（<30字）且独立成段，可能是标题
- 包含"记"、"传"、"论"等字样的可能是标题
- 书名号《》包裹的可能是标题
- 如果没有明显标题，保持原样

【输出格式】
如果有标题：
【标题】xxx
【正文】xxx

如果没有标题：
直接输出原文
`;
}

// ============================================================================
// 步骤指令构建器映射（完整版：21 个步骤）
// ============================================================================

export const STEP_PROMPT_BUILDERS: Record<string, (settings: HistoricalNarrativeSettings, resources?: any) => string> = {
  // 前置配置阶段（8个）
  narrativePerspective: (settings) => buildNarrativePerspectivePrompt(settings.narrativePerspective || 'limited-omniscient'),
  classicalApply: (settings) => buildClassicalApplyPrompt(settings.classicalRatio),
  citationApply: (settings) => buildCitationApplyPrompt(30, settings.literatureResources),
  particleApply: (settings) => buildParticleApplyPrompt(settings.particleSettings),
  punctuationApply: (settings) => buildPunctuationApplyPrompt(settings.punctuation),
  
  // 核心处理阶段（5个）
  polish: (settings) => buildPolishPrompt(settings.vocabulary || [], settings.classicalRatio),
  bannedWords: (settings) => buildBannedWordsPrompt(settings.bannedWords || [], settings.replacementStyle, settings.classicalRatio),
  sentencePatterns: (settings) => buildSentencePatternsPrompt(settings.sentencePatterns || []),
  memeFuse: (settings) => buildMemeFusePrompt(settings.memes || [], 10, settings.subOptions?.memeSatire ?? false),
  styleForge: () => buildStyleForgePrompt(),
  
  // 后处理阶段（2个）
  markdownClean: () => buildMarkdownCleanPrompt(),
  titleExtract: () => buildTitleExtractPrompt(),
  
  // 审稿验证阶段（5个）
  semanticCheck: () => buildSemanticCheckPrompt(),
  finalReview: () => buildFinalReviewPrompt(),
  wordUsageCheck: () => buildWordUsageCheckPrompt(),
  smartFix: () => buildSmartFixPrompt(),
  breathSegment: () => buildBreathSegmentPrompt(),
};
