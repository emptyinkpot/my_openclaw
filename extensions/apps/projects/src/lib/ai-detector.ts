/**
 * ============================================================================
 * 自定义 AI 检测模型设计文档
 * ============================================================================
 * 
 * 目标：构建一个能够区分人类写作和AI生成文本的检测系统
 * 
 * 架构概览：
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                        数据层                                    │
 * │  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐     │
 * │  │人类文本库│   │AI文本库  │   │标注数据  │   │用户反馈  │     │
 * │  └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘     │
 * └───────┼──────────────┼──────────────┼──────────────┼───────────┘
 *         │              │              │              │
 *         v              v              v              v
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                     特征提取层                                   │
 * │  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐     │
 * │  │词汇特征  │   │句法特征  │   │风格特征  │   │统计特征  │     │
 * │  │TF-IDF   │   │依存分析  │   │风格向量  │   │熵值/困惑度│    │
 * │  └──────────┘   └──────────┘   └──────────┘   └──────────┘     │
 * └─────────────────────────────────────────────────────────────────┘
 *         │
 *         v
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                       模型层                                     │
 * │  ┌──────────────────────────────────────────────────────────┐  │
 * │  │            集成分类器（Ensemble Classifier）              │  │
 * │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │  │
 * │  │  │XGBoost  │  │  SVM    │  │  CNN    │  │BiLSTM   │    │  │
 * │  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘    │  │
 * │  │       │            │            │            │          │  │
 * │  │       └────────────┴────────────┴────────────┘          │  │
 * │  │                         │                                │  │
 * │  │                    投票/加权                             │  │
 * │  └──────────────────────────────────────────────────────────┘  │
 * └─────────────────────────────────────────────────────────────────┘
 *         │
 *         v
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                      输出层                                      │
 * │  ┌──────────────────┐   ┌──────────────────────────────────┐  │
 * │  │ AI概率分数 0-100 │   │ 检测到的AI特征列表                │  │
 * │  │                  │   │ - 特征1: 值 (权重)                │  │
 * │  │                  │   │ - 特征2: 值 (权重)                │  │
 * │  └──────────────────┘   └──────────────────────────────────┘  │
 * └─────────────────────────────────────────────────────────────────┘
 */

// ============================================================================
// 一、特征工程
// ============================================================================

/**
 * 特征类型定义
 */
export interface TextFeatures {
  // 1. 词汇特征
  lexical: {
    typeTokenRatio: number;      // 词汇丰富度 TTR
    avgWordLength: number;       // 平均词长
    avgSentenceLength: number;   // 平均句长
    uniqueWordRatio: number;     // 独特词比例
    rareWordCount: number;       // 罕见词数量
    stopWordRatio: number;       // 停用词比例
    aiWordRatio: number;         // AI高频词比例
  };
  
  // 2. 句法特征
  syntactic: {
    avgClauseCount: number;      // 平均从句数
    avgDependencyDepth: number;  // 平均依存深度
    parseTreeComplexity: number; // 句法树复杂度
    posEntropy: number;          // 词性分布熵
    transitionCount: number;     // 过渡词数量
  };
  
  // 3. 风格特征
  stylistic: {
    formalityScore: number;      // 正式程度
    emotionScore: number;        // 情感倾向
    readabilityScore: number;    // 可读性
    repetitionScore: number;     // 重复度
    coherenceScore: number;      // 连贯性
    burstiness: number;          // 爆发性（句长变化）
  };
  
  // 4. 统计特征
  statistical: {
    perplexity: number;          // 困惑度（需语言模型）
    entropy: number;             // 熵值
    burstinessScore: number;     // 爆发性评分
    variance: number;            // 方差
    skewness: number;            // 偏度
    kurtosis: number;            // 峰度
  };
  
  // 5. AI特征
  aiSpecific: {
    aiPatternCount: number;      // AI模式匹配数
    aiPatternRatio: number;      // AI模式占比
    clichéCount: number;         // 陈词滥调数
    templateScore: number;       // 模板化评分
    predictability: number;      // 可预测性
  };
}

