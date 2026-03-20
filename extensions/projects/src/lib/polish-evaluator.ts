/**
 * 文本润色效果评估工具
 * 用于比较润色前后的文本质量变化
 */

import { calculateSimilarity, extractKeywords } from './synonym-utils';
import { fullTextCheck, ErrorType } from './text-correction-utils';

// 评估维度
export interface EvaluationDimension {
  name: string;
  score: number;       // 0-100
  before: number;
  after: number;
  improvement: number; // 改进幅度（正数为改进，负数为退步）
  details: string;
}

// 评估结果
export interface PolishEvaluation {
  overallScore: number;         // 综合得分
  dimensions: EvaluationDimension[];
  summary: string;
  recommendations: string[];
}

// 文本统计信息
interface TextStatistics {
  charCount: number;
  wordCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  avgWordLength: number;
  punctuationCount: number;
  punctuationRatio: number;
  uniqueWords: number;
  vocabularyRichness: number;  // 词汇丰富度
  repeatedPhrases: number;
  readabilityScore: number;
}

/**
 * 计算文本统计信息
 */
function calculateStatistics(text: string): TextStatistics {
  // 字符统计
  const charCount = text.length;
  
  // 中文分词（简化版）
  const chineseWords = text.match(/[\u4e00-\u9fa5]+/g) || [];
  const englishWords = text.match(/[a-zA-Z]+/g) || [];
  const allWords = [...chineseWords, ...englishWords];
  const wordCount = allWords.length;
  
  // 句子统计
  const sentences = text.split(/[。！？；\n]+/).filter(s => s.trim().length > 0);
  const sentenceCount = sentences.length;
  
  // 平均句长
  const avgSentenceLength = sentenceCount > 0 ? charCount / sentenceCount : 0;
  
  // 平均词长
  const avgWordLength = wordCount > 0 
    ? allWords.reduce((sum, w) => sum + w.length, 0) / wordCount 
    : 0;
  
  // 标点统计
  const punctuationCount = (text.match(/[，。！？；：、""''（）【】《》]/g) || []).length;
  const punctuationRatio = charCount > 0 ? punctuationCount / charCount : 0;
  
  // 词汇丰富度
  const uniqueWords = new Set(allWords).size;
  const vocabularyRichness = wordCount > 0 ? uniqueWords / wordCount : 0;
  
  // 重复短语检测
  const repeatedPhrases = detectRepeatedPhrases(text);
  
  // 可读性评分（简化版）
  const readabilityScore = calculateReadabilityScore(text, {
    avgSentenceLength,
    vocabularyRichness,
    punctuationRatio,
  });
  
  return {
    charCount,
    wordCount,
    sentenceCount,
    avgSentenceLength,
    avgWordLength,
    punctuationCount,
    punctuationRatio,
    uniqueWords,
    vocabularyRichness,
    repeatedPhrases,
    readabilityScore,
  };
}

/**
 * 检测重复短语
 */
function detectRepeatedPhrases(text: string): number {
  // 检测连续3字以上的重复
  const phrases: Map<string, number> = new Map();
  const minLength = 3;
  
  for (let i = 0; i <= text.length - minLength; i++) {
    for (let len = minLength; len <= Math.min(10, text.length - i); len++) {
      const phrase = text.slice(i, i + len);
      if (/[\u4e00-\u9fa5]/.test(phrase)) {
        phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
      }
    }
  }
  
  // 统计重复次数超过2次的短语
  let repeatCount = 0;
  phrases.forEach((count) => {
    if (count > 2) repeatCount++;
  });
  
  return repeatCount;
}

/**
 * 计算可读性评分
 */
function calculateReadabilityScore(
  text: string,
  stats: Partial<TextStatistics>
): number {
  let score = 70; // 基础分
  
  // 句长评分（理想范围：15-30字）
  if (stats.avgSentenceLength) {
    if (stats.avgSentenceLength >= 15 && stats.avgSentenceLength <= 30) {
      score += 10;
    } else if (stats.avgSentenceLength < 10 || stats.avgSentenceLength > 50) {
      score -= 10;
    } else if (stats.avgSentenceLength < 15 || stats.avgSentenceLength > 30) {
      score -= 5;
    }
  }
  
  // 词汇丰富度评分
  if (stats.vocabularyRichness) {
    if (stats.vocabularyRichness > 0.7) {
      score += 10;
    } else if (stats.vocabularyRichness < 0.5) {
      score -= 5;
    }
  }
  
  // 标点密度评分
  if (stats.punctuationRatio) {
    if (stats.punctuationRatio >= 0.05 && stats.punctuationRatio <= 0.15) {
      score += 5;
    } else if (stats.punctuationRatio < 0.03 || stats.punctuationRatio > 0.2) {
      score -= 5;
    }
  }
  
  // 确保分数在0-100范围内
  return Math.max(0, Math.min(100, score));
}

