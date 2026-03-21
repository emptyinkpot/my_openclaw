/**
 * 服务启动引导
 * 注册所有依赖注入的服务
 * 
 * @module core/di/bootstrap
 */

import { container } from './container';
import { ServiceTokens } from './tokens';
import { QuoteProtector } from '@/lib/quote-protector';
import { LLMClientManager, invokeLLM } from '@/lib/llm-client';

/**
 * 服务引导配置
 */
interface BootstrapConfig {
  /** LLM提供商 */
  llmProvider?: 'openai' | 'deepseek' | 'doubao';
  /** 是否启用缓存 */
  enableCache?: boolean;
}

// 引导状态
let isBootstrapped = false;

/**
 * 启动服务注册
 */
export function bootstrapServices(config: BootstrapConfig = {}): void {
  if (isBootstrapped) return;
  
  // ==========================================
  // 基础设施层
  // ==========================================
  
  // LLM客户端 - 使用现有的 LLMClientManager
  container.registerFactory(ServiceTokens.LLM_CLIENT, () => {
    return {
      generate: async (messages: any[], options?: any) => {
        const client = LLMClientManager.getClient();
        return invokeLLM(client, messages, {
          model: options?.model,
          temperature: options?.temperature,
        });
      },
      generateStream: async (messages: any[], options?: any, onChunk?: (chunk: string) => void) => {
        const client = LLMClientManager.getClient();
        // 使用 invokeLLM 进行同步调用，流式需要特殊处理
        const result = await invokeLLM(client, messages, {
          model: options?.model,
          temperature: options?.temperature,
        });
        // 模拟流式输出
        if (onChunk) {
          const chunks = result.split('');
          for (const chunk of chunks) {
            onChunk(chunk);
          }
        }
        return result;
      },
      countTokens: (text: string) => {
        const chinese = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const others = text.length - chinese;
        return Math.ceil(chinese / 1.5 + others / 4);
      },
    };
  });
  
  // 引用保护器 - 使用现有的 QuoteProtector 对象
  container.registerSingleton(ServiceTokens.QUOTE_PROTECTOR, {
    protect: (text: string) => {
      const result = QuoteProtector.protect(text);
      return { text: result.text, map: result.map, count: result.map.size };
    },
    restore: (text: string, map: Map<string, string>) => {
      return QuoteProtector.restore(text, map);
    },
    hasProtectedContent: (text: string) => {
      return /\【Q\d+\】/.test(text);
    },
  });
  
  // ==========================================
  // 业务层（延迟加载）
  // ==========================================
  
  // 润色流水线
  container.registerLazySingleton(ServiceTokens.POLISH_PIPELINE, async () => {
    const { PolishPipeline } = await import('@/modules/polish/pipeline');
    return new PolishPipeline();
  });
  
  isBootstrapped = true;
  console.log('[DI] Services bootstrapped');
}

/**
 * 重置服务（仅用于测试）
 */
export function resetServices(): void {
  container.clear();
  isBootstrapped = false;
}

/**
 * 检查服务是否已启动
 */
export function isServicesBootstrapped(): boolean {
  return isBootstrapped;
}