/**
 * 特征提取器
 */
export class FeatureExtractor {
  /**
   * 提取完整特征向量
   */
  static extract(text: string): TextFeatures {
    return {
      lexical: this.extractLexicalFeatures(text),
      syntactic: this.extractSyntacticFeatures(text),
      stylistic: this.extractStylisticFeatures(text),
      statistical: this.extractStatisticalFeatures(text),
      aiSpecific: this.extractAIFeatures(text),
    };
  }

  /**
   * 词汇特征提取
   */
  private static extractLexicalFeatures(text: string): TextFeatures['lexical'] {
    const sentences = text.split(/[。！？\n]+/).filter(s => s.trim());
    const words = text.split(/\s+|(?<=[^a-zA-Z0-9\u4e00-\u9fa5])/).filter(w => w.trim());
    const uniqueWords = new Set(words);
    
    // AI高频词列表
    const aiWords = [
      '首先', '其次', '最后', '综上所述', '总而言之', '由此可见',
      '值得注意的是', '不可否认', '发挥着重要作用', '具有重要意义',
      '有着密切的关系', '在一定程度上', '从长远来看',
    ];
    
    let aiWordCount = 0;
    for (const word of aiWords) {
      if (text.includes(word)) aiWordCount++;
    }

    return {
      typeTokenRatio: uniqueWords.size / Math.max(words.length, 1),
      avgWordLength: words.reduce((sum, w) => sum + w.length, 0) / Math.max(words.length, 1),
      avgSentenceLength: words.length / Math.max(sentences.length, 1),
      uniqueWordRatio: uniqueWords.size / Math.max(words.length, 1),
      rareWordCount: 0, // 需要词频表
      stopWordRatio: 0, // 需要停用词表
      aiWordRatio: aiWordCount / Math.max(words.length, 1),
    };
  }

  /**
   * 句法特征提取
   */
  private static extractSyntacticFeatures(text: string): TextFeatures['syntactic'] {
    const sentences = text.split(/[。！？\n]+/).filter(s => s.trim());
    
    // 过渡词列表
    const transitions = [
      '然而', '但是', '因此', '所以', '因为', '虽然', '如果', '但是',
      '另一方面', '与此同时', '首先', '其次', '最后',
    ];
    
    let transitionCount = 0;
    for (const t of transitions) {
      const matches = text.match(new RegExp(t, 'g'));
      if (matches) transitionCount += matches.length;
    }

    return {
      avgClauseCount: 0, // 需要句法分析
      avgDependencyDepth: 0, // 需要句法分析
      parseTreeComplexity: 0, // 需要句法分析
      posEntropy: 0, // 需要词性标注
      transitionCount,
    };
  }

  /**
   * 风格特征提取
   */
  private static extractStylisticFeatures(text: string): TextFeatures['stylistic'] {
    const sentences = text.split(/[。！？\n]+/).filter(s => s.trim());
    const sentenceLengths = sentences.map(s => s.length);
    
    // 计算爆发性（句长变化）
    const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / Math.max(sentenceLengths.length, 1);
    const variance = sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / Math.max(sentenceLengths.length, 1);
    const burstiness = Math.sqrt(variance) / Math.max(avgLength, 1);

    return {
      formalityScore: 0, // 需要形式性评分模型
      emotionScore: 0, // 需要情感分析模型
      readabilityScore: 0, // 需要可读性公式
      repetitionScore: 0, // 需要重复检测
      coherenceScore: 0, // 需要连贯性分析
      burstiness,
    };
  }

