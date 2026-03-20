/**
 * ============================================================================
 * Prompt 构建器 - 统一步骤管理版
 * ============================================================================
 * 
 * 设计理念：
 * 1. 按用户配置的步骤顺序生成指令
 * 2. 每个步骤独立生成指令
 * 3. 前置配置 + 核心处理 + 审稿验证 三阶段
 */

import type { HistoricalNarrativeSettings } from '@/types';
import { getClassicalDescription, getCitationDescription } from '@/constants';
import { buildParticleLimits } from '@/constants/particles';
import { STEP_PROMPT_BUILDERS } from './step-prompt-builders';
import { LEGACY_STEP_MAPPING } from '@/constants/processing-steps';
import { TextProcessor } from './text-processor';

// ============================================================================
// 工具函数
// ============================================================================

/** 构建视角描述 */
export function buildPerspectiveText(perspective: string): string {
  const map: Record<string, string> = {
    "first-person": "第一人称沉浸",
    "limited-omniscient": "有限上帝视角",
    "full-omniscient": "全知上帝视角"
  };
  return map[perspective] || map["limited-omniscient"];
}

/** 构建禁令列表 */
export function buildBans(punctuation: any): string[] {
  const bans: string[] = [];
  if (punctuation?.banDash) bans.push("禁破折号【——】，替换为逗号【，】");
  if (punctuation?.banColon) bans.push("禁冒号【：】，替换为逗号【，】");
  if (punctuation?.banParentheses) bans.push("禁括号【（）】，括号内容转为正文");
  bans.push("禁改引用内容");
  return bans;
}

/** 迁移旧版步骤ID */
function migrateStepId(stepId: string): string {
  return LEGACY_STEP_MAPPING[stepId] || stepId;
}

// ============================================================================
// 核心 Prompt 构建函数
// ============================================================================

/**
 * 构建 System Prompt
 * 按步骤顺序生成指令
 */
export function buildPrompt(
  text: string,
  settings: HistoricalNarrativeSettings,
  stepIds: string[]
): { system: string; user: string } {
  const {
    narrativePerspective,
    classicalRatio,
    perspective,
    era,
    faction,
    emotionalTone,
    punctuation,
    particleSettings,
  } = settings;

  // 迁移旧版步骤ID
  const migratedStepIds = stepIds.map(migrateStepId);
  
  // 获取启用的步骤
  const enabledSteps = migratedStepIds.filter(id => settings.steps?.[id]?.enabled);
  
  // 构建视角文本
  const classicalText = getClassicalDescription(classicalRatio);
  
  // 构建禁令
  const safePunctuation = punctuation || { banColon: true, banParentheses: true, banDash: true };
  const bans = buildBans(safePunctuation);

  // ==================== 核心约束 ====================
  const coreConstraints = `⛔【最高优先级】
任务：只做词汇替换，不重写句子！
禁止：改变句子结构、改变大意、删除新增内容
允许：替换同义词、调整标点
保护：引用内容（引号书名号内）、专有名词（人名地名机构名）
`;

  // ==================== 配置前置确认 ====================
  const configPreConfirmation = `【核心配置】
文言化：${classicalRatio}% - ${classicalText}
${classicalRatio <= 20 ? `禁止文言：之乎者也、是以、由是` : ''}
标点：${safePunctuation.banDash ? "禁破折号 " : ""}${safePunctuation.banColon ? "禁冒号 " : ""}${safePunctuation.banParentheses ? "禁括号" : "无限制"}
`;

  // ==================== 简化步骤提示 ====================
  const stepHint = `【处理步骤】${enabledSteps.map(id => {
    const names: Record<string, string> = {
      detect: "自动识别",
      properNounCheck: "专有名词检查",
      narrativePerspective: "叙事视角",
      classicalApply: "文言化",
      citationApply: "引用应用",
      particleApply: "虚词限制",
      punctuationApply: "标点规范",
      quoteProtect: "引用保护",
      polish: "词汇润色",
      bannedWords: "反感词净化",
      sentencePatterns: "句式逻辑净化",
      memeFuse: "梗融合",
      styleForge: "风格熔铸",
      markdownClean: "格式净化",
      titleExtract: "标题提取",
      semanticCheck: "语义检查",
      finalReview: "综合审稿",
      wordUsageCheck: "用词审查",
      smartFix: "智能微调",
      breathSegment: "呼吸感分段",
    };
    return names[id] || id;
  }).join(' → ')}`;

  // ==================== 按步骤生成指令 ====================
  let stepInstructions = "";
  
  enabledSteps.forEach(stepId => {
    const builder = STEP_PROMPT_BUILDERS[stepId];
    if (builder) {
      stepInstructions += builder(settings);
    }
  });

  // ==================== 组装 System Prompt ====================
  // 识别原文中的专有名词
  const properNouns = TextProcessor.identifyProperNouns(text);
  const properNounProtection = TextProcessor.generateProperNounProtection(properNouns);
  
  // 检查是否有引用占位符需要保护
  const hasPlaceholders = /【Q\d+】/.test(text);
  const placeholderProtection = hasPlaceholders ? `
【保护占位符】【Q0】【Q1】等必须原样保留
` : '';

  // 台词格式指令
  const dialogueFormat = settings.subOptions?.enableDialogueFormat ? `
【台词格式】一行一句，按语义换行
` : '';
  
  const systemPrompt = `你是文本润色助手，只换词不重写。

${coreConstraints}
${properNounProtection}
${placeholderProtection}
${configPreConfirmation}
${stepHint}
${stepInstructions}

【输出格式 - 必须严格遵守】
⚠️ 直接输出处理后的文本，不要输出任何 JSON、元数据、说明文字
⚠️ 不要输出 {「perspective」:...} 或 {"perspective":...} 这类内容
⚠️ 第一行就直接是处理后的文本开头

`;

  const userPrompt = `润色以下文本（只换词，不重写）：
${text}`;

  return {
    system: `${systemPrompt}
${dialogueFormat}`,
    user: userPrompt,
  };
}

// ============================================================================
// 导出兼容函数
// ============================================================================

export { buildParticleLimits } from '@/constants/particles';
export { getClassicalDescription, getCitationDescription } from '@/constants';
