/**
 * 流水线进度管理器
 * 管理 SSE 进度订阅和广播
 */

import { PipelineProgressEvent } from '../ContentPipeline';

// 活跃的 SSE 客户端
const clients = new Map<string, Set<{ write: (data: string) => void }>>();

// 进度缓存（用于新客户端连接时获取最新状态）
const progressCache = new Map<string, PipelineProgressEvent>();

/**
 * 注册 SSE 客户端
 */
export function registerClient(progressId: string, write: (data: string) => void): () => void {
  if (!clients.has(progressId)) {
    clients.set(progressId, new Set());
  }
  clients.get(progressId)!.add({ write });
  
  // 如果有缓存的进度，立即发送
  const cached = progressCache.get(progressId);
  if (cached) {
    write(`data: ${JSON.stringify(cached)}\n\n`);
  }
  
  // 返回取消注册函数
  return () => {
    const clientSet = clients.get(progressId);
    if (clientSet) {
      for (const client of clientSet) {
        if (client.write === write) {
          clientSet.delete(client);
          break;
        }
      }
      if (clientSet.size === 0) {
        clients.delete(progressId);
      }
    }
  };
}

/**
 * 广播进度事件
 */
export function broadcastProgress(progressId: string, event: PipelineProgressEvent): void {
  // 缓存最新进度
  progressCache.set(progressId, event);
  
  // 广播给所有客户端
  const clientSet = clients.get(progressId);
  if (clientSet) {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of clientSet) {
      try {
        client.write(data);
      } catch (e) {
        console.error('[ProgressManager] 发送失败:', e);
      }
    }
  }
  
  // 如果是完成或错误状态，清理缓存
  if (event.status === 'completed' || event.status === 'error') {
    setTimeout(() => {
      progressCache.delete(progressId);
    }, 60000); // 保留1分钟
  }
}

/**
 * 清理过期的进度缓存
 */
export function cleanupExpiredProgress(): void {
  // 目前简化处理，后续可以添加过期时间检查
  if (progressCache.size > 100) {
    // 保留最近50个
    const keys = Array.from(progressCache.keys());
    for (let i = 0; i < keys.length - 50; i++) {
      progressCache.delete(keys[i]);
    }
  }
}
