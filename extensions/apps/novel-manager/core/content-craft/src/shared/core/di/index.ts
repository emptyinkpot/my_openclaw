/**
 * 依赖注入模块导出
 * 
 * @module core/di
 */

// 容器
export { DIContainer, container, ServiceNotFoundError, CircularDependencyError } from './container';

// Token
export { ServiceTokens } from './tokens';

// 类型
export type {
  // LLM
  ILLMClient,
  LLMOptions,
  LLMMessage,
  // 文本处理
  IQuoteProtector,
  ITextProcessor,
  ITextDiff,
  DiffResult,
  // 存储
  ILocalStorage,
  IMemoryStorage,
  // 业务服务
  IPolishPipeline,
  IAIDetector,
  // 配置
  IStepConfig,
  IModelConfig,
} from './types';

// Token类型
export type { ServiceToken } from './tokens';
