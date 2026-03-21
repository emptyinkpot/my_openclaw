/**
 * ============================================================================
 * LLM 客户端封装
 * ============================================================================
 */

import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import type { NextRequest } from "next/server";

// 导出 LLMClient 类型供其他模块使用
export type { LLMClient } from "coze-coding-dev-sdk";

/** LLM 客户端管理器 */
export class LLMClientManager {
  private static instance: LLMClient | null = null;
  private static headers: Record<string, string> | null = null;

  /** 获取客户端实例（单例） */
  static getClient(headers?: Record<string, string>): LLMClient {
    if (!this.instance || headers) {
      this.headers = headers || null;
      this.instance = new LLMClient(new Config(), headers);
    }
    return this.instance;
  }

  /** 从请求中提取 headers 并创建客户端 */
  static createFromRequest(request: NextRequest): LLMClient {
    const headers = HeaderUtils.extractForwardHeaders(request.headers);
    return this.getClient(headers);
  }

  /** 重置客户端（用于测试） */
  static reset(): void {
    this.instance = null;
    this.headers = null;
  }
}

/** 默认模型参数 */
export const DEFAULT_MODEL_PARAMS = {
  model: "doubao-seed-2-0-lite-260215",
  temperature: 0.3,
};

/** 长文本阈值（字符数）- 超过此值自动切换到长上下文模型 */
export const LONG_TEXT_THRESHOLD = 3000;

/** 超长文本阈值（字符数）- 超过此值使用 Kimi 模型（支持 32k 输出） */
export const KIMI_MODEL_THRESHOLD = 6000;

/** 分段处理阈值（字符数）- 超过此值需要分段处理 */
export const VERY_LONG_TEXT_THRESHOLD = 5000;

/** 分段处理时每段的最大字符数 */
export const SEGMENT_MAX_LENGTH = 2500;

/** 支持长输出的模型 */
export const LONG_CONTEXT_MODEL = "doubao-seed-2-0-pro-260215";

/** 支持超长输出的模型（Kimi K2.5 支持 32k 输出） */
export const ULTRA_LONG_CONTEXT_MODEL = "kimi-k2-5-260127";

/** 根据文本长度选择合适的模型 */
export function selectModelByTextLength(textLength: number, userSelectedModel?: string): string {
  // 如果用户明确选择了模型，优先使用用户选择
  if (userSelectedModel && userSelectedModel !== DEFAULT_MODEL_PARAMS.model) {
    return userSelectedModel;
  }
  
  // 超长文本（>6000字）使用 Kimi 模型（支持 32k 输出）
  if (textLength > KIMI_MODEL_THRESHOLD) {
    console.log(`[LLM] 文本长度 ${textLength} 超过阈值 ${KIMI_MODEL_THRESHOLD}，切换到 Kimi 模型（支持 32k 输出）`);
    return ULTRA_LONG_CONTEXT_MODEL;
  }
  
  // 长文本自动升级到支持长输出的模型
  if (textLength > LONG_TEXT_THRESHOLD) {
    console.log(`[LLM] 文本长度 ${textLength} 超过阈值 ${LONG_TEXT_THRESHOLD}，切换到长上下文模型`);
    return LONG_CONTEXT_MODEL;
  }
  
  return userSelectedModel || DEFAULT_MODEL_PARAMS.model;
}

/** 检查是否需要分段处理 */
export function needsSegmentedProcessing(textLength: number): boolean {
  return textLength > VERY_LONG_TEXT_THRESHOLD;
}

/** 将文本分段（按段落分割，保持段落完整性） */
export function splitTextIntoSegments(text: string, maxLength: number = SEGMENT_MAX_LENGTH): string[] {
  if (text.length <= maxLength) {
    return [text];
  }
  
  const segments: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let currentSegment = '';
  
  for (const paragraph of paragraphs) {
    // 如果单个段落就超过最大长度，需要进一步分割
    if (paragraph.length > maxLength) {
      // 先保存当前段落
      if (currentSegment.trim()) {
        segments.push(currentSegment.trim());
        currentSegment = '';
      }
      
      // 按句子分割长段落
      const sentences = paragraph.match(/[^。！？.!?]+[。！？.!?]+/g) || [paragraph];
      let sentenceSegment = '';
      
      for (const sentence of sentences) {
        if ((sentenceSegment + sentence).length <= maxLength) {
          sentenceSegment += sentence;
        } else {
          if (sentenceSegment.trim()) {
            segments.push(sentenceSegment.trim());
          }
          sentenceSegment = sentence;
        }
      }
      
      if (sentenceSegment.trim()) {
        currentSegment = sentenceSegment;
      }
    } else if ((currentSegment + '\n\n' + paragraph).length <= maxLength) {
      currentSegment = currentSegment ? currentSegment + '\n\n' + paragraph : paragraph;
    } else {
      if (currentSegment.trim()) {
        segments.push(currentSegment.trim());
      }
      currentSegment = paragraph;
    }
  }
  
  if (currentSegment.trim()) {
    segments.push(currentSegment.trim());
  }
  
  console.log(`[LLM] 文本分段: ${text.length} 字符 → ${segments.length} 段, 各段长度: ${segments.map(s => s.length).join(', ')}`);
  return segments;
}

