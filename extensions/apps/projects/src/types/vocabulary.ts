/**
 * ============================================================================
 * 资源库相关类型定义
 * ============================================================================
 */

/** 资源类型 */
export type ResourceType = 'vocabulary' | 'meme' | 'literature' | 'bannedWord';

/** 梗分类（带详细描述和使用场景） */
export interface MemeCategory {
  id: string;
  name: string;
  description: string;          // 分类描述
  usageScenario?: string;        // 使用场景说明（可选）
  examples?: string[];          // 使用示例
  createdAt: number;
  updatedAt?: number;           // 更新时间（可选）
}

/** 资源项（支持词汇和梗） */
export interface ResourceItem {
  id: string;
  content: string;
  type: ResourceType;           // vocabulary 或 meme
  category: string;             // 分类ID或名称
  categoryName?: string;        // 分类显示名称
  tags?: string[];              // 标签
  note?: string;                // 备注
  usageExample?: string;        // 使用示例（梗资源专用）
  createdAt: number;
  updatedAt?: number;
}

/** 词汇项（兼容旧版） */
export interface VocabularyItem {
  id: string;
  content: string;
  type: string;
  meaning: string;
  usage: string;
  category: string;
  createdAt: number;
}

/** 资源分类配置 */
export interface CategoryConfig {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  patterns: RegExp[];
}

/** 词汇分类类型 */
export type VocabularyCategory = 'person' | 'place' | 'organization' | 'time' | 'number' | 'action' | 'adjective' | '其他';

/** ============================================================================
 * 一键导出数据格式
 * ============================================================================
 */

/** 导出数据版本 */
export const EXPORT_VERSION = "2.0";

/** 一键导出的完整数据格式 */
export interface FullExportData {
  /** 数据格式版本号 */
  version: string;
  /** 导出时间 */
  exportedAt: string;
  /** 导出来源 */
  source: string;
  
  /** 词汇资源 */
  vocabulary: ResourceItem[];
  
  /** 文献资源 */
  literature: import('./settings').LiteratureResource[];
  
  /** 禁用词资源 */
  bannedWords: BannedWordItem[];
  
  /** 用户设置（可选） */
  userSettings?: {
    classicalRatio?: number;
    narrativePerspective?: string;
    aiModel?: string;
  };
}

/** 梗分类类型 */
export type MemeCategoryType = '反讽' | '幽默' | '流行语' | '网络热词' | '经典台词' | '文学引用' | '其他';

/** 禁用词分类类型 */
export type BannedWordType = 'modern' | 'ai_style' | 'god_view' | 'subjective' | 'lens' | 'format' | 'cheap_metaphor' | 'parentheses';

/** 禁用词项 */
export interface BannedWordItem {
  id: string;
  content: string;              // 禁用词内容
  type: BannedWordType;         // 禁用词类型
  category: string;             // 分类名称
  reason: string;               // 禁用原因
  alternative?: string;         // 替代建议
  createdAt: number;
  updatedAt?: number;
}

/** 资源库导出数据结构 */
export interface ResourceExportData {
  version: string;
  exportedAt: string;
  items: ResourceItem[];
  memeCategories?: MemeCategory[];  // 梗分类配置
}

