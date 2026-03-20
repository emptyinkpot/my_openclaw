/**
 * ============================================================================
 * API 相关类型定义
 * ============================================================================
 */

import type { 
  HistoricalNarrativeSettings,
  LiteratureResource,
  SentencePatternItem,
} from './settings';

// 重新导出供外部使用
export type { 
  LiteratureResource,
  SentencePatternItem,
};

/** 分析结果 */
export interface Analysis {
  replacements: Array<{ original: string; replaced: string; reason: string }>;
  changes?: Array<{ original: string; changed: string; rule?: string }>;
  summary: string;
  aiScore?: number; // AI检测分数
}

/** SSE 消息类型 */
export interface SSEMessage {
  progress?: number;
  message?: string;
  text?: string;
  title?: string;
  reports?: Array<{ step: string; report: string }>;
  analysis?: Analysis;
  error?: string;
  status?: string;
}

/** API 请求体 - 历史精校 */
export interface HistoricalNarrativeRequest {
  text: string;
  settings: HistoricalNarrativeSettings;
}

/** API 请求体 - 润色 */
export interface PolishRequest {
  text: string;
  vocabulary?: string[];
  enableChinesize?: boolean;
}

/** 识别的上下文 */
export interface DetectedContext {
  perspective?: string;
  era?: string;
  faction?: string;
}
