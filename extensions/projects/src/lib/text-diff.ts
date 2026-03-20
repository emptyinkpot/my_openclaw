/**
 * 文本差异对比工具
 * 用于生成润色前后的替换记录
 * 
 * 优化日志：
 * - 增加步骤执行记录
 * - 增加详细的替换原因分类
 * - 支持多阶段替换追踪
 */

export interface Replacement {
  original: string;
  replaced: string;
  reason: string;
}

/** 步骤执行记录 */
export interface StepExecutionRecord {
  stepId: string;
  stepName: string;
  executed: boolean;
  details: string;
  replacements: Replacement[];
  stats?: {
    matched?: number;
    replaced?: number;
    skipped?: number;
  };
}

/** 处理报告 */
export interface ProcessingReport {
  stepRecords: StepExecutionRecord[];
  totalReplacements: number;
  summary: string;
}

/**
 * 比较两个文本，生成替换记录
 * 使用简单的滑动窗口算法匹配差异
 */
export function generateReplacements(
  originalText: string,
  polishedText: string,
  maxReplacements: number = 50
): Replacement[] {
  const replacements: Replacement[] = [];
  
  // 预处理：移除空白差异
  const normalizeText = (text: string) => 
    text.replace(/\s+/g, ' ').trim();
  
  const original = normalizeText(originalText);
  const polished = normalizeText(polishedText);
  
  // 如果文本完全相同，返回空数组
  if (original === polished) {
    return [];
  }
  
  // 按句子分割
  const originalSentences = splitIntoSentences(original);
  const polishedSentences = splitIntoSentences(polished);
  
  // 逐句比较
  const maxLen = Math.max(originalSentences.length, polishedSentences.length);
  
  for (let i = 0; i < maxLen && replacements.length < maxReplacements; i++) {
    const origSentence = originalSentences[i] || '';
    const polishedSentence = polishedSentences[i] || '';
    
    if (origSentence !== polishedSentence && origSentence && polishedSentence) {
      // 找出句子中的具体差异
      const sentenceDiffs = findWordDifferences(origSentence, polishedSentence);
      replacements.push(...sentenceDiffs);
    }
  }
  
  // 去重并限制数量
  const uniqueReplacements = deduplicateReplacements(replacements);
  return uniqueReplacements.slice(0, maxReplacements);
}

/**
 * 将文本分割成句子
 */
function splitIntoSentences(text: string): string[] {
  // 中文和英文句子分隔符
  return text
    .split(/(?<=[。！？!?.\n])/g)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * 找出两个句子中的词级别差异
 */
function findWordDifferences(
  originalSentence: string,
  polishedSentence: string,
  minWordLength: number = 2
): Replacement[] {
  const replacements: Replacement[] = [];
  
  // 提取词汇（中文词汇和英文单词）
  const extractWords = (text: string): string[] => {
    const words: string[] = [];
    // 匹配中文词汇（2-6个字）和英文单词
    const regex = /[\u4e00-\u9fa5]{2,6}|[a-zA-Z]{2,}/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      words.push(match[0]);
    }
    return words;
  };
  
  const originalWords = new Set(extractWords(originalSentence));
  const polishedWords = new Set(extractWords(polishedSentence));
  
  // 找出被替换的词（存在于原文但不存在于润色后的词）
  for (const word of originalWords) {
    if (!polishedWords.has(word) && word.length >= minWordLength) {
      // 尝试找到对应的替换词
      const replacement = findReplacement(word, originalSentence, polishedSentence);
      if (replacement) {
        replacements.push({
          original: word,
          replaced: replacement,
          reason: '词汇替换'
        });
      }
    }
  }
  
  return replacements;
}

/**
 * 尝试在润色后的句子中找到原词的替换词
 */
function findReplacement(
  originalWord: string,
  originalSentence: string,
  polishedSentence: string
): string | null {
  // 获取原词在原句中的位置
  const origIndex = originalSentence.indexOf(originalWord);
  if (origIndex === -1) return null;
  
  // 获取原词周围的上下文
  const contextBefore = originalSentence.substring(Math.max(0, origIndex - 10), origIndex);
  const contextAfter = originalSentence.substring(
    origIndex + originalWord.length, 
    Math.min(originalSentence.length, origIndex + originalWord.length + 10)
  );
  
  // 在润色后的句子中查找相似的上下文
  const polishedIndex = polishedSentence.indexOf(contextBefore);
  if (polishedIndex !== -1) {
    // 找到上下文，提取可能的替换词
    const startIdx = polishedIndex + contextBefore.length;
    const endContextIdx = polishedSentence.indexOf(contextAfter, startIdx);
    
    if (endContextIdx !== -1 && endContextIdx > startIdx) {
      const possibleReplacement = polishedSentence.substring(startIdx, endContextIdx);
      // 验证是否是有效的替换词
      if (possibleReplacement.length >= 2 && possibleReplacement.length <= 10) {
        return possibleReplacement;
      }
    }
  }
  
  // 如果上下文匹配失败，使用简单的相似度匹配
  const extractWords = (text: string): string[] => {
    const words: string[] = [];
    const regex = /[\u4e00-\u9fa5]{2,6}|[a-zA-Z]{2,}/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      words.push(match[0]);
    }
    return words;
  };
  
  const polishedWords = extractWords(polishedSentence);
  
  // 找到长度相近的新词
  for (const word of polishedWords) {
    if (word.length >= originalWord.length - 2 && 
        word.length <= originalWord.length + 2 &&
        word !== originalWord) {
      return word;
    }
  }
  
  return null;
}

