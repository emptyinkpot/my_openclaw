/**
 * 配置模块导出
 * 
 * @module config
 */

export {
  STEP_DEFINITIONS,
  PHASE_ORDER,
  getStepConfig,
  getPhaseSteps,
  getDefaultSettings,
  getExecutionOrder,
} from './steps';

/**
 * 默认润色设置
 */
export const DEFAULT_POLISH_SETTINGS = {
  steps: {
    // 配置阶段
    detect: { enabled: true },
    properNounCheck: { enabled: true },
    narrativePerspective: { enabled: false },
    classicalApply: { enabled: false },
    citationApply: { enabled: false },
    particleApply: { enabled: false },
    punctuationApply: { enabled: true },
    quoteProtect: { enabled: true },
    titleExtract: { enabled: false },
    
    // 处理阶段
    polish: { enabled: true },
    bannedWords: { enabled: true },
    sentencePatterns: { enabled: false },
    memeFuse: { enabled: false },
    styleForge: { enabled: false },
    
    // 后处理阶段
    markdownClean: { enabled: true },
    
    // 审稿阶段
    semanticCheck: { enabled: true },
    finalReview: { enabled: true },
    wordUsageCheck: { enabled: false },
    smartFix: { enabled: false },
    breathSegment: { enabled: false },
  },
  global: {
    style: 'narrative' as const,
    language: 'zh-CN',
    temperature: 0.7,
  },
};

/**
 * 模型配置
 */
export const MODEL_CONFIG = {
  defaultModel: process.env.LLM_MODEL || 'doubao-seed-1-6',
  
  models: {
    'doubao-seed-1-6': {
      name: '豆包 Seed 1.6',
      maxTokens: 4096,
      temperature: 0.7,
    },
    'deepseek-chat': {
      name: 'DeepSeek Chat',
      maxTokens: 4096,
      temperature: 0.7,
    },
  },
};
