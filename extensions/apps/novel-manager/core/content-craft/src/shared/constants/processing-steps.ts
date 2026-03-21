/**
 * ============================================================================
 * 处理步骤配置
 * ============================================================================
 * 
 * 步骤分类：
 * - 前置配置阶段：将用户配置转化为处理指令
 * - 核心处理阶段：实际的文本润色与改写操作
 * - 后处理阶段：清理 LLM 输出中的格式问题
 * - 审稿验证阶段：确保处理结果符合要求
 */

import { 
  Search, Languages, BookOpen, Type, Pencil, Sparkles, AlertTriangle, 
  Eraser, Laugh, Ban, MessageSquare, Palette, Layout,
  AlignJustify, FileCheck, CheckCircle, Bug, Wrench, FileX, Shield, FileText, Globe, Eye
} from "lucide-react";
import type { StepDefinition } from '@/types';

// ============================================================================
// 步骤分类
// ============================================================================

export const STEP_PHASES = {
  config: {
    title: "前置配置",
    description: "将用户配置转化为处理指令",
    color: "blue",
  },
  process: {
    title: "核心处理",
    description: "实际的文本润色与改写操作",
    color: "purple",
  },
  postprocess: {
    title: "后处理",
    description: "清理输出格式问题",
    color: "cyan",
  },
  review: {
    title: "审稿验证",
    description: "确保处理结果符合要求",
    color: "green",
  },
} as const;

// ============================================================================
// 步骤定义（精简版：17 个步骤）
// ============================================================================