/**
 * 去重替换记录
 */
function deduplicateReplacements(replacements: Replacement[]): Replacement[] {
  const seen = new Map<string, Replacement>();
  
  for (const r of replacements) {
    const key = `${r.original}->${r.replaced}`;
    if (!seen.has(key)) {
      seen.set(key, r);
    }
  }
  
  return Array.from(seen.values());
}

/**
 * 更精细的差异分析（用于更复杂的场景）
 */
export function analyzeDetailedChanges(
  originalText: string,
  polishedText: string,
  vocabularyList?: string[],
  bannedWordsList?: string[]
): {
  vocabularyReplacements: Replacement[];
  bannedWordReplacements: Replacement[];
  otherChanges: Replacement[];
  stepRecords: StepExecutionRecord[];
  summary: string;
} {
  const allReplacements = generateReplacements(originalText, polishedText);
  
  const vocabularyReplacements: Replacement[] = [];
  const bannedWordReplacements: Replacement[] = [];
  const otherChanges: Replacement[] = [];
  
  const vocabSet = new Set(vocabularyList || []);
  const bannedSet = new Set(bannedWordsList || []);
  
  for (const r of allReplacements) {
    // 词汇库存储的是"高级词汇"（替换后的词）
    // 检查 replaced 中是否包含词汇库中的词
    const containsVocabWord = Array.from(vocabSet).some(vocab => 
      r.replaced.includes(vocab) || vocab.includes(r.replaced)
    );
    
    // 禁用词存储的是"要禁用的词"（原词）
    // 检查 original 中是否包含禁用词
    const containsBannedWord = Array.from(bannedSet).some(banned => 
      r.original.includes(banned) || banned.includes(r.original)
    );
    
    if (containsVocabWord) {
      vocabularyReplacements.push({ ...r, reason: '词汇库替换' });
    } else if (containsBannedWord) {
      bannedWordReplacements.push({ ...r, reason: '禁用词替换' });
    } else {
      otherChanges.push({ ...r, reason: '风格调整' });
    }
  }
  
  // 生成步骤执行记录
  const stepRecords: StepExecutionRecord[] = [];
  
  // 词汇润色记录
  if (vocabularyList && vocabularyList.length > 0) {
    stepRecords.push({
      stepId: 'polish',
      stepName: '词汇润色',
      executed: vocabularyReplacements.length > 0,
      details: vocabularyReplacements.length > 0 
        ? `应用 ${vocabularyReplacements.length} 条词汇库替换`
        : `未匹配到词汇库中的词汇`,
      replacements: vocabularyReplacements,
      stats: {
        matched: vocabularyReplacements.length,
        replaced: vocabularyReplacements.length,
      }
    });
  }
  
  // 禁用词净化记录
  if (bannedWordsList && bannedWordsList.length > 0) {
    stepRecords.push({
      stepId: 'bannedWords',
      stepName: '禁用词净化',
      executed: bannedWordReplacements.length > 0,
      details: bannedWordReplacements.length > 0
        ? `清除 ${bannedWordReplacements.length} 条禁用词`
        : `未发现禁用词`,
      replacements: bannedWordReplacements,
      stats: {
        matched: bannedWordReplacements.length,
        replaced: bannedWordReplacements.length,
      }
    });
  }
  
  // 其他修改记录
  if (otherChanges.length > 0) {
    stepRecords.push({
      stepId: 'other',
      stepName: '风格调整',
      executed: true,
      details: `应用 ${otherChanges.length} 处风格调整`,
      replacements: otherChanges.slice(0, 10), // 只显示前10条
      stats: {
        replaced: otherChanges.length,
      }
    });
  }
  
  // 生成摘要
  const summaryParts: string[] = [];
  if (vocabularyReplacements.length > 0) {
    summaryParts.push(`词汇库替换: ${vocabularyReplacements.length} 处`);
  }
  if (bannedWordReplacements.length > 0) {
    summaryParts.push(`禁用词替换: ${bannedWordReplacements.length} 处`);
  }
  if (otherChanges.length > 0) {
    summaryParts.push(`风格调整: ${otherChanges.length} 处`);
  }
  
  const summary = summaryParts.length > 0 
    ? `共修改 ${allReplacements.length} 处\n${summaryParts.join('\n')}`
    : '无修改';
  
  return {
    vocabularyReplacements,
    bannedWordReplacements,
    otherChanges,
    stepRecords,
    summary,
  };
}

/**
 * 生成简洁的替换摘要（用于进度显示）
 */
export function generateReplacementSummary(
  originalText: string,
  polishedText: string
): { changed: boolean; count: number; preview: string } {
  const replacements = generateReplacements(originalText, polishedText, 5);
  
  if (replacements.length === 0) {
    return { changed: false, count: 0, preview: '无变化' };
  }
  
  const preview = replacements
    .slice(0, 3)
    .map(r => `"${r.original}"→"${r.replaced}"`)
    .join('、');
  
  return {
    changed: true,
    count: replacements.length,
    preview: preview + (replacements.length > 3 ? '...' : '')
  };
}
