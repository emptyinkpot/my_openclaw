/**
 * 服务依赖标识
 * 用于依赖注入容器的服务注册和解析
 * 
 * @module core/di/tokens
 */

/**
 * 服务Token定义
 * 每个Token对应一个可注入的服务
 */
export const ServiceTokens = {
  // ============================================
  // LLM服务
  // ============================================
  
  /** LLM客户端 - 用于文本生成 */
  LLM_CLIENT: Symbol('ILLMClient'),
  
  /** LLM流式处理 - 用于流式输出 */
  LLM_STREAM: Symbol('ILLMStreamHandler'),

  // ============================================
  // 文本处理服务
  // ============================================
  
  /** 文本处理器 - 文本清洗、格式化 */
  TEXT_PROCESSOR: Symbol('ITextProcessor'),
  
  /** 引用保护器 - 保护引用内容不被修改 */
  QUOTE_PROTECTOR: Symbol('IQuoteProtector'),
  
  /** 文本差异比较 - 对比新旧文本 */
  TEXT_DIFF: Symbol('ITextDiff'),
  
  /** 文本分段器 - 智能分段、分句 */
  TEXT_SEGMENTER: Symbol('ITextSegmenter'),

  // ============================================
  // 存储服务
  // ============================================
  
  /** 本地存储 - localStorage封装 */
  STORAGE_LOCAL: Symbol('ILocalStorage'),
  
  /** 内存缓存 - 临时数据缓存 */
  STORAGE_MEMORY: Symbol('IMemoryStorage'),

  // ============================================
  // 业务服务
  // ============================================
  
  /** 润色流水线 - 文章润色处理 */
  POLISH_PIPELINE: Symbol('IPolishPipeline'),
  
  /** AI检测器 - AI生成内容检测 */
  AI_DETECTOR: Symbol('IAIDetector'),
  
  /** 资源管理器 - 词汇库、禁用词库管理 */
  RESOURCE_MANAGER: Symbol('IResourceManager'),

  // ============================================
  // 配置服务
  // ============================================
  
  /** 步骤配置 - 处理步骤配置 */
  CONFIG_STEPS: Symbol('IStepConfig'),
  
  /** 模型配置 - AI模型配置 */
  CONFIG_MODELS: Symbol('IModelConfig'),
  
  /** 默认配置 - 应用默认配置 */
  CONFIG_DEFAULTS: Symbol('IDefaultConfig'),

  // ============================================
  // 工具服务
  // ============================================
  
  /** 日志服务 - 统一日志记录 */
  LOGGER: Symbol('ILogger'),
  
  /** 验证器 - 数据验证 */
  VALIDATOR: Symbol('IValidator'),
} as const;

/**
 * Token类型
 */
export type ServiceToken = typeof ServiceTokens[keyof typeof ServiceTokens];