/**
 * 计算AI特征分数
 */
function calculateAIFeatures(text: string): {
  aiScore: number;
  features: Record<string, number>;
} {
  // 基于多个特征计算AI生成概率
  const features: Record<string, number> = {};
  
  // 1. 句式重复度
  const sentences = text.split(/[。！？；\n]+/).filter(s => s.trim().length > 0);
  if (sentences.length > 1) {
    let similaritySum = 0;
    let count = 0;
    for (let i = 0; i < sentences.length - 1; i++) {
      for (let j = i + 1; j < sentences.length; j++) {
        similaritySum += calculateSimilarity(sentences[i], sentences[j]);
        count++;
      }
    }
    features.sentenceSimilarity = count > 0 ? similaritySum / count : 0;
  } else {
    features.sentenceSimilarity = 0;
  }
  
  // 2. 常见AI用词
  const aiWords = [
    '综上所述', '总而言之', '因此', '值得注意的是', '需要指出的是',
    '首先', '其次', '再次', '最后', '一方面', '另一方面',
    '总的来说', '由此可见', '综上所述', '事实上', '实际上',
    '不可否认', '毋庸置疑', '显而易见', '众所周知', '一般认为',
  ];
  const aiWordCount = aiWords.filter(word => text.includes(word)).length;
  features.aiWordRatio = aiWordCount / Math.max(1, sentences.length);
  
  // 3. 句子长度分布
  const sentenceLengths = sentences.map(s => s.length);
  const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / Math.max(1, sentenceLengths.length);
  const variance = sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / Math.max(1, sentenceLengths.length);
  features.lengthVariance = Math.sqrt(variance) / avgLength; // 变异系数
  
  // 4. 情感词密度
  const emotionWords = [
    '好', '坏', '美', '丑', '善', '恶', '爱', '恨', '喜', '怒',
    '哀', '乐', '惊', '恐', '忧', '思', '悲', '恐', '怒',
  ];
  const emotionCount = emotionWords.filter(word => text.includes(word)).length;
  features.emotionDensity = emotionCount / Math.max(1, text.length) * 100;
  
  // 5. 连接词密度
  const conjunctions = ['但是', '然而', '而且', '因此', '所以', '因为', '虽然', '如果', '但是', '不过'];
  const conjunctionCount = conjunctions.filter(word => text.includes(word)).length;
  features.conjunctionDensity = conjunctionCount / Math.max(1, sentences.length);
  
  // 综合计算AI分数
  // 低变异系数、高AI用词、低情感密度 = 更像AI
  let aiScore = 30; // 基础分
  aiScore += features.sentenceSimilarity * 20;  // 句式相似度高 -> AI
  aiScore += features.aiWordRatio * 30;         // AI用词多 -> AI
  aiScore -= features.lengthVariance * 20;      // 长度变异小 -> AI
  aiScore -= features.emotionDensity * 10;      // 情感词少 -> AI
  
  return {
    aiScore: Math.max(0, Math.min(100, aiScore)),
    features,
  };
}

/**
 * 评估润色效果
 */
