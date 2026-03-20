/**
 * ============================================================================
 * 资源客户端 - 统一的云端数据访问层（重构版）
 * ============================================================================
 * 
 * 设计理念：
 * 1. 统一的 API 请求封装（带重试和错误处理）
 * 2. 通用的资源 API 工厂函数（减少重复代码）
 * 3. 类型安全的接口定义
 * 
 * 优化日志：
 * - 2024: 添加统一的错误处理和日志
 * - 2024: 添加指数退避重试机制
 * - 2024: 抽象通用资源 API 工厂
 */

import type { ResourceItem, MemeCategory, LiteratureResource, BannedWordItem } from '@/types';

// ============================================================================
// 类型定义
// ============================================================================

/** API 响应基础结构 */
interface ApiResponse<T> {
  success: boolean;
  items?: T[];
  stats?: Record<string, unknown>;
  data?: T;
  error?: string;
}

/** 资源 API 配置 */
interface ResourceApiConfig<T> {
  endpoint: string;
  itemType: string; // 用于日志
}

/** 请求选项 */
interface RequestOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

// ============================================================================
// 通用 API 请求工具（带重试和错误处理）
// ============================================================================

/** 默认请求选项 */
const DEFAULT_OPTIONS: RequestOptions = {
  timeout: 10000,
  retries: 2,
  retryDelay: 500,
};