  /**
   * 统计特征提取
   */
  private static extractStatisticalFeatures(text: string): TextFeatures['statistical'] {
    const sentences = text.split(/[。！？\n]+/).filter(s => s.trim());
    const sentenceLengths = sentences.map(s => s.length);
    
    const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / Math.max(sentenceLengths.length, 1);
    const variance = sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / Math.max(sentenceLengths.length, 1);
    
    // 偏度和峰度简化计算
    const skewness = sentenceLengths.length > 2 
      ? sentenceLengths.reduce((sum, len) => sum + Math.pow((len - avgLength) / Math.sqrt(variance + 0.001), 3), 0) / sentenceLengths.length
      : 0;
    
    const kurtosis = sentenceLengths.length > 2
      ? sentenceLengths.reduce((sum, len) => sum + Math.pow((len - avgLength) / Math.sqrt(variance + 0.001), 4), 0) / sentenceLengths.length - 3
      : 0;

    return {
      perplexity: 0, // 需要语言模型
      entropy: this.calculateEntropy(text),
      burstinessScore: Math.sqrt(variance) / Math.max(avgLength, 1),
      variance,
      skewness,
      kurtosis,
    };
  }

  /**
   * AI特征提取
   */
  private static extractAIFeatures(text: string): TextFeatures['aiSpecific'] {
    // AI模式列表
    const aiPatterns = [
      '首先.*其次.*最后',
      '一方面.*另一方面',
      '随着.*的发展',
      '在当今社会',
      '综上所述.*',
      '不可否认的是',
      '发挥着重要作用',
      '具有重要意义',
      '有着密切的关系',
    ];
    
    let patternCount = 0;
    for (const pattern of aiPatterns) {
      if (new RegExp(pattern).test(text)) {
        patternCount++;
      }
    }
    
    // 陈词滥调列表
    const clichés = [
      '众所周知', '不言而喻', '显而易见', '毋庸置疑',
      '有目共睹', '人所共知', '家喻户晓',
    ];
    
    let clichéCount = 0;
    for (const cliché of clichés) {
      if (text.includes(cliché)) clichéCount++;
    }

    const sentences = text.split(/[。！？\n]+/).filter(s => s.trim());

    return {
      aiPatternCount: patternCount,
      aiPatternRatio: patternCount / Math.max(sentences.length, 1),
      clichéCount,
      templateScore: patternCount * 0.2 + clichéCount * 0.1,
      predictability: 0, // 需要语言模型
    };
  }

  /**
   * 计算文本熵
   */
  private static calculateEntropy(text: string): number {
    const freq: Record<string, number> = {};
    for (const char of text) {
      freq[char] = (freq[char] || 0) + 1;
    }
    
    let entropy = 0;
    const total = text.length;
    
    for (const count of Object.values(freq)) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
    
    return entropy;
  }
}

// ============================================================================
// 二、模型架构
// ============================================================================

/**
 * AI检测器配置
 */
export interface AIDetectorConfig {
  // 模型参数
  modelType: 'ensemble' | 'transformer' | 'statistical';
  confidence: number;           // 置信度阈值
  useHanLP: boolean;            // 是否使用HanLP增强
  
  // 自定义权重（从训练模型获取）
  customWeights?: Record<string, number>;
  
  // 集成学习参数
  ensemble?: {
    xgboost: boolean;
    svm: boolean;
    cnn: boolean;
    lstm: boolean;
    weights: Record<string, number>;
  };
  
  // 特征选择
  featureSelection?: {
    useLexical: boolean;
    useSyntactic: boolean;
    useStylistic: boolean;
    useStatistical: boolean;
    useAISpecific: boolean;
  };
}

/**
 * 检测结果
 */
export interface AIDetectionResult {
  score: number;                // AI概率分数 0-100
  confidence: number;           // 置信度
  isAI: boolean;                // 是否判定为AI生成
  
  // 详细分析
  analysis: {
    aiFeatures: Array<{
      feature: string;
      value: number;
      weight: number;
    }>;
    humanFeatures: Array<{
      feature: string;
      value: number;
      weight: number;
    }>;
  };
  
