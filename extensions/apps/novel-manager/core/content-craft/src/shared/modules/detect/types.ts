/**
 * AI检测模块类型定义
 * 
 * @module modules/detect/types
 */

/**
 * 检测配置
 */
export interface DetectionConfig {
  /** 检测模式 */
  mode?: 'fast' | 'accurate' | 'comprehensive';
  /** 是否包含详细分析 */
  detailed?: boolean;
  /** 自定义阈值 */
  threshold?: number;
  /** 使用的特征 */
  features?: DetectionFeature[];
}

/**
 * 检测特征类型
 */
export type DetectionFeature = 
  | 'perplexity'      // 困惑度
  | 'vocabulary'      // 词汇特征
  | 'structure'       // 结构特征
  | 'syntax'          // 语法特征
  | 'statistical';    // 统计特征

/**
 * 检测结果
 */
export interface DetectionResult {
  /** AI生成概率 0-1 */
  probability: number;
  /** 置信度 0-1 */
  confidence: number;
  /** 检测模式 */
  mode: string;
  /** 特征分析 */
  features?: FeatureAnalysis;
  /** 分段检测结果 */
  segments?: SegmentResult[];
  /** 时间戳 */
  timestamp: number;
  /** 原文摘要 */
  textSummary?: string;
}

/**
 * 特征分析
 */
export interface FeatureAnalysis {
  /** 困惑度分析 */
  perplexity?: {
    value: number;
    normalized: number;
    description: string;
  };
  /** 词汇分析 */
  vocabulary?: {
    diversity: number;
    repetition: number;
    avgWordLength: number;
    description: string;
  };
  /** 结构分析 */
  structure?: {
    sentenceLengthVariance: number;
    paragraphCount: number;
    avgParagraphLength: number;
    description: string;
  };
  /** AI特征词检测 */
  aiPatterns?: {
    count: number;
    patterns: string[];
    description: string;
  };
}

/**
 * 分段检测结果
 */
export interface SegmentResult {
  /** 分段文本 */
  text: string;
  /** 起始位置 */
  start: number;
  /** 结束位置 */
  end: number;
  /** AI概率 */
  probability: number;
}

/**
 * 训练数据
 */
export interface TrainingData {
  /** 样本列表 */
  samples: TrainingSample[];
  /** 训练配置 */
  config?: TrainingConfig;
}

/**
 * 训练样本
 */
export interface TrainingSample {
  /** 文本内容 */
  text: string;
  /** 标签：true=AI生成，false=人工撰写 */
  label: boolean;
  /** 来源 */
  source?: string;
}

/**
 * 训练配置
 */
export interface TrainingConfig {
  /** 学习率 */
  learningRate?: number;
  /** 迭代次数 */
  iterations?: number;
  /** 批量大小 */
  batchSize?: number;
}

/**
 * 模型权重
 */
export interface ModelWeights {
  /** 版本号 */
  version: string;
  /** 权重数据 */
  weights: Record<string, number>;
  /** 训练时间 */
  trainedAt: number;
  /** 训练样本数 */
  sampleCount: number;
}

/**
 * 检测历史记录
 */
export interface DetectionHistory {
  /** 记录ID */
  id: string;
  /** 检测结果 */
  result: DetectionResult;
  /** 原文（可选存储） */
  text?: string;
  /** 创建时间 */
  createdAt: number;
}

/**
 * 对比结果
 */
export interface ComparisonResult {
  /** 原文检测结果 */
  original: DetectionResult;
  /** 润色后检测结果 */
  polished: DetectionResult;
  /** 差异分析 */
  diff: {
    probabilityChange: number;
    improved: boolean;
    suggestions: string[];
  };
}
