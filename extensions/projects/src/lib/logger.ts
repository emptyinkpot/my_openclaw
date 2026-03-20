/**
 * ============================================================================
 * 统一日志工具
 * ============================================================================
 * 
 * 设计理念：
 * 1. 统一的日志格式和级别
 * 2. 模块化的日志前缀
 * 3. 生产环境可关闭调试日志
 */

/** 日志级别 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** 日志配置 */
interface LoggerConfig {
  module: string;
  enabled?: boolean;
  level?: LogLevel;
}

/** 日志级别优先级 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** 当前日志级别（可通过环境变量配置） */
const currentLevel: LogLevel = 
  (typeof process !== 'undefined' && process.env?.LOG_LEVEL as LogLevel) || 'info';

/**
 * 创建模块日志器
 */
export function createLogger(config: LoggerConfig) {
  const { module, enabled = true, level = 'info' } = config;
  const prefix = `[${module}]`;

  const shouldLog = (lvl: LogLevel): boolean => {
    if (!enabled) return false;
    return LOG_LEVELS[lvl] >= LOG_LEVELS[level];
  };

  return {
    debug: (message: string, ...args: unknown[]) => {
      if (shouldLog('debug')) {
        console.log(`${prefix} ${message}`, ...args);
      }
    },

    info: (message: string, ...args: unknown[]) => {
      if (shouldLog('info')) {
        console.log(`${prefix} ${message}`, ...args);
      }
    },

    warn: (message: string, ...args: unknown[]) => {
      if (shouldLog('warn')) {
        console.warn(`${prefix} ⚠️ ${message}`, ...args);
      }
    },

    error: (message: string, error?: unknown) => {
      if (shouldLog('error')) {
        const errorDetail = error instanceof Error 
          ? `${error.message}` 
          : error ? String(error) : '';
        console.error(`${prefix} ❌ ${message}`, errorDetail);
      }
    },

    /** 计时器 */
    time: (label: string) => {
      if (shouldLog('debug')) {
        console.time(`${prefix} ${label}`);
      }
    },

    timeEnd: (label: string) => {
      if (shouldLog('debug')) {
        console.timeEnd(`${prefix} ${label}`);
      }
    },

    /** 分组日志 */
    group: (label: string) => {
      if (shouldLog('debug')) {
        console.group(`${prefix} ${label}`);
      }
    },

    groupEnd: () => {
      if (shouldLog('debug')) {
        console.groupEnd();
      }
    },
  };
}

// ============================================================================
// 预定义模块日志器
// ============================================================================

export const LLMLogger = createLogger({ module: 'LLM' });
export const ProcessorLogger = createLogger({ module: 'Processor' });
export const ResourceLogger = createLogger({ module: 'Resource' });
export const APILogger = createLogger({ module: 'API' });
export const QuoteLogger = createLogger({ module: 'QuoteProtector' });

// ============================================================================
// 错误处理工具
// ============================================================================

/** 应用错误类型 */
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** 常见错误码 */
export const ErrorCodes = {
  LLM_EMPTY_RESPONSE: 'LLM_EMPTY_RESPONSE',
  LLM_REFUSED: 'LLM_REFUSED',
  LLM_TIMEOUT: 'LLM_TIMEOUT',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_LOAD_FAILED: 'RESOURCE_LOAD_FAILED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNKNOWN: 'UNKNOWN',
} as const;

/** 判断错误是否可重试 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.code === ErrorCodes.LLM_TIMEOUT;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('econnreset')
    );
  }
  return false;
}

/** 安全执行函数（捕获异常并返回默认值） */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  defaultValue: T,
  logger?: ReturnType<typeof createLogger>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logger?.error('执行失败', error);
    return defaultValue;
  }
}

/** 带重试的执行 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delay?: number;
    backoff?: boolean;
    logger?: ReturnType<typeof createLogger>;
  } = {}
): Promise<T> {
  const { maxRetries = 3, delay = 500, backoff = true, logger } = options;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (!isRetryableError(error) || attempt === maxRetries) {
        break;
      }

      const waitTime = backoff ? delay * Math.pow(2, attempt) : delay;
      logger?.warn(`第 ${attempt + 1} 次尝试失败，${waitTime}ms 后重试`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError || new Error('执行失败');
}