export function evaluatePolish(
  originalText: string,
  polishedText: string
): PolishEvaluation {
  const dimensions: EvaluationDimension[] = [];
  
  // 1. 文本相似度评估
  const similarity = calculateSimilarity(originalText, polishedText);
  dimensions.push({
    name: '语义保持',
    score: similarity * 100,
    before: 100,
    after: similarity * 100,
    improvement: (similarity - 1) * 100,
    details: similarity > 0.8 
      ? '润色后文本较好地保持了原文语义'
      : '润色后文本与原文差异较大，建议检查',
  });
  
  // 2. 错误纠正评估
  const originalErrors = fullTextCheck(originalText);
  const polishedErrors = fullTextCheck(polishedText);
  const errorReduction = originalErrors.statistics.totalErrors - polishedErrors.statistics.totalErrors;
  const errorScore = Math.max(0, 100 - polishedErrors.statistics.totalErrors * 10);
  
  dimensions.push({
    name: '错误纠正',
    score: errorScore,
    before: Math.max(0, 100 - originalErrors.statistics.totalErrors * 10),
    after: errorScore,
    improvement: errorReduction * 10,
    details: errorReduction > 0 
      ? `纠错 ${errorReduction} 处错误`
      : errorReduction < 0 
        ? `新增 ${-errorReduction} 处问题`
        : '错误数量无变化',
  });
  
  // 3. 可读性评估
  const originalStats = calculateStatistics(originalText);
  const polishedStats = calculateStatistics(polishedText);
  
  dimensions.push({
    name: '可读性',
    score: polishedStats.readabilityScore,
    before: originalStats.readabilityScore,
    after: polishedStats.readabilityScore,
    improvement: polishedStats.readabilityScore - originalStats.readabilityScore,
    details: polishedStats.readabilityScore >= 80 
      ? '文本可读性良好'
      : polishedStats.readabilityScore >= 60 
        ? '文本可读性一般'
        : '文本可读性较差',
  });
  
  // 4. 词汇丰富度评估
  dimensions.push({
    name: '词汇丰富度',
    score: polishedStats.vocabularyRichness * 100,
    before: originalStats.vocabularyRichness * 100,
    after: polishedStats.vocabularyRichness * 100,
    improvement: (polishedStats.vocabularyRichness - originalStats.vocabularyRichness) * 100,
    details: polishedStats.vocabularyRichness > 0.7 
      ? '词汇丰富，表达多样'
      : polishedStats.vocabularyRichness > 0.5 
        ? '词汇丰富度适中'
        : '词汇重复较多，建议丰富表达',
  });
  
  // 5. AI特征评估
  const originalAI = calculateAIFeatures(originalText);
  const polishedAI = calculateAIFeatures(polishedText);
  const aiReduction = originalAI.aiScore - polishedAI.aiScore;
  
  dimensions.push({
    name: '人性化程度',
    score: 100 - polishedAI.aiScore,
    before: 100 - originalAI.aiScore,
    after: 100 - polishedAI.aiScore,
    improvement: aiReduction,
    details: aiReduction > 10 
      ? '显著降低AI痕迹'
      : aiReduction > 0 
        ? '一定程度上降低AI痕迹'
        : aiReduction < -10 
          ? 'AI痕迹增加明显'
          : 'AI痕迹变化不大',
  });
  
  // 6. 结构优化评估
  const structureScore = evaluateStructure(originalText, polishedText);
  dimensions.push(structureScore);
  
  // 计算综合得分
  const weights = {
    '语义保持': 0.2,
    '错误纠正': 0.15,
    '可读性': 0.2,
    '词汇丰富度': 0.15,
    '人性化程度': 0.15,
    '结构优化': 0.15,
  };
  
  const overallScore = dimensions.reduce((sum, dim) => {
    return sum + dim.score * weights[dim.name as keyof typeof weights];
  }, 0);
  
  // 生成总结
  const summary = generateSummary(dimensions, overallScore);
  
  // 生成建议
  const recommendations = generateRecommendations(dimensions);
  
  return {
    overallScore: Math.round(overallScore),
    dimensions,
    summary,
    recommendations,
  };
}

/**
 * 评估文本结构
 */
function evaluateStructure(
  originalText: string,
  polishedText: string
): EvaluationDimension {
  const originalSentences = originalText.split(/[。！？；\n]+/).filter(s => s.trim().length > 0);
  const polishedSentences = polishedText.split(/[。！？；\n]+/).filter(s => s.trim().length > 0);
  
  // 段落结构
  const originalParagraphs = originalText.split(/\n\n+/).filter(p => p.trim().length > 0);
  const polishedParagraphs = polishedText.split(/\n\n+/).filter(p => p.trim().length > 0);
  
  // 句长分布
  const originalLengths = originalSentences.map(s => s.length);
  const polishedLengths = polishedSentences.map(s => s.length);
  
  const originalAvgLength = originalLengths.reduce((a, b) => a + b, 0) / Math.max(1, originalLengths.length);
  const polishedAvgLength = polishedLengths.reduce((a, b) => a + b, 0) / Math.max(1, polishedLengths.length);
  
  // 计算结构评分
  let score = 70;
  
  // 句长合理性（15-35字为佳）
  if (polishedAvgLength >= 15 && polishedAvgLength <= 35) {
    score += 10;
  } else if (polishedAvgLength < 10 || polishedAvgLength > 50) {
    score -= 10;
  }
  
  // 段落数量变化
  const paragraphChange = polishedParagraphs.length - originalParagraphs.length;
  if (paragraphChange > 0 && polishedParagraphs.length >= 2) {
    score += 5; // 适当分段有加分
  }
  
  // 句式多样性（通过句长变异系数衡量）
  const avgLen = polishedAvgLength;
  const variance = polishedLengths.reduce((sum, len) => sum + Math.pow(len - avgLen, 2), 0) / Math.max(1, polishedLengths.length);
  const cv = Math.sqrt(variance) / avgLen;
  
  if (cv >= 0.3 && cv <= 0.6) {
    score += 10; // 句式有变化但不极端
  } else if (cv < 0.2) {
    score -= 5; // 句式过于单一
  }
  
  return {
    name: '结构优化',
    score: Math.max(0, Math.min(100, score)),
    before: calculateStructureScore(originalLengths, originalParagraphs.length),
    after: score,
    improvement: score - calculateStructureScore(originalLengths, originalParagraphs.length),
    details: `平均句长 ${Math.round(polishedAvgLength)} 字，共 ${polishedSentences.length} 句，${polishedParagraphs.length} 段`,
  };
}