  // 建议
  suggestions: Array<{
    type: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

/**
 * AI检测器
 */
export class AIDetector {
  private config: AIDetectorConfig;

  constructor(config: Partial<AIDetectorConfig>) {
    this.config = {
      modelType: 'ensemble',
      confidence: 0.7,
      useHanLP: false,
      ...config,
    };
  }

  /**
   * 检测文本
   */
  detect(text: string): AIDetectionResult {
    // 1. 提取特征
    const features = FeatureExtractor.extract(text);
    
    // 2. 计算AI分数
    const score = this.calculateAIScore(features);
    
    // 3. 生成分析结果
    const analysis = this.analyzeFeatures(features);
    
    // 4. 生成建议
    const suggestions = this.generateSuggestions(features, score);
    
    return {
      score,
      confidence: Math.abs(score - 50) / 50, // 距离中间值越远置信度越高
      isAI: score > 60,
      analysis,
      suggestions,
    };
  }

  /**
   * 计算AI分数
   */
  private calculateAIScore(features: TextFeatures): number {
    // 如果有自定义权重，使用自定义权重计算
    if (this.config.customWeights) {
      return this.calculateAIScoreWithWeights(features, this.config.customWeights);
    }

    // 默认权重计算
    let score = 50; // 基础分数
    
    // 词汇特征影响
    if (features.lexical.aiWordRatio > 0.05) score += 15;
    if (features.lexical.typeTokenRatio < 0.4) score += 10; // 词汇多样性低
    
    // 风格特征影响
    if (features.stylistic.burstiness < 0.5) score += 10; // 爆发性低（句长变化小）
    
    // AI特征影响
    score += features.aiSpecific.templateScore * 20;
    if (features.aiSpecific.aiPatternCount > 2) score += 10;
    if (features.aiSpecific.clichéCount > 1) score += 5;
    
    // 统计特征影响
    if (features.statistical.entropy < 4) score += 5; // 熵值低
    
    // 限制范围
    return Math.max(0, Math.min(100, score));
  }

  /**
   * 使用自定义权重计算AI分数
   */
  private calculateAIScoreWithWeights(
    features: TextFeatures, 
    weights: Record<string, number>
  ): number {
    // 扁平化特征
    const flatFeatures: Record<string, number> = {
      vocabulary_diversity: features.lexical.typeTokenRatio,
      sentence_variety: features.stylistic.burstiness,
      transitional_density: features.syntactic.transitionCount,
      average_sentence_length: features.lexical.avgSentenceLength,
      rare_word_usage: features.lexical.rareWordCount,
      personal_pronoun_usage: 0, // 需要额外分析
      emotion_indicator: features.stylistic.emotionScore,
      structure_uniformity: 1 - features.stylistic.burstiness, // 句长变化小 = 结构统一
    };

    let score = 0;
    for (const [key, weight] of Object.entries(weights)) {
      const value = flatFeatures[key] || 0;
      score += value * weight;
    }

    // 归一化到0-100
    score = Math.max(0, Math.min(100, score));

    // 根据AI特定特征调整
    if (features.aiSpecific.aiPatternCount > 2) {
      score = Math.min(100, score + 10);
    }
    if (features.aiSpecific.clichéCount > 1) {
      score = Math.min(100, score + 5);
    }

    return Math.round(score);
  }

  /**
   * 分析特征
   */
  private analyzeFeatures(features: TextFeatures): AIDetectionResult['analysis'] {
    const aiFeatures: AIDetectionResult['analysis']['aiFeatures'] = [];
    const humanFeatures: AIDetectionResult['analysis']['humanFeatures'] = [];
    
    // AI特征
    if (features.lexical.aiWordRatio > 0.03) {
      aiFeatures.push({
        feature: 'AI高频词',
        value: features.lexical.aiWordRatio,
        weight: 0.3,
      });
    }
    
    if (features.aiSpecific.aiPatternCount > 0) {
      aiFeatures.push({
        feature: 'AI模式匹配',
        value: features.aiSpecific.aiPatternCount,
        weight: 0.25,
      });
    }
    
    if (features.stylistic.burstiness < 0.5) {
      aiFeatures.push({
        feature: '句长变化小',
        value: features.stylistic.burstiness,
        weight: 0.2,
      });
    }
    
    // 人类特征
    if (features.stylistic.burstiness > 0.7) {
      humanFeatures.push({
        feature: '句长变化大',
        value: features.stylistic.burstiness,
        weight: 0.3,
      });
    }
    
    if (features.lexical.typeTokenRatio > 0.6) {
      humanFeatures.push({
        feature: '词汇丰富度高',
        value: features.lexical.typeTokenRatio,
        weight: 0.25,
      });
    }
    
    if (features.statistical.entropy > 4.5) {
      humanFeatures.push({
        feature: '文本熵值高',
        value: features.statistical.entropy,
        weight: 0.2,
      });
    }
    
    return { aiFeatures, humanFeatures };
  }

  /**
   * 生成建议
   */
  private generateSuggestions(
    features: TextFeatures, 
    score: number
  ): AIDetectionResult['suggestions'] {
    const suggestions: AIDetectionResult['suggestions'] = [];
    
    if (score > 70) {
      suggestions.push({
        type: 'critical',
        description: '文本具有明显的AI生成特征，建议进行大幅改写',
        priority: 'high',
      });
    } else if (score > 55) {
      suggestions.push({
        type: 'warning',
        description: '文本存在一些AI特征，建议针对性优化',
        priority: 'medium',
      });
    }
    
    if (features.aiSpecific.aiPatternCount > 2) {
      suggestions.push({
        type: 'pattern',
        description: `检测到 ${features.aiSpecific.aiPatternCount} 个AI模式，建议替换或删除`,
        priority: 'medium',
      });
    }
    
    if (features.stylistic.burstiness < 0.5) {
      suggestions.push({
        type: 'style',
        description: '句式过于工整，建议增加句长变化',
        priority: 'low',
      });
    }
    
    return suggestions;
  }
}

// ============================================================================
// 三、训练数据管理
// ============================================================================

/**
 * 训练数据项
 */
export interface TrainingDataItem {
  id: string;
  text: string;
  label: 'human' | 'ai';
  source: string;
  metadata: {
    author?: string;
    date?: string;
    model?: string;      // 如果是AI生成，记录模型名称
    length: number;
    domain: string;      // 文本领域
  };
}

/**
 * 数据集管理器
 */
export class DatasetManager {
  private data: TrainingDataItem[] = [];
  
  /**
   * 添加数据
   */
  addData(item: TrainingDataItem): void {
    this.data.push(item);
  }
  
  /**
   * 批量添加
   */
  addBatch(items: TrainingDataItem[]): void {
    this.data.push(...items);
  }
  
  /**
   * 获取数据
   */
  getData(): TrainingDataItem[] {
    return this.data;
  }
  
  /**
   * 划分数据集
   */
  split(testRatio: number = 0.2): {
    train: TrainingDataItem[];
    test: TrainingDataItem[];
  } {
    const shuffled = [...this.data].sort(() => Math.random() - 0.5);
    const splitIndex = Math.floor(shuffled.length * (1 - testRatio));
    
    return {
      train: shuffled.slice(0, splitIndex),
      test: shuffled.slice(splitIndex),
    };
  }
  
  /**
   * 统计信息
   */
  stats(): {
    total: number;
    human: number;
    ai: number;
    avgLength: number;
    domains: Record<string, number>;
  } {
    const human = this.data.filter(d => d.label === 'human').length;
    const ai = this.data.filter(d => d.label === 'ai').length;
    const avgLength = this.data.reduce((sum, d) => sum + d.metadata.length, 0) / Math.max(this.data.length, 1);
    
    const domains: Record<string, number> = {};
    for (const item of this.data) {
      domains[item.metadata.domain] = (domains[item.metadata.domain] || 0) + 1;
    }
    
    return { total: this.data.length, human, ai, avgLength, domains };
  }
}

// ============================================================================
// 四、导出便捷方法
// ============================================================================

/**
 * 快速检测文本
 */
export function detectAI(text: string, config?: Partial<AIDetectorConfig>): AIDetectionResult {
  const detector = new AIDetector(config || {});
  return detector.detect(text);
}

/**
 * 快速提取特征
 */
export function extractFeatures(text: string): TextFeatures {
  return FeatureExtractor.extract(text);
}