export const STEP_DEFINITIONS: Record<string, StepDefinition> = {
  // ==================== 前置配置阶段（5个）====================
  detect: { 
    id: "detect", 
    title: "自动识别", 
    icon: Search, 
    description: "识别叙事角色、年代、阵营", 
    color: "blue", 
    fixed: true, // 固定不可关闭
    phase: "config",
    subOptions: [] 
  },
  properNounCheck: { 
    id: "properNounCheck", 
    title: "专有名词检查", 
    icon: Globe, 
    description: "检测并替换现实世界专有名词（昭和、唐朝、法兰西等）", 
    color: "rose", 
    fixed: false,
    phase: "config",
    subOptions: [] 
  },
  narrativePerspective: { 
    id: "narrativePerspective", 
    title: "叙事视角", 
    icon: Eye, 
    description: "调整文本的叙事视角（第一人称/第三人称）", 
    color: "blue", 
    fixed: false,
    phase: "config",
    subOptions: [] 
  },
  classicalApply: { 
    id: "classicalApply", 
    title: "文言化应用", 
    icon: Languages, 
    description: "根据设定的文言化程度，调整语言风格", 
    color: "amber", 
    fixed: false,
    phase: "config",
    subOptions: [],
    dependsOn: "classicalRatio",
  },
  citationApply: { 
    id: "citationApply", 
    title: "引用应用", 
    icon: BookOpen, 
    description: "根据设定的引用比例，插入文献引用", 
    color: "blue", 
    fixed: false,
    phase: "config",
    subOptions: [],
  },
  particleApply: { 
    id: "particleApply", 
    title: "虚词限制", 
    icon: Type, 
    description: "根据虚词设置，控制虚词的使用数量", 
    color: "rose", 
    fixed: false,
    phase: "config",
    subOptions: [],
    dependsOn: "particleSettings",
  },
  punctuationApply: { 
    id: "punctuationApply", 
    title: "标点规范", 
    icon: Pencil, 
    description: "禁用/替换特定标点（破折号、冒号、括号）", 
    color: "orange", 
    fixed: false,
    phase: "config",
    subOptions: [],
    dependsOn: "punctuation",
  },
  quoteProtect: { 
    id: "quoteProtect", 
    title: "引用保护", 
    icon: Shield, 
    description: "保护引号、书名号内的内容不被修改", 
    color: "emerald", 
    fixed: false,
    phase: "config",
    subOptions: [],
  },

  // ==================== 核心处理阶段（6个）====================
  polish: { 
    id: "polish", 
    title: "词汇润色", 
    icon: Sparkles, 
    description: "匹配词汇库近义词替换，审慎避免歧义", 
    color: "indigo", 
    fixed: false,
    phase: "process",
    subOptions: [
      { id: "enableChinesize", label: "中文化转换", desc: "欧化转中式" },
      { id: "enableDialogueFormat", label: "台词格式", desc: "一行一句" }
    ] 
  },
  bannedWords: { 
    id: "bannedWords", 
    title: "反感词净化", 
    icon: AlertTriangle, 
    description: "清除禁用词/反感词/劣质比喻，替换为优选表达", 
    color: "red", 
    fixed: false,
    phase: "process",
    subOptions: [] 
  },
  sentencePatterns: { 
    id: "sentencePatterns", 
    title: "句式逻辑净化", 
    icon: Ban, 
    description: "识别并替换禁用的句式逻辑表达", 
    color: "rose", 
    fixed: false,
    phase: "process",
    subOptions: [] 
  },
  memeFuse: {
    id: "memeFuse",
    title: "梗融合",
    icon: Laugh,
    description: "融合网络梗，避免语义歧义",
    color: "purple",
    fixed: false,
    phase: "process",
    subOptions: [{ id: "memeSatire", label: "反讽优先", desc: "优先反讽效果" }]
  },
  styleForge: { 
    id: "styleForge", 
    title: "风格熔铸", 
    icon: Palette, 
    description: "统一比喻风格，植入细节描写", 
    color: "violet", 
    fixed: false,
    phase: "process",
    subOptions: [] 
  },

  // ==================== 后处理阶段（1个）====================
  markdownClean: { 
    id: "markdownClean", 
    title: "格式净化", 
    icon: FileX, 
    description: "清理 Markdown 语法（**加粗**、~~删除线~~等）", 
    color: "cyan", 
    fixed: false,
    phase: "postprocess",
    subOptions: [] 
  },

  // ==================== 审稿验证阶段（5个）====================
  semanticCheck: { 
    id: "semanticCheck", 
    title: "语义检查", 
    icon: FileCheck, 
    description: "检查语义是否改变、有无歧义", 
    color: "green", 
    fixed: false,
    phase: "review",
    subOptions: [] 
  },
  finalReview: { 
    id: "finalReview", 
    title: "综合审稿", 
    icon: CheckCircle, 
    description: "综合审稿：检查通顺度、风格统一、配置达成", 
    color: "teal", 
    fixed: false,
    phase: "review",
    subOptions: [] 
  },
  wordUsageCheck: { 
    id: "wordUsageCheck", 
    title: "用词审查", 
    icon: Bug, 
    description: "审查用词不当、语义错配，识别替换产生的错误", 
    color: "orange", 
    fixed: false,
    phase: "review",
    subOptions: [] 
  },
  smartFix: { 
    id: "smartFix", 
    title: "智能微调", 
    icon: Wrench, 
    description: "智能修正用词错误，确保语义准确、表达自然", 
    color: "amber", 
    fixed: false,
    phase: "review",
    subOptions: [] 
  },
  breathSegment: { 
    id: "breathSegment", 
    title: "呼吸感分段", 
    icon: AlignJustify, 
    description: "按朗读节奏分段，不改内容", 
    color: "cyan", 
    fixed: false,
    phase: "review",
    subOptions: [] 
  },
  titleExtract: { 
    id: "titleExtract", 
    title: "标题提取", 
    icon: FileText, 
    description: "识别并提取文本标题，分开输出标题和正文", 
    color: "blue", 
    fixed: false,
    phase: "postprocess",
    subOptions: [] 
  },
};

// ============================================================================
// 默认步骤顺序（精简版：17 个步骤）
// ============================================================================

export const DEFAULT_STEP_ORDER = [
  // 前置配置阶段
  "detect",
  "properNounCheck",
  "narrativePerspective",
  "classicalApply",
  "citationApply", 
  "particleApply",
  "punctuationApply",
  "quoteProtect",
  // 核心处理阶段
  "polish",
  "bannedWords",
  "sentencePatterns",
  "memeFuse",
  "styleForge",
  // 后处理阶段
  "markdownClean",
  // 审稿验证阶段
  "semanticCheck",
  "finalReview",
  "wordUsageCheck",
  "smartFix",
  "breathSegment",
  // 标题提取（最后）
  "titleExtract",
];

// ============================================================================
// 兼容旧版本：映射旧步骤ID到新步骤ID
// ============================================================================

export const LEGACY_STEP_MAPPING: Record<string, string> = {
  "step1": "bannedWords",  // 原"语境净化"功能已合并到"反感词净化"
  "step2": "sentencePatterns",  // 原"句式净化"功能已合并到"句式逻辑净化"
  "step3": "styleForge",  // 情感客体化合并到风格熔铸
  "step4": "styleForge",
  "step5": "finalReview",
  "step6": "semanticCheck",
  "step7": "breathSegment",
  // 删除的步骤映射到功能相近的步骤
  "contextClean": "bannedWords",
  "sentenceClean": "sentencePatterns",
  "readAloudCheck": "finalReview",
  "styleCheck": "finalReview",
  "configVerify": "finalReview",
  "emotionObjectify": "styleForge",
  "headTailDesign": "finalReview",
};

