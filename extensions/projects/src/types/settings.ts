/**
 * ============================================================================
 * 配置相关类型定义
 * ============================================================================
 */

import type { ResourceItem } from './vocabulary';

/** 标点符号设置 */
export interface PunctuationSettings {
  banColon: boolean;
  banParentheses: boolean;
  banDash: boolean;
  useJapaneseQuotes: boolean;      // 使用日文引号「」
  useJapaneseBookMarks: boolean;   // 使用日文书名号『』
  banMarkdown: boolean;            // 禁用Markdown语法
}

/** 虚词项 */
export interface ParticleItem {
  id: string;
  label: string;
  example?: string;
  count: number;
}

/** 虚词设置 */
export interface ParticleSettings {
  enableSmart: boolean;
  particles: ParticleItem[];
}

/** 处理步骤状态 */
export interface StepState {
  enabled: boolean;
}

/** 子选项配置 */
export interface SubOptions {
  enableChinesize: boolean;
  enableLLMSmart: boolean;
  memeSatire?: boolean;          // 梗融合：反讽优先
  enableSmartAssociate?: boolean; // 智能联想：根据已有资源推测更多相关内容
  enableDialogueFormat?: boolean; // 台词格式：一行一句，呼吸感分段
}

/** 增强选项配置（精选数据集成） */
export interface EnhanceOptions {
  /** 同义词替换（高频词汇） */
  enableSynonym?: boolean;
  /** AI检测对抗（替换AI特征词） */
  enableAntiAI?: boolean;
  /** 学术规范（口语→正式） */
  enableAcademic?: boolean;
  /** 清理低质量表达 */
  enableCleanLowQuality?: boolean;
  /** 文言风格转换 */
  enableClassical?: boolean;
  /** 文言程度 */
  classicalLevel?: 'literary' | 'classical';
  /** 改写强度 */
  intensity?: 'light' | 'medium' | 'heavy';
}

/** 历史叙事精校设置 */
export interface HistoricalNarrativeSettings {
  narrativePerspective: string;
  classicalRatio: number;
  perspective: string;
  era: string;
  faction: string;
  aiModel: string;
  stepOrder: string[];
  steps: Record<string, StepState>;
  subOptions: SubOptions;
  /** 增强选项（精选数据集成） */
  enhanceOptions?: EnhanceOptions;
  emotionalTone: string;
  punctuation: PunctuationSettings;
  particleSettings: ParticleSettings;
  /** 替换词风格（禁用词替换时使用） */
  replacementStyle?: 'classical_chinese' | 'japanese_chinese' | 'character_morphology' | 'mixed';
  /** 词汇库（API调用时传入）- 支持字符串数组或完整资源对象数组 */
  vocabulary?: (string | ResourceItem)[];
  /** 梗资源（API调用时传入）- 支持字符串数组或完整资源对象数组 */
  memes?: (string | ResourceItem)[];
  /** 文献资源（API调用时传入） */
  literatureResources?: LiteratureResource[];
  /** 禁用词库（API调用时传入） */
  bannedWords?: Array<{ content: string; alternative?: string; reason: string }>;
  /** 句子逻辑禁用库（API调用时传入） */
  sentencePatterns?: SentencePatternItem[];
}

/** AI模型配置 */
export interface AIModel {
  id: string;
  name: string;
  desc: string;
}

/** 视角选项 */
export interface PerspectiveOption {
  id: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  recommended?: boolean;
}

/** 标点选项 */
export interface PunctuationOption {
  id: keyof PunctuationSettings;
  label: string;
  desc: string;
}

/** 处理步骤定义 */
export interface StepDefinition {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
  fixed: boolean;
  phase?: "config" | "process" | "postprocess" | "review"; // 步骤所属阶段
  dependsOn?: string; // 依赖的配置项
  subOptions?: Array<{ id: string; label: string; desc: string }>;
}

/** 句子逻辑禁用项 */
export interface SentencePatternItem {
  id: string;
  content: string;           // 禁用表述
  similarPatterns?: string;  // 类似表述（AI识别）
  replacements: string[];    // 替换建议（多个，用数组存储，替换时根据上下文选择）
  reason: string;            // 禁用原因
  createdAt: number;
  updatedAt?: number;
}

/** 文献资源类型 */
export type LiteratureType = 'content' | 'book';

/** 文献资源 */
export interface LiteratureResource {
  id: string;
  type: LiteratureType;           // content: 直接添加内容, book: 书名（AI自动搜索）
  title: string;                  // 书名或标题
  content?: string;               // 文献内容（type=content时）
  author?: string;                // 作者
  preferredAuthors?: string[];    // 偏好作者（在可引用场景下优先引用其作品）
  tags?: string[];                // 标签（如：历史、文学、哲学）
  priority: number;               // 引用优先级（1-5，数字越大优先级越高）
  note?: string;                  // 使用说明
  createdAt: number;
  updatedAt?: number;
}
