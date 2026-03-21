/**
 * ============================================================================
 * AI 模型配置
 * ============================================================================
 */

import type { AIModel } from '@/types';

export const AI_MODELS: AIModel[] = [
  { id: "doubao-seed-2-0-lite-260215", name: "Doubao Seed Lite", desc: "快速" },
  { id: "doubao-pro-256k", name: "Doubao Pro", desc: "强大" },
];

/** 默认模型 */
export const DEFAULT_MODEL = AI_MODELS[0].id;