// ============================================================================
// 步骤工具函数
// ============================================================================

/** 创建默认步骤状态 */
export function createDefaultSteps(): Record<string, { enabled: boolean }> {
  const steps: Record<string, { enabled: boolean }> = {};
  
  // ==================== 前置配置阶段 ====================
  steps["detect"] = { enabled: true };         // 固定开启
  steps["properNounCheck"] = { enabled: true }; // 专有名词检查
  steps["narrativePerspective"] = { enabled: true }; // 叙事视角
  steps["classicalApply"] = { enabled: true }; // 文言化应用
  steps["citationApply"] = { enabled: true };  // 引用应用
  steps["particleApply"] = { enabled: true };  // 虚词限制
  steps["punctuationApply"] = { enabled: true }; // 标点规范
  steps["quoteProtect"] = { enabled: true };   // 引用保护
  
  // ==================== 核心处理阶段 ====================
  steps["polish"] = { enabled: true };          // 词汇润色
  steps["bannedWords"] = { enabled: true };     // 反感词净化
  steps["sentencePatterns"] = { enabled: true }; // 句式逻辑净化
  steps["memeFuse"] = { enabled: true };        // 梗融合
  steps["styleForge"] = { enabled: true };      // 风格熔铸
  
  // ==================== 后处理阶段 ====================
  steps["markdownClean"] = { enabled: true };   // 格式净化
  
  // ==================== 审稿验证阶段 ====================
  steps["semanticCheck"] = { enabled: true };   // 语义检查
  steps["finalReview"] = { enabled: true };     // 综合审稿
  steps["wordUsageCheck"] = { enabled: true };  // 用词审查
  steps["smartFix"] = { enabled: true };        // 智能微调
  steps["breathSegment"] = { enabled: true };   // 呼吸感分段
  
  // ==================== 标题提取 ====================
  steps["titleExtract"] = { enabled: true };    // 标题提取
  
  return steps;
}

/** 获取步骤的阶段 */
export function getStepPhase(stepId: string): string {
  const step = STEP_DEFINITIONS[stepId];
  return step?.phase || "process";
}

/** 按阶段分组获取步骤 */
export function getStepsByPhase(): Record<string, string[]> {
  const result: Record<string, string[]> = {
    config: [],
    process: [],
    postprocess: [],
    review: [],
  };
  
  DEFAULT_STEP_ORDER.forEach(stepId => {
    const phase = getStepPhase(stepId);
    if (result[phase]) {
      result[phase].push(stepId);
    }
  });
  
  return result;
}

/** 迁移旧版步骤状态 */
export function migrateLegacySteps(
  oldSteps: Record<string, { enabled: boolean }>
): Record<string, { enabled: boolean }> {
  const newSteps = createDefaultSteps();
  
  Object.entries(oldSteps).forEach(([oldId, state]) => {
    const newId = LEGACY_STEP_MAPPING[oldId] || oldId;
    if (newSteps[newId] !== undefined) {
      newSteps[newId] = state;
    }
  });
  
  return newSteps;
}

/** 获取步骤的依赖配置项 */
export function getStepDependency(stepId: string): string | undefined {
  const step = STEP_DEFINITIONS[stepId];
  return step?.dependsOn;
}

/** 迁移旧版步骤顺序 */
export function migrateLegacyStepOrder(oldOrder: string[]): string[] {
  const migrated = oldOrder
    .map(oldId => LEGACY_STEP_MAPPING[oldId] || oldId)
    .filter(id => STEP_DEFINITIONS[id] !== undefined);
  
  // 去重并保持顺序
  const seen = new Set<string>();
  const unique = migrated.filter(id => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  
  // 补充缺失的步骤
  DEFAULT_STEP_ORDER.forEach(id => {
    if (!seen.has(id)) {
      unique.push(id);
    }
  });
  
  return unique;
}

// ============================================================================
// 导出新版默认配置（用于向后兼容）
// ============================================================================

export const NEW_DEFAULT_STEP_ORDER = DEFAULT_STEP_ORDER;
export const createNewDefaultSteps = createDefaultSteps;