/**
 * 计算结构得分
 */
function calculateStructureScore(lengths: number[], paragraphCount: number): number {
  const avgLength = lengths.reduce((a, b) => a + b, 0) / Math.max(1, lengths.length);
  let score = 70;
  
  if (avgLength >= 15 && avgLength <= 35) {
    score += 10;
  }
  if (paragraphCount >= 2) {
    score += 5;
  }
  
  return score;
}

/**
 * 生成评估总结
 */
function generateSummary(
  dimensions: EvaluationDimension[],
  overallScore: number
): string {
  const improvements = dimensions.filter(d => d.improvement > 0);
  const declines = dimensions.filter(d => d.improvement < 0);
  
  let summary = `综合评分：${Math.round(overallScore)} 分\n`;
  
  if (improvements.length > 0) {
    summary += `\n✅ 改进方面：${improvements.map(d => d.name).join('、')}`;
  }
  
  if (declines.length > 0) {
    summary += `\n⚠️ 需关注：${declines.map(d => `${d.name}(${d.improvement > -5 ? '轻微' : '明显'}下降)`).join('、')}`;
  }
  
  return summary;
}

/**
 * 生成优化建议
 */
function generateRecommendations(dimensions: EvaluationDimension[]): string[] {
  const recommendations: string[] = [];
  
  for (const dim of dimensions) {
    if (dim.score < 60) {
      switch (dim.name) {
        case '语义保持':
          recommendations.push('建议检查润色内容，确保核心观点未丢失');
          break;
        case '错误纠正':
          recommendations.push('建议进行拼写检查和语法校对');
          break;
        case '可读性':
          recommendations.push('建议调整句子长度，避免过长或过短的句子');
          break;
        case '词汇丰富度':
          recommendations.push('建议使用同义词替换部分重复词汇');
          break;
        case '人性化程度':
          recommendations.push('建议增加个人观点、情感表达，减少模式化用语');
          break;
        case '结构优化':
          recommendations.push('建议调整段落结构，使文章层次更分明');
          break;
      }
    } else if (dim.score < 75) {
      switch (dim.name) {
        case '语义保持':
          recommendations.push('润色后语义基本保持，但部分细节有变化');
          break;
        case '词汇丰富度':
          recommendations.push('可考虑适当使用同义词丰富表达');
          break;
        case '人性化程度':
          recommendations.push('可适当增加个性化表达');
          break;
      }
    }
  }
  
  return recommendations;
}

/**
 * 对比展示
 */
export function generateComparison(
  originalText: string,
  polishedText: string,
  evaluation: PolishEvaluation
): string {
  let output = '📊 润色效果评估报告\n';
  output += '━━━━━━━━━━━━━━━━━━━━\n\n';
  
  // 维度得分
  output += '【各项指标】\n';
  for (const dim of evaluation.dimensions) {
    const trend = dim.improvement > 5 ? '↑' : dim.improvement < -5 ? '↓' : '→';
    output += `${dim.name}: ${Math.round(dim.score)}分 ${trend}\n`;
    output += `  ${dim.details}\n`;
  }
  
  output += '\n━━━━━━━━━━━━━━━━━━━━\n';
  output += `综合评分: ${evaluation.overallScore} 分\n\n`;
  
  // 总结
  output += '【评估总结】\n';
  output += evaluation.summary + '\n';
  
  // 建议
  if (evaluation.recommendations.length > 0) {
    output += '\n【优化建议】\n';
    evaluation.recommendations.forEach((rec, i) => {
      output += `${i + 1}. ${rec}\n`;
    });
  }
  
  return output;
}

export default {
  evaluatePolish,
  generateComparison,
  calculateStatistics,
  calculateAIFeatures,
};
