/**
 * 服务接口定义
 * 定义各模块的公共接口，用于依赖注入
 * 
 * @module core/di/types
 */

import type { 
  PolishInput, 
  PolishOutput, 
  PolishProgress,
  PolishStepConfig,
} from '@/modules/polish/types';

import type {
  DetectionResult,
  DetectionConfig,
  TrainingData,
} from '@/modules/detect/types';

// ============================================
// LLM服务接口
// ============================================

/**
 * LLM调用选项
 */
export interface LLMOptions {
  /** 温度参数 0-2 */
  temperature?: number;
  /** 最大Token数 */
  maxTokens?: number;
  /** Top-p采样 */
  topP?: number;
  /** 停止词 */
  stop?: string[];
  /** 模型标识 */
  model?: string;
}

/**
 * LLM消息格式
 */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * LLM客户端接口
 * 
 * @example
 * ```ts
 * const client = container.resolve(ServiceTokens.LLM_CLIENT);
 * const result = await client.generate([
 *   { role: 'user', content: '你好' }
 * ]);
 * ```
 */
export interface ILLMClient {
  /**
   * 同步调用LLM生成内容
   * @param messages 消息列表
   * @param options 调用选项
   * @returns 生成的文本内容
   */
  generate(
    messages: LLMMessage[],
    options?: LLMOptions
  ): Promise<string>;
  
  /**
   * 流式调用LLM
   * @param messages 消息列表
   * @param options 调用选项
   * @param onChunk 流式回调
   * @returns 完整生成内容
   */
  generateStream(
    messages: LLMMessage[],
    options?: LLMOptions,
    onChunk?: (chunk: string) => void
  ): Promise<string>;
  
  /**
   * 计算Token数量
   * @param text 输入文本
   * @returns Token数量
   */
  countTokens(text: string): number;
}

// ============================================
// 文本处理接口
// ============================================

/**
 * 引用保护器接口
 * 
 * 用于保护文本中的引用内容（引号、书名号内的内容）
 * 确保在润色过程中不被修改
 */
export interface IQuoteProtector {
  /**
   * 保护引用内容
   * @param text 原始文本
   * @returns 保护后的文本和恢复映射表
   */
  protect(text: string): { 
    text: string; 
    map: Map<string, string>;
    count: number;
  };
  
  /**
   * 恢复引用内容
   * @param text 保护后的文本
   * @param map 恢复映射表
   * @returns 原始文本
   */
  restore(text: string, map: Map<string, string>): string;
  
  /**
   * 检查文本是否包含受保护内容
   */
  hasProtectedContent(text: string): boolean;
}

/**
 * 文本处理器接口
 */
export interface ITextProcessor {
  /**
   * 清洗文本
   * - 去除多余空白
   * - 统一标点符号
   * - 修复常见格式问题
   */
  clean(text: string): string;
  
  /**
   * 分段处理
   * @param text 输入文本
   * @param maxLength 每段最大长度
   * @returns 分段后的文本数组
   */
  segment(text: string, maxLength: number): string[];
  
  /**
   * 合并文本
   * @param segments 分段文本
   * @returns 合并后的文本
   */
  merge(segments: string[]): string;
  
  /**
   * 提取摘要
   */
  extractSummary(text: string, maxLength: number): string;
  
  /**
   * 计算文本相似度
   */
  calculateSimilarity(text1: string, text2: string): number;
}

/**
 * 文本差异比较接口
 */
export interface ITextDiff {
  /**
   * 计算差异
   * @returns 差异结果
   */
  diff(oldText: string, newText: string): DiffResult[];
  
  /**
   * 应用差异补丁
   */
  applyPatch(text: string, patches: DiffResult[]): string;
  
  /**
   * 生成差异报告
   */
  generateReport(oldText: string, newText: string): string;
}

/**
 * 差异结果
 */
export interface DiffResult {
  type: 'add' | 'remove' | 'equal';
  value: string;
  count?: number;
}

// ============================================
// 存储接口
// ============================================

/**
 * 本地存储接口
 */
export interface ILocalStorage {
  /**
   * 获取数据
   */
  get<T>(key: string): Promise<T | null>;
  
  /**
   * 设置数据
   */
  set<T>(key: string, value: T): Promise<void>;
  
  /**
   * 删除数据
   */
  remove(key: string): Promise<void>;
  
  /**
   * 清空所有数据
   */
  clear(): Promise<void>;
  
  /**
   * 获取所有键
   */
  keys(): Promise<string[]>;
}

/**
 * 内存缓存接口
 */
export interface IMemoryStorage {
  /**
   * 获取缓存
   */
  get<T>(key: string): T | undefined;
  
  /**
   * 设置缓存
   * @param ttl 过期时间（毫秒）
   */
  set<T>(key: string, value: T, ttl?: number): void;
  
  /**
   * 删除缓存
   */
  delete(key: string): void;
  
  /**
   * 清空缓存
   */
  clear(): void;
  
  /**
   * 获取缓存大小
   */
  size(): number;
}

// ============================================
// 业务服务接口
// ============================================

/**
 * 润色流水线接口
 */
export interface IPolishPipeline {
  /**
   * 执行润色处理
   */
  execute(
    input: PolishInput,
    onProgress?: (progress: PolishProgress) => void
  ): Promise<PolishOutput>;
  
  /**
   * 验证配置
   */
  validateConfig(config: unknown): boolean;
  
  /**
   * 获取可用步骤列表
   */
  getAvailableSteps(): PolishStepConfig[];
  
  /**
   * 预览处理效果
   */
  preview?(input: PolishInput): Promise<Partial<PolishOutput>>;
}

/**
 * AI检测器接口
 */
export interface IAIDetector {
  /**
   * 检测文本
   */
  detect(text: string, config?: DetectionConfig): Promise<DetectionResult>;
  
  /**
   * 批量检测
   */
  detectBatch(texts: string[]): Promise<DetectionResult[]>;
  
  /**
   * 训练模型
   */
  train(data: TrainingData): Promise<void>;
  
  /**
   * 获取检测历史
   */
  getHistory(): Promise<DetectionResult[]>;
}

// ============================================
// 配置接口
// ============================================

/**
 * 步骤配置接口
 */
export interface IStepConfig {
  /**
   * 获取所有步骤配置
   */
  getAll(): PolishStepConfig[];
  
  /**
   * 获取单个步骤配置
   */
  get(stepId: string): PolishStepConfig | undefined;
  
  /**
   * 获取步骤执行顺序
   */
  getExecutionOrder(enabledSteps: string[]): string[];
}

/**
 * 模型配置接口
 */
export interface IModelConfig {
  /**
   * 获取默认模型
   */
  getDefaultModel(): string;
  
  /**
   * 获取模型配置
   */
  getModelConfig(modelId: string): LLMOptions | undefined;
  
  /**
   * 获取所有可用模型
   */
  getAvailableModels(): Array<{ id: string; name: string }>;
}