/** 检测 LLM 异常响应 */
export function isLLMResponseAbnormal(content: string | undefined | null): { abnormal: boolean; reason?: string } {
  // 只检测空内容，不做内容安全检测
  if (content === undefined || content === null) {
    return { abnormal: true, reason: "LLM 返回空内容" };
  }
  
  if (typeof content !== 'string') {
    return { abnormal: true, reason: `LLM 返回非字符串类型: ${typeof content}` };
  }
  
  if (content.trim().length === 0) {
    return { abnormal: true, reason: "LLM 返回空字符串" };
  }
  
  // 不再检测内容模式，直接返回正常
  return { abnormal: false };
}

/** 检查是否是 Kimi K2.5 模型（有特殊 temperature 限制） */
export function isKimiK25Model(model: string): boolean {
  return model === "kimi-k2-5-260127";
}

/** 获取适合模型的 temperature（Kimi K2.5 要求 0.6 或 1.0） */
export function getModelTemperature(model: string, requestedTemp: number): number {
  if (isKimiK25Model(model)) {
    // Kimi K2.5 只支持 0.6（非思考模式）或 1.0（思考模式）
    // 对于润色任务，使用 0.6 更稳定
    return 0.6;
  }
  return requestedTemp;
}

/** 快速调用 LLM */
export async function invokeLLM(
  client: LLMClient,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options?: { model?: string; temperature?: number }
): Promise<string> {
  const model = options?.model || DEFAULT_MODEL_PARAMS.model;
  const temperature = getModelTemperature(model, options?.temperature ?? DEFAULT_MODEL_PARAMS.temperature);
  
  const result = await client.invoke(messages, {
    model,
    temperature,
  });
  return result.content;
}

/** 带进度回调的 LLM 调用（包含响应验证） - 优化版：平滑线性进度 */
export async function invokeLLMWithProgress(
  client: LLMClient,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options: {
    model?: string;
    temperature?: number;
    onProgress?: (progress: number, message: string) => void;
    startProgress?: number;
    endProgress?: number;
    stageName?: string;
    timeout?: number; // 超时时间（毫秒）
  }
): Promise<string> {
  const { 
    onProgress, 
    startProgress = 15, 
    endProgress = 70, 
    stageName = "处理中",
    timeout = 120000 // 默认2分钟超时
  } = options;
  
  // 记录开始时间
  const startTime = Date.now();
  let currentProgress = startProgress;
  let isCompleted = false;
  
  // 平滑线性进度更新（每150ms更新一次，每次+0.3）
  // 这样进度条会持续平滑增长，不会卡顿
  const progressInterval = setInterval(() => {
    if (isCompleted) return;
    
    const elapsed = Date.now() - startTime;
    const elapsedRatio = elapsed / timeout;
    
    // 计算预期进度：在超时时间的80%时到达endProgress的95%
    // 留出5%给最终完成
    const targetProgress = startProgress + (endProgress - startProgress) * Math.min(elapsedRatio * 1.25, 0.95);
    
    // 平滑过渡到目标进度
    if (currentProgress < targetProgress) {
      // 使用较小的步进，确保平滑
      const step = Math.max(0.3, (targetProgress - currentProgress) * 0.1);
      currentProgress = Math.min(currentProgress + step, targetProgress, endProgress - 2);
      
      // 计算预估剩余时间
      const remainingRatio = (currentProgress - startProgress) / (endProgress - startProgress);
      const estimatedTotal = elapsed / Math.max(remainingRatio, 0.01);
      const remainingTime = Math.max(0, estimatedTotal - elapsed);
      
      let timeHint = "";
      if (remainingTime > 60000) {
        timeHint = ` · 约${Math.ceil(remainingTime / 60000)}分钟`;
      } else if (remainingTime > 10000) {
        timeHint = ` · 约${Math.ceil(remainingTime / 10000) * 10}秒`;
      }
      
      onProgress?.(Math.round(currentProgress), `${stageName}...${timeHint}`);
    }
    
    // 超时检查
    if (elapsed > timeout) {
      clearInterval(progressInterval);
      onProgress?.(endProgress - 5, `${stageName}超时，正在重试...`);
    }
  }, 150); // 更频繁的更新，确保进度条平滑
  
  try {
    // 创建超时Promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`LLM调用超时（${timeout / 1000}秒）`)), timeout);
    });
    
    // LLM调用
    const model = options.model || DEFAULT_MODEL_PARAMS.model;
    const temperature = getModelTemperature(model, options.temperature ?? DEFAULT_MODEL_PARAMS.temperature);
    
    const result = await Promise.race([
      client.invoke(messages, {
        model,
        temperature,
      }),
      timeoutPromise
    ]);
    
    isCompleted = true;
    clearInterval(progressInterval);
    
    // 验证响应是否正常
    const validation = isLLMResponseAbnormal(result.content);
    if (validation.abnormal) {
      console.error('[LLM] 异常响应:', validation.reason, '内容:', result.content?.substring(0, 200));
      throw new Error(`LLM 服务异常: ${validation.reason}。请检查 LLM 服务是否正常（可能欠费或被限流）。`);
    }
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    onProgress?.(endProgress, `${stageName}完成 (${totalTime}秒)`);
    
    return result.content;
  } catch (error) {
    isCompleted = true;
    clearInterval(progressInterval);
    throw error;
  }
}

