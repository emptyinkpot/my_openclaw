/**
 * ============================================================================
 * 文本处理辅助函数（循环检查、词汇验证）
 * ============================================================================
 * 
 * 核心功能：
 * 1. 词汇使用验证 - 检查词汇库使用率，智能补充替换
 * 2. 禁用词循环检查 - 确保全部清理
 * 
 * 设计理念：
 * - 动态建立"普通表达→高级词汇"映射
 * - AI智能分析原文，找出可替换的位置
 * - 提高词汇命中率
 * 
 * 优化日志：
 * - 2024: 降低词汇验证阈值，提高命中率
 * - 2024: 优化禁用词循环检查效率
 */

import type { LLMClient } from 'coze-coding-dev-sdk';
import { invokeLLM } from './llm-client';
import { 
  extractContents, 
  checkVocabularyUsage, 
  checkBannedWords, 
  sampleItems 
} from './text-checker';

/** 进度回调 */
type ProgressCallback = (progress: number, message: string) => void;

/** 词汇验证结果 */
export interface VocabularyCheckResult {
  text: string;
  usedCount: number;
  totalCount: number;
  rate: number;
}

/** 禁用词检查结果 */
export interface BannedWordsCheckResult {
  text: string;
  loopCount: number;
  remainingCount: number;
}

/** 词汇使用率阈值（低于此值触发补充处理） */
const VOCAB_USAGE_THRESHOLD = 15; // 从 10% 提高到 15%，更积极地补充

/** 最大循环检查次数 */
const MAX_BANNED_WORDS_LOOPS = 3;

/** 安全处理阈值 - 超过此长度跳过 LLM 处理（避免截断） */
const SAFE_PROCESSING_THRESHOLD = 1500;

/**
 * 词汇使用验证（智能匹配替换）
 * 
 * 核心改进：
 * 1. 让AI分析用户词汇，建立"普通表达→高级词汇"的动态映射
 * 2. 智能扫描原文，找出可以替换的位置
 * 3. 提高词汇命中率
 * 
 * 优化：
 * - 降低触发阈值，更积极地补充
 * - 增加详细日志
 */
export async function verifyVocabularyUsage(
  text: string,
  vocabulary: any[],
  llmClient: LLMClient,
  model: string,
  onProgress: ProgressCallback
): Promise<VocabularyCheckResult> {
  const vocabWords = extractContents(vocabulary);
  if (vocabWords.length === 0) {
    console.log('[词汇验证] 词汇库为空，跳过验证');
    return { text, usedCount: 0, totalCount: 0, rate: 0 };
  }

  let { used, unused, rate } = checkVocabularyUsage(text, vocabWords);
  
  console.log(`[词汇验证] 初始状态: 使用 ${used.length}/${vocabWords.length} 条 (${rate.toFixed(1)}%)`);
  
  // 使用率低于阈值，尝试智能补充处理
  // 但是如果文本太长，跳过 LLM 处理（避免输出截断）
  if (rate < VOCAB_USAGE_THRESHOLD && vocabWords.length >= 3 && text.length <= SAFE_PROCESSING_THRESHOLD) {
    onProgress(78, `词汇使用率 ${rate.toFixed(1)}%，智能分析可替换位置...`);

    // 收集已使用的词汇作为风格样本
    const usedSamples = sampleItems(used, 10);
    const unusedSamples = sampleItems(unused, 30); // 增加样本数量
    
    // 保护引用内容和占位符
    const protectedText = text.replace(/【Q\d+】/g, (match) => `__QUOTE_${match.slice(2, -1)}__`);
    
    // 构建智能匹配Prompt - 更明确的指令
    const vocabPrompt = `你是文本润色专家。请严格执行词汇替换任务。

【已使用的高级词汇】（作为风格参考）
${usedSamples.length > 0 ? usedSamples.map(w => `- ${w}`).join('\n') : '（暂无）'}

【必须使用的未用词汇】
${unusedSamples.map(w => `- ${w}`).join('\n')}

【原文】
${protectedText}

【任务 - 必须执行】
1. 扫描原文，找出可以用"未用词汇"替换的位置
2. 建立映射：原文普通表达 → 高级词汇
3. 执行替换

【映射示例】
原文有"这个很重要" + 词汇库有"关键" → "这个很重要" → "这很关键"
原文有"改变" + 词汇库有"鼎革" → "改变现状" → "鼎革现状"

【执行原则】
✅ 找到对应普通表达 → 必须替换
✅ 替换后句子通顺 → 执行替换
❌ 找不到对应表达 → 保留原词
❌ 替换后不通顺 → 保留原词

【保护规则】
- __QUOTE_数字__ 格式的内容必须原样保留
- 专有名词、历史术语不要修改

【输出】
直接输出优化后的完整文本，不要解释。`;

    try {
      const result = await invokeLLM(llmClient, [{ role: "user", content: vocabPrompt }], { 
        model, 
        temperature: 0.2 
      });

      const optimizedText = result.trim();
      if (optimizedText && optimizedText.length > 50) {
        // 恢复占位符
        text = optimizedText.replace(/__QUOTE_(\d+)__/g, (match, num) => `【Q${num}】`);
        const recheck = checkVocabularyUsage(text, vocabWords);
        
        console.log(`[词汇验证] 使用率从 ${rate.toFixed(1)}% 提升到 ${recheck.rate.toFixed(1)}%`);
        
        used = recheck.used;
        rate = recheck.rate;
      }
    } catch (error) {
      console.error('[词汇验证] 处理失败:', error);
    }
  } else if (text.length > SAFE_PROCESSING_THRESHOLD) {
    console.log(`[词汇验证] 文本过长(${text.length}字符)，跳过 LLM 处理`);
  }

  onProgress(79, `词汇使用：${used.length}/${vocabWords.length} 条 (${rate.toFixed(1)}%)`);
  
  return { text, usedCount: used.length, totalCount: vocabWords.length, rate };
}

