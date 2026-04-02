/**
 * 流水线进度管理器
 * 管理 SSE 进度订阅和广播
 */
import { PipelineProgressEvent } from '../content-pipeline/ContentPipeline';
/**
 * 注册 SSE 客户端
 */
export declare function registerClient(progressId: string, write: (data: string) => void): () => void;
/**
 * 广播进度事件
 */
export declare function broadcastProgress(progressId: string, event: PipelineProgressEvent): void;
/**
 * 清理过期的进度缓存
 */
export declare function cleanupExpiredProgress(): void;
