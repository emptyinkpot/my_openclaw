/**
 * 润色模块类型定义
 * 
 * @module modules/polish/types
 */

// ============================================
// 基础类型
// ============================================

/**
 * 处理阶段
 */
export type ProcessPhase = 
  | 'config'      // 配置阶段
  | 'process'     // 处理阶段
  | 'postprocess' // 后处理阶段
  | 'review';     // 审稿阶段

/**
 * 步骤设置
 */
export interface StepSettings {
  /** 是否启用 */
  enabled: boolean;
  /** 步骤特定配置 */
  [key: string]: unknown;
}

/**
 * 步骤配置
 */
export interface PolishStepConfig {
  /** 步骤ID */
  id: string;
  /** 步骤名称 */
  name: string;
  /** 所属阶段 */
  phase: ProcessPhase;
  /** 步骤描述 */
  description: string;
  /** 是否为固定步骤（不可关闭） */
  fixed?: boolean;
  /** 依赖的步骤 */
  dependencies?: string[];
  /** 默认设置 */
  defaultSettings?: StepSettings;
}

// ============================================
// 替换记录
// ============================================

/**
 * 单次替换记录
 */
export interface ReplacementRecord {
  /** 原文 */
  original: string;
  /** 替换后 */
  replaced: string;
  /** 替换原因 */
  reason: string;
  /** 来源（如词汇库名称） */
  source?: string;
  /** 位置信息 */
  position?: {
    start: number;
    end: number;
  };
}

/**
 * 替换统计
 */
export interface ReplacementStats {
  /** 总替换次数 */
  total: number;
  /** 按来源统计 */
  bySource: Record<string, number>;
  /** 按原因统计 */
  byReason: Record<string, number>;
}

// ============================================
// 处理报告
// ============================================

/**
 * 单步骤报告
 */
export interface StepReport {
  /** 步骤名称 */
  step: string;
  /** 报告内容 */
  report: string;
  /** 执行时间（毫秒） */
  duration?: number;
  /** 是否成功 */
  success?: boolean;
  /** 错误信息 */
  error?: string;
}

/**
 * 整体处理报告
 */
export interface ProcessReport {
  /** 总处理时间（毫秒） */
  totalDuration: number;
  /** 各步骤报告 */
  steps: StepReport[];
  /** 替换统计 */
  replacementStats: ReplacementStats;
  /** 警告信息 */
  warnings: string[];
  /** 建议信息 */
  suggestions: string[];
}

// ============================================
// 执行上下文
// ============================================

/**
 * 步骤执行上下文
 * 传递给每个步骤的执行环境信息
 */
export interface StepContext {
  /** 当前文本 */
  text: string;
  /** 用户设置 */
  settings: PolishSettings;
  /** 已完成的步骤ID列表 */
  completedSteps: string[];
  /** 累计替换记录 */
  replacements: ReplacementRecord[];
  /** 累计报告 */
  reports: StepReport[];
  /** 资源数据 */
  resources?: {
    vocabulary?: Array<{ word: string; category: string }>;
    bannedWords?: Array<{ word: string; replacement: string }>;
    literature?: Array<{ title: string; content: string }>;
  };
  /** 进度回调 */
  reportProgress?: (message: string) => void;
  /** 流式输出回调 */
  streamChunk?: (chunk: string) => void;
  /** 用于在步骤之间传递数据的字段 */
  data: Record<string, any>;
}

/**
 * 步骤执行结果
 */
export interface StepResult {
  /** 处理后的文本 */
  text: string;
  /** 是否有修改 */
  modified: boolean;
  /** 替换记录 */
  replacements?: ReplacementRecord[];
  /** 步骤报告 */
  report: StepReport;
  /** 是否跳过 */
  skipped?: boolean;
  /** 跳过原因 */
  skipReason?: string;
}

// ============================================
// 输入输出
// ============================================

/**
 * 润色输入
 */
export interface PolishInput {
  /** 待润色文本 */
  text: string;
  /** 润色设置 */
  settings: PolishSettings;
}

/**
 * 润色进度
 */
export interface PolishProgress {
  /** 进度百分比 0-100 */
  progress: number;
  /** 进度消息 */
  message: string;
  /** 当前步骤 */
  currentStep?: string;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 润色输出
 */
export interface PolishOutput {
  /** 润色后文本 */
  text: string;
  /** 提取的标题 */
  title: string;
  /** 替换记录 */
  replacements: ReplacementRecord[];
  /** 处理报告 */
  reports: StepReport[];
  /** 元数据 */
  metadata: {
    /** 处理时间（毫秒） */
    processingTime: number;
    /** 执行步骤数 */
    stepsExecuted: number;
    /** 总步骤数 */
    totalSteps: number;
    /** 输入字数 */
    inputWordCount?: number;
    /** 输出字数 */
    outputWordCount?: number;
  };
}

// ============================================
// 设置
// ============================================

/**
 * 润色设置
 */
export interface PolishSettings {
  /** 各步骤设置 */
  steps: Record<string, StepSettings>;
  
  /** 全局配置 */
  global: {
    /** 目标风格 */
    style?: 'formal' | 'casual' | 'academic' | 'narrative' | 'historical' | 'literary' | 'japanese';
    /** 输出语言 */
    language?: string;
    /** 温度参数 */
    temperature?: number;
    /** 最大长度 */
    maxLength?: number;
  };
  
  /** 资源配置 */
  resources?: {
    /** 词汇库ID列表 */
    vocabularyIds?: string[];
    /** 禁用词库ID列表 */
    bannedWordIds?: string[];
    /** 文献库ID列表 */
    literatureIds?: string[];
  };
}

// ============================================
// 验证器
// ============================================

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息 */
  errors: string[];
  /** 警告信息 */
  warnings: string[];
}

/**
 * 文本验证器
 */
export interface TextValidator {
  /** 验证器ID */
  id: string;
  /** 验证器名称 */
  name: string;
  /** 验证函数 */
  validate: (text: string, context: StepContext) => ValidationResult;
}

// ============================================
// Prompt构建
// ============================================

/**
 * Prompt模板
 */
export interface PromptTemplate {
  /** 模板ID */
  id: string;
  /** 模板名称 */
  name: string;
  /** 模板内容（支持变量替换） */
  template: string;
  /** 变量定义 */
  variables: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array';
    required?: boolean;
    default?: unknown;
  }>;
}

/**
 * Prompt构建选项
 */
export interface PromptBuildOptions {
  /** 是否压缩Prompt */
  compress?: boolean;
  /** 是否包含示例 */
  includeExamples?: boolean;
  /** 自定义指令 */
  customInstructions?: string[];
}