/** 统一的错误处理和日志 */
function logError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ResourceClient] ${context}: ${message}`);
}

/** 延迟函数 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** 带重试的 fetch 请求 */
async function fetchWithRetry<T>(
  url: string,
  init: RequestInit,
  options: RequestOptions = {}
): Promise<T | null> {
  const { timeout, retries, retryDelay } = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= (retries || 0); attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout || 10000);
      
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 如果不是网络错误或超时，不重试
      if (lastError.message.includes('HTTP 4')) {
        break;
      }
      
      // 最后一次尝试失败，不再等待
      if (attempt < (retries || 0)) {
        await delay((retryDelay || 500) * (attempt + 1));
      }
    }
  }
  
  return null;
}

// ============================================================================
// 基础 HTTP 方法
// ============================================================================

async function apiGet<T>(
  endpoint: string, 
  params?: Record<string, string>,
  options?: RequestOptions
): Promise<ApiResponse<T> | null> {
  try {
    const url = params ? `${endpoint}?${new URLSearchParams(params)}` : endpoint;
    const result = await fetchWithRetry<ApiResponse<T>>(url, { method: 'GET' }, options);
    return result?.success ? result : null;
  } catch (error) {
    logError(`GET ${endpoint}`, error);
    return null;
  }
}

async function apiPost<T>(
  endpoint: string, 
  body: unknown,
  options?: RequestOptions
): Promise<ApiResponse<T> | null> {
  try {
    const result = await fetchWithRetry<ApiResponse<T>>(
      endpoint,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      options
    );
    return result?.success ? result : null;
  } catch (error) {
    logError(`POST ${endpoint}`, error);
    return null;
  }
}

async function apiPut<T>(
  endpoint: string, 
  body: unknown,
  options?: RequestOptions
): Promise<ApiResponse<T> | null> {
  try {
    const result = await fetchWithRetry<ApiResponse<T>>(
      endpoint,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      options
    );
    return result?.success ? result : null;
  } catch (error) {
    logError(`PUT ${endpoint}`, error);
    return null;
  }
}

async function apiDelete<T>(
  endpoint: string, 
  params: Record<string, string>,
  options?: RequestOptions
): Promise<ApiResponse<T> | null> {
  try {
    const url = `${endpoint}?${new URLSearchParams(params)}`;
    const result = await fetchWithRetry<ApiResponse<T>>(url, { method: 'DELETE' }, options);
    return result?.success ? result : null;
  } catch (error) {
    logError(`DELETE ${endpoint}`, error);
    return null;
  }
}

// ============================================================================
// 通用资源 API 工厂
// ============================================================================

/** 创建标准资源 API */
function createResourceApi<T extends { id: string }>(config: ResourceApiConfig<T>) {
  return {
    getAll: async (): Promise<T[]> => {
      const result = await apiGet<T>(config.endpoint);
      return result?.items || [];
    },

    add: async (items: T[]): Promise<boolean> => {
      const result = await apiPost<T>(config.endpoint, { items });
      if (result) {
        console.log(`[ResourceClient] 成功添加 ${items.length} 条${config.itemType}`);
      }
      return result !== null;
    },

    addOne: async (item: Omit<T, 'id' | 'createdAt'>): Promise<boolean> => {
      const result = await apiPost<T>(config.endpoint, item);
      return result !== null;
    },

    update: async (id: string, updates: Partial<T>): Promise<boolean> => {
      const result = await apiPut<T>(config.endpoint, { id, ...updates });
      return result !== null;
    },

    delete: async (id: string): Promise<boolean> => {
      const result = await apiDelete<T>(config.endpoint, { id });
      return result !== null;
    },
  };
}

// ============================================================================
// 梗资源 API（扩展版）
// ============================================================================

export const MemeApi = {
  ...createResourceApi<ResourceItem>({ endpoint: '/api/memes', itemType: '梗资源' }),

  /** 获取统计信息 */
  getStats: async () => {
    const result = await apiGet<{ totalCount: number; visibleCount: number; hiddenCount: number }>(
      '/api/memes',
      { action: 'stats' }
    );
    return result?.stats || null;
  },

  /** 检查重复 */
  checkDuplicates: async (contents: string[]): Promise<Map<string, boolean>> => {
    const result = await apiPost<Record<string, boolean>>('/api/memes', { 
      action: 'check-duplicates', 
      contents 
    });
    const map = new Map<string, boolean>();
    if (result?.data) {
      for (const [key, value] of Object.entries(result.data)) {
        map.set(key, value);
      }
    }
    return map;
  },
};

// ============================================================================
// 梗分类 API
// ============================================================================

export const MemeCategoryApi = createResourceApi<MemeCategory>({ 
  endpoint: '/api/meme-categories', 
  itemType: '梗分类' 
});

// ============================================================================
// 文献资源 API
// ============================================================================

export const LiteratureApi = {
  ...createResourceApi<LiteratureResource>({ 
    endpoint: '/api/literature', 
    itemType: '文献资源' 
  }),

  /** 获取统计信息 */
  getStats: async () => {
    const result = await apiGet<{ totalCount: number; bookCount: number; contentCount: number }>(
      '/api/literature',
      { action: 'stats' }
    );
    return result?.stats || null;
  },
};

// ============================================================================
// 禁用词 API
// ============================================================================

export const BannedWordsApi = {
  ...createResourceApi<BannedWordItem>({ 
    endpoint: '/api/banned-words', 
    itemType: '禁用词' 
  }),

  /** 获取统计信息 */
  getStats: async () => {
    const result = await apiGet<{ totalCount: number; typeStats: Record<string, number> }>(
      '/api/banned-words',
      { action: 'stats' }
    );
    return result?.stats || null;
  },
};

// ============================================================================
// 主资源库 API（词汇）
// ============================================================================

export const MainLibraryApi = {
  ...createResourceApi<ResourceItem>({ 
    endpoint: '/api/main-library', 
    itemType: '词汇' 
  }),

  /** 获取统计信息 */
  getStats: async () => {
    const result = await apiGet<{ totalCount: number; categoryStats: Record<string, number> }>(
      '/api/main-library',
      { action: 'stats' }
    );
    return result?.stats || null;
  },

  /** 初始化默认词汇 */
  init: async (): Promise<boolean> => {
    const result = await apiPost<ResourceItem>('/api/main-library/init', {});
    return result !== null;
  },
};

// ============================================================================
// 句子逻辑禁用库 API
// ============================================================================

export const SentencePatternsApi = createResourceApi<{ 
  id: string; 
  content: string; 
  replacements: string[];
  reason: string;
  createdAt: number;
}>({ 
  endpoint: '/api/sentence-patterns', 
  itemType: '句子逻辑禁用项' 
});