// ============================================================================
// 重试机制
// ============================================================================

/** 重试配置 */
export interface RetryConfig {
  /** 最大重试次数 */
  maxRetries: number;
  /** 初始延迟（毫秒） */
  initialDelay: number;
  /** 最大延迟（毫秒） */
  maxDelay: number;
  /** 延迟倍数 */
  backoffMultiplier: number;
}

/** 默认重试配置 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

/** 判断错误是否可重试 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // 网络错误、超时、服务暂时不可用等可重试
    const retryablePatterns = [
      'timeout',
      'network',
      'connection',
      'econnrefused',
      'econnreset',
      'socket',
      'rate limit',
      'too many requests',
      'service unavailable',
      'internal server error',
      'bad gateway',
      'gateway timeout',
    ];
    return retryablePatterns.some(pattern => message.includes(pattern));
  }
  return false;
}

/** 延迟函数 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** 带重试的 LLM 调用 */
export async function invokeLLMWithRetry(
  client: LLMClient,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options?: {
    model?: string;
    temperature?: number;
    timeout?: number;
    retryConfig?: Partial<RetryConfig>;
    onRetry?: (attempt: number, error: Error, delay: number) => void;
  }
): Promise<string> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...options?.retryConfig };
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      // 创建超时Promise
      const timeout = options?.timeout || 120000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`LLM调用超时（${timeout / 1000}秒）`)), timeout);
      });
      
      // LLM调用
      const result = await Promise.race([
        client.invoke(messages, {
          model: options?.model || DEFAULT_MODEL_PARAMS.model,
          temperature: options?.temperature ?? DEFAULT_MODEL_PARAMS.temperature,
        }),
        timeoutPromise
      ]);
      
      // 验证响应是否正常
      const validation = isLLMResponseAbnormal(result.content);
      if (validation.abnormal) {
        throw new Error(`LLM 服务异常: ${validation.reason}`);
      }
      
      return result.content;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 检查是否可重试
      if (!isRetryableError(error) || attempt >= retryConfig.maxRetries) {
        throw lastError;
      }
      
      // 计算延迟（指数退避）
      const delayMs = Math.min(
        retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
        retryConfig.maxDelay
      );
      
      // 回调通知
      options?.onRetry?.(attempt, lastError, delayMs);
      console.log(`[LLM] 第${attempt}次调用失败，${delayMs}ms后重试:`, lastError.message);
      
      await delay(delayMs);
    }
  }
  
  throw lastError || new Error('LLM调用失败');
}

/** 带重试和进度回调的 LLM 调用 */
export async function invokeLLMWithProgressAndRetry(
  client: LLMClient,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options: {
    model?: string;
    temperature?: number;
    onProgress?: (progress: number, message: string) => void;
    startProgress?: number;
    endProgress?: number;
    stageName?: string;
    timeout?: number;
    retryConfig?: Partial<RetryConfig>;
  }
): Promise<string> {
  const { 
    onProgress, 
    startProgress = 15, 
    endProgress = 70, 
    stageName = "处理中",
    timeout = 120000,
    retryConfig = {}
  } = options;
  
  const fullRetryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= fullRetryConfig.maxRetries; attempt++) {
    try {
      // 调整进度范围，为重试留出空间
      const adjustedStart = startProgress + (attempt - 1) * 2;
      const adjustedEnd = endProgress - (fullRetryConfig.maxRetries - attempt) * 2;
      
      if (attempt > 1) {
        onProgress?.(adjustedStart, `重试第${attempt}次...`);
      }
      
      const result = await invokeLLMWithProgress(client, messages, {
        ...options,
        startProgress: adjustedStart,
        endProgress: adjustedEnd,
        timeout,
        onProgress,
      });
      
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 检查是否可重试
      if (!isRetryableError(error) || attempt >= fullRetryConfig.maxRetries) {
        console.error(`[LLM] 调用失败，已达最大重试次数(${fullRetryConfig.maxRetries}):`, lastError.message);
        throw lastError;
      }
      
      // 计算延迟
      const delayMs = Math.min(
        fullRetryConfig.initialDelay * Math.pow(fullRetryConfig.backoffMultiplier, attempt - 1),
        fullRetryConfig.maxDelay
      );
      
      console.log(`[LLM] 第${attempt}次调用失败，${delayMs}ms后重试:`, lastError.message);
      onProgress?.(startProgress, `调用失败，${Math.round(delayMs / 1000)}秒后重试...`);
      
      await delay(delayMs);
    }
  }
  
  throw lastError || new Error('LLM调用失败');
}
