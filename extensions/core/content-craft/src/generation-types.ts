/**
 * 文本生成模块类型定义
 * 
 * @module modules/generation/types
 */

/**
 * 从数据库生成的输入参数
 */
export interface GenerateFromDbInput {
  /** 作品 ID */
  workId: number;
  /** 要生成的章节号 */
  chapterNumber: number;
  /** 关联章节数量（默认 2） */
  relatedChapterCount?: number;
  /** 生成设置（可选，使用默认值） */
  settings?: GenerationSettings;
}

// ============================================
// 基础类型
// ============================================

/**
 * 人物设定
 */
export interface Character {
  /** 人物ID */
  id: string;
  /** 人物姓名 */
  name: string;
  /** 人物别名 */
  aliases?: string[];
  /** 人物描述 */
  description: string;
  /** 性格特点 */
  personality: string[];
  /** 外貌描述 */
  appearance?: string;
  /** 背景故事 */
  background?: string;
  /** 人物关系 */
  relationships?: Array<{
    characterId: string;
    relationship: string;
    description: string;
  }>;
}

/**
 * 故事背景
 */
export interface StoryBackground {
  /** 背景ID */
  id: string;
  /** 背景名称 */
  name: string;
  /** 世界观设定 */
  worldSetting: string;
  /** 时间线 */
  timeline?: Array<{
    time: string;
    event: string;
  }>;
  /** 地理设定 */
  geography?: string;
  /** 社会设定 */
  society?: string;
  /** 其他设定 */
  other?: string;
}

/**
 * 大纲
 */
export interface Outline {
  /** 大纲ID */
  id: string;
  /** 大纲名称 */
  name: string;
  /** 整体故事概要 */
  summary: string;
  /** 主题 */
  theme?: string;
  /** 风格 */
  style?: string;
  /** 卷纲列表 */
  volumes?: VolumeOutline[];
}

/**
 * 卷纲
 */
export interface VolumeOutline {
  /** 卷号 */
  volumeNumber: number;
  /** 卷名 */
  title: string;
  /** 卷概要 */
  summary: string;
  /** 章节列表 */
  chapters?: ChapterOutline[];
}

/**
 * 章节细纲
 */
export interface ChapterOutline {
  /** 章节号 */
  chapterNumber: number;
  /** 章节标题 */
  title?: string;
  /** 章节概要 */
  summary: string;
  /** 关键情节 */
  keyEvents?: string[];
  /** 出场人物 */
  characters?: string[];
  /** 地点 */
  location?: string;
  /** 时间 */
  time?: string;
  /** 情绪基调 */
  mood?: string;
  /** 目标字数 */
  targetWordCount?: number;
}

/**
 * 关联章节内容
 */
export interface RelatedChapter {
  /** 章节号 */
  chapterNumber: number;
  /** 章节标题 */
  title?: string;
  /** 章节内容 */
  content: string;
  /** 章节概要 */
  summary?: string;
}

// ============================================
// 生成输入输出
// ============================================

/**
 * 文本生成输入
 */
export interface GenerationInput {
  /** 当前章节细纲 */
  chapterOutline: ChapterOutline;
  /** 所属卷纲（可选） */
  volumeOutline?: VolumeOutline;
  /** 整体大纲（可选） */
  outline?: Outline;
  /** 人物设定集 */
  characters: Character[];
  /** 故事背景 */
  background: StoryBackground;
  /** 关联章节内容（前面的章节） */
  relatedChapters: RelatedChapter[];
  /** 生成设置 */
  settings: GenerationSettings;
}

/**
 * 生成设置
 */
export interface GenerationSettings {
  /** 目标风格 */
  style: 'literary' | 'casual' | 'formal' | 'historical' | 'wuxia' | 'fantasy';
  /** 温度参数 */
  temperature: number;
  /** 最大长度 */
  maxLength: number;
  /** 最小长度 */
  minLength?: number;
  /** 模型 */
  model?: string;
  /** 是否自动润色 */
  autoPolish: boolean;
  /** 润色设置（如果autoPolish为true） */
  polishSettings?: {
    /** 启用的步骤 */
    enabledSteps?: string[];
    /** 各步骤设置 */
    steps?: Record<string, unknown>;
  };
}

/**
 * 文本生成输出
 */
export interface GenerationOutput {
  /** 生成的原始文本 */
  rawText: string;
  /** 最终文本（如果经过润色） */
  finalText: string;
  /** 是否经过润色 */
  polished: boolean;
  /** 生成报告 */
  generationReport: GenerationReport;
  /** 润色报告（如果经过润色） */
  polishReport?: PolishReport;
  /** 元数据 */
  metadata: {
    /** 生成时间（毫秒） */
    generationTime: number;
    /** 润色时间（毫秒，如果经过润色） */
    polishTime?: number;
    /** 原始字数 */
    rawWordCount: number;
    /** 最终字数 */
    finalWordCount: number;
  };
}

/**
 * 生成报告
 */
export interface GenerationReport {
  /** 是否成功 */
  success: boolean;
  /** 生成的章节概要 */
  summary?: string;
  /** 关键情节点 */
  keyPoints?: string[];
  /** 警告信息 */
  warnings?: string[];
  /** 模型使用信息 */
  modelInfo?: {
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * 润色报告（简化版，用于生成模块）
 */
export interface PolishReport {
  /** 是否成功 */
  success: boolean;
  /** 替换次数 */
  replacementCount: number;
  /** 执行步骤数 */
  stepsExecuted: number;
  /** 警告信息 */
  warnings?: string[];
}

// ============================================
// 生成进度
// ============================================

/**
 * 生成阶段
 */
export type GenerationPhase = 
  | 'preparing'     // 准备中
  | 'generating'    // 生成中
  | 'polishing'     // 润色中
  | 'completed'     // 已完成
  | 'error';        // 错误

/**
 * 生成进度
 */
export interface GenerationProgress {
  /** 阶段 */
  phase: GenerationPhase;
  /** 进度百分比 0-100 */
  progress: number;
  /** 进度消息 */
  message: string;
  /** 时间戳 */
  timestamp: number;
  /** 错误信息（如果有） */
  error?: string;
}