/**
 * 禁用词循环检查（确保全部清理）
 * 
 * 优化：
 * - 增加详细日志
 * - 改进 Prompt 指令
 */
export async function verifyBannedWordsClean(
  text: string,
  bannedWords: any[],
  llmClient: LLMClient,
  model: string,
  onProgress: ProgressCallback,
  maxLoops = MAX_BANNED_WORDS_LOOPS
): Promise<BannedWordsCheckResult> {
  const bannedWordList = extractContents(bannedWords);
  if (bannedWordList.length === 0) {
    console.log('[禁用词检查] 禁用词库为空，跳过检查');
    return { text, loopCount: 0, remainingCount: 0 };
  }

  let remaining = checkBannedWords(text, bannedWordList);
  let loopCount = 0;
  
  console.log(`[禁用词检查] 初始状态: 发现 ${remaining.length} 条禁用词残留`);

  // 如果文本太长，跳过 LLM 处理（避免输出截断）
  if (text.length > SAFE_PROCESSING_THRESHOLD) {
    console.log(`[禁用词检查] 文本过长(${text.length}字符)，跳过 LLM 处理`);
    onProgress(85, `文本较长，跳过验证步骤`);
    return { text, loopCount: 0, remainingCount: remaining.length };
  }

  while (remaining.length > 0 && loopCount < maxLoops) {
    loopCount++;
    onProgress(80 + loopCount * 3, `第${loopCount}轮检查：发现 ${remaining.length} 条禁用词残留，重新处理...`);
    
    console.log(`[禁用词检查] 第${loopCount}轮发现禁用词:`, remaining.slice(0, 10).join(', '));

    // 保护引用内容和占位符
    const protectedText = text.replace(/【Q\d+】/g, (match) => `__QUOTE_${match.slice(2, -1)}__`);

    // 更严格的清理指令
    const cleanupPrompt = `你是专业的文字编辑。以下文本中仍然包含禁用词，必须全部清除。

【禁用词列表 - 必须全部清除】
${remaining.map(w => `- "${w}"`).join('\n')}

【待清理文本】
${protectedText}

【任务 - 必须执行】
逐个检查禁用词列表，找出所有出现位置，逐一替换。

【替换规则】
1. 每个禁用词都必须被替换，不能遗漏
2. 根据上下文选择最自然的替换词
3. 替换后句子必须通顺，语义不变

【保护规则】
- __QUOTE_数字__ 格式的内容必须原样保留
- 专有名词不要修改

【输出】
直接输出清理后的完整文本，不要解释。`;

    try {
      const result = await invokeLLM(llmClient, [{ role: "user", content: cleanupPrompt }], { 
        model, 
        temperature: 0.2 
      });

      const cleanedText = result.trim();
      if (cleanedText && cleanedText.length > 50) {
        // 恢复占位符
        text = cleanedText.replace(/__QUOTE_(\d+)__/g, (match, num) => `【Q${num}】`);
      }
    } catch (error) {
      console.error(`[禁用词检查] 第${loopCount}轮处理失败:`, error);
    }

    remaining = checkBannedWords(text, bannedWordList);
  }

  if (remaining.length === 0) {
    onProgress(85, `禁用词清理完成，共${loopCount}轮`);
    console.log(`[禁用词检查] 完成，共${loopCount}轮清理`);
  } else {
    onProgress(85, `已处理${loopCount}轮，仍有${remaining.length}条禁用词可能需要手动处理`);
    console.log(`[禁用词检查] 达到最大循环次数，剩余:`, remaining);
  }

  return { text, loopCount, remainingCount: remaining.length };
}
