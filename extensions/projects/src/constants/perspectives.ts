/**
 * ============================================================================
 * 视角和标点配置
 * ============================================================================
 */

import { User, Eye, Shield } from "lucide-react";
import type { PerspectiveOption, PunctuationOption } from '@/types';

/** 视角选项 */
export const PERSPECTIVE_OPTIONS: PerspectiveOption[] = [
  { id: "first-person", title: "第一人称沉浸", desc: "以'我'叙述，严格限制认知范围", icon: User },
  { id: "limited-omniscient", title: "有限上帝视角", desc: "第三人称聚焦，不预知未来", icon: Eye, recommended: true },
  { id: "full-omniscient", title: "全知上帝视角", desc: "知晓后世结果，慎用", icon: Shield },
];

/** 标点选项 */
export const PUNCTUATION_OPTIONS: PunctuationOption[] = [
  { id: "banColon", label: "禁用冒号【：】", desc: "替换为逗号" },
  { id: "banParentheses", label: "禁用括号【（）】", desc: "内容转为正文" },
  { id: "banDash", label: "禁用破折号【——】", desc: "替换为逗号" },
  { id: "useJapaneseQuotes", label: "使用日文引号【「」】", desc: "中文引号\"\"转为日文引号" },
  { id: "useJapaneseBookMarks", label: "使用日文书名号【『』】", desc: "中文书名号《》转为日文书名号" },
  { id: "banMarkdown", label: "禁用Markdown语法", desc: "清理**加粗**、*斜体*、~~删除线~~等" },
];

/** 情感基调选项 */
export const EMOTIONAL_TONES = [
  "理性的悲怆", 
  "深情的冷酷", 
  "冷峻客观", 
  "悲壮激昂", 
  "苍凉沉郁", 
  "隐忍克制"
] as const;

/** 文言化程度描述 */
export function getClassicalDescription(ratio: number): string {
  if (ratio <= 20) return "白话为主";
  if (ratio <= 40) return "偏白话";
  if (ratio <= 60) return "文白参半";
  if (ratio <= 80) return "偏文言";
  return "文言为主";
}

/** 引用比例描述 */
export function getCitationDescription(ratio: number): string {
  if (ratio <= 10) return "极少引用";
  if (ratio <= 30) return "少量引用";
  if (ratio <= 50) return "适量引用";
  if (ratio <= 70) return "较多引用";
  return "大量引用";
}

/** 梗运用比例描述 */
export function getMemeDescription(ratio: number): string {
  if (ratio === 0) return "不使用梗";
  if (ratio <= 10) return "轻度点缀";
  if (ratio <= 20) return "适度融合";
  return "重度使用";
}
