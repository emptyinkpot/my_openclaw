/**
 * 步骤配置
 * 
 * 统一管理所有处理步骤的配置
 * 
 * @module config/steps
 */

import type { PolishStepConfig } from '@/modules/polish';

/**
 * 步骤定义
 * 
 * 这里集中定义所有步骤的配置信息
 * 包括步骤ID、名称、描述、依赖关系等
 */
export const STEP_DEFINITIONS: PolishStepConfig[] = [
  // ==========================================
  // 配置阶段
  // ==========================================
  {
    id: 'detect',
    name: 'AI检测',
    phase: 'config',
    description: '检测文本是否由AI生成',
    fixed: true,
    defaultSettings: { enabled: true },
  },
  {
    id: 'properNounCheck',
    name: '专有名词检查',
    phase: 'config',
    description: '检测并替换昭和/唐朝/法兰西等现实专有名词',
    defaultSettings: { enabled: true },
  },
  {
    id: 'narrativePerspective',
    name: '叙事视角',
    phase: 'config',
    description: '转换叙事视角（第一人称/第三人称）',
    defaultSettings: { enabled: false },
  },
  {
    id: 'classicalApply',
    name: '古典润色',
    phase: 'config',
    description: '应用古典文学风格润色',
    defaultSettings: { enabled: false },
  },
  {
    id: 'citationApply',
    name: '引用应用',
    phase: 'config',
    description: '应用文献库引用',
    defaultSettings: { enabled: false },
  },
  {
    id: 'particleApply',
    name: '助词优化',
    phase: 'config',
    description: '优化助词使用',
    defaultSettings: { enabled: false },
  },
  {
    id: 'punctuationApply',
    name: '标点规范',
    phase: 'config',
    description: '规范化标点符号使用',
    defaultSettings: { enabled: true },
  },
  {
    id: 'quoteProtect',
    name: '引用保护',
    phase: 'config',
    description: '保护引号和书名号内的内容',
    fixed: true,
    defaultSettings: { enabled: true },
  },
  {
    id: 'titleExtract',
    name: '标题提取',
    phase: 'config',
    description: '提取或生成文章标题',
    defaultSettings: { enabled: false },
  },
  
  // ==========================================
  // 处理阶段
  // ==========================================
  {
    id: 'polish',
    name: '智能润色',
    phase: 'process',
    description: '调用LLM进行智能润色',
    fixed: true,
    defaultSettings: { enabled: true },
  },
  {
    id: 'bannedWords',
    name: '禁用词处理',
    phase: 'process',
    description: '检测并替换禁用词、敏感词',
    defaultSettings: { enabled: true },
  },
  {
    id: 'sentencePatterns',
    name: '句式优化',
    phase: 'process',
    description: '优化句子结构',
    defaultSettings: { enabled: false },
  },
  {
    id: 'memeFuse',
    name: '梗融合',
    phase: 'process',
    description: '适度融入网络热梗',
    defaultSettings: { enabled: false },
  },
  {
    id: 'styleForge',
    name: '风格锻造',
    phase: 'process',
    description: '统一文本风格',
    defaultSettings: { enabled: false },
  },
  
  // ==========================================
  // 后处理阶段
  // ==========================================
  {
    id: 'markdownClean',
    name: '格式清理',
    phase: 'postprocess',
    description: '清理Markdown格式标记',
    fixed: true,
    defaultSettings: { enabled: true },
  },
  
  // ==========================================
  // 审稿阶段
  // ==========================================
  {
    id: 'semanticCheck',
    name: '语义检查',
    phase: 'review',
    description: '检查语义是否保持一致',
    fixed: true,
    defaultSettings: { enabled: true },
  },
  {
    id: 'finalReview',
    name: '最终审校',
    phase: 'review',
    description: '最终审校，确保质量',
    fixed: true,
    defaultSettings: { enabled: true },
  },
  {
    id: 'wordUsageCheck',
    name: '用词检查',
    phase: 'review',
    description: '检查用词是否准确',
    defaultSettings: { enabled: false },
  },
  {
    id: 'smartFix',
    name: '智能修复',
    phase: 'review',
    description: '智能修复发现的问题',
    defaultSettings: { enabled: false },
  },
  {
    id: 'breathSegment',
    name: '呼吸段优化',
    phase: 'review',
    description: '优化段落节奏',
    defaultSettings: { enabled: false },
  },
];

/**
 * 阶段顺序
 */
export const PHASE_ORDER = ['config', 'process', 'postprocess', 'review'] as const;

/**
 * 获取步骤配置
 */
export function getStepConfig(stepId: string): PolishStepConfig | undefined {
  return STEP_DEFINITIONS.find(s => s.id === stepId);
}

/**
 * 获取阶段步骤
 */
export function getPhaseSteps(phase: string): PolishStepConfig[] {
  return STEP_DEFINITIONS.filter(s => s.phase === phase);
}

/**
 * 获取默认设置
 */
export function getDefaultSettings(): Record<string, { enabled: boolean }> {
  const settings: Record<string, { enabled: boolean }> = {};
  
  STEP_DEFINITIONS.forEach(step => {
    settings[step.id] = step.defaultSettings || { enabled: !step.fixed };
  });
  
  return settings;
}

/**
 * 获取步骤执行顺序
 */
export function getExecutionOrder(enabledSteps: string[]): string[] {
  return PHASE_ORDER.flatMap(phase => 
    STEP_DEFINITIONS
      .filter(s => s.phase === phase && enabledSteps.includes(s.id))
      .map(s => s.id)
  );
}
