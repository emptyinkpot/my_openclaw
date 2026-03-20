/**
 * ============================================================================
 * 文章结构模板类型定义
 * ============================================================================
 * 基于文章结构解析与模板化复刻系统设计文档实现
 */

// ============================================================================
// 元数据
// ============================================================================

export interface TemplateMetadata {
  /** 模板ID */
  id: string;
  /** 模板名称 */
  name: string;
  /** 原文标题 */
  sourceTitle?: string;
  /** 原文作者 */
  sourceAuthor?: string;
  /** 原文字数 */
  sourceWordCount?: number;
  /** 解析时间 */
  parsedAt: string;
  /** 模板版本 */
  version: string;
  /** 文体类型 */
  genre?: 'novel' | 'essay' | 'paper' | 'news' | 'poetry' | 'prose';
  /** 风格标签 */
  styleTags?: string[];
  /** 难度等级 */
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

// ============================================================================
// 词汇层参数
// ============================================================================

export interface VocabularyLayerParams {
  /** 词汇复杂度 (0-1) */
  complexity: number;
  /** 文言比例 (0-1) */
  classicalRatio: number;
  /** 术语密度 (每千字) */
  terminologyDensity: number;
  /** 比喻密度 (每千字) */
  metaphorDensity: number;
  /** 情感词比例 (0-1) */
  emotionalWordRatio: number;
  /** 禁用词列表 */
  forbiddenWords: string[];
  /** 偏好词列表 */
  preferredWords: string[];
  /** 词类分布 */
  posDistribution: {
    noun: number;
    verb: number;
    adjective: number;
    adverb: number;
    other: number;
  };
}

// ============================================================================
// 句子层参数
// ============================================================================

export interface SentenceTemplate {
  /** 句式模板 */
  pattern: string;
  /** 使用频率 */
  frequency: number;
  /** 位置偏好 */
  positionPreference: string;
}

export interface SentenceLayerParams {
  /** 平均句长 */
  avgLength: number;
  /** 句长标准差 */
  lengthStdDev: number;
  /** 长句阈值 */
  longSentenceThreshold: number;
  /** 短句阈值 */
  shortSentenceThreshold: number;
  /** 高频句式模板库 */
  patterns: SentenceTemplate[];
  /** 疑问句比例 */
  questionRatio: number;
  /** 感叹句比例 */
  exclamationRatio: number;
  /** 排比使用频率 */
  parallelismFrequency: number;
}

// ============================================================================
// 段落层参数
// ============================================================================

export type ParagraphFunction = 
  | 'introduction'    // 引入段
  | 'argument'        // 论述段
  | 'narrative'       // 叙事段
  | 'transition'      // 过渡段
  | 'climax'          // 高潮段
  | 'conclusion';     // 结论段

export interface ExampleUsagePattern {
  /** 每段例证数 */
  countPerParagraph: number;
  /** 例证类型 */
  types: ('data' | 'allusion' | 'case' | 'quote')[];
  /** 例证位置 */
  position: 'before_point' | 'after_point' | 'within';
}

export interface ParagraphLayerParams {
  /** 平均段长 */
  avgLength: number;
  /** 段落功能分布 */
  functionDistribution: Record<ParagraphFunction, number>;
  /** 主题句位置 */
  topicSentencePosition: 'start' | 'middle' | 'end' | 'none';
  /** 例证使用模式 */
  examplePattern: ExampleUsagePattern;
  /** 段落衔接词库 */
  transitionWords: string[];
}

// ============================================================================
// 篇章层参数
// ============================================================================

export type NarrativeStructure = 
  | 'four_part'       // 起承转合
  | 'three_act'       // 三幕剧
  | 'hero_journey'    // 英雄之旅
  | 'inverted_pyramid'// 倒金字塔
  | 'spiral'          // 螺旋上升
  | 'multi_thread';   // 多线交织

export interface StructureNode {
  /** 位置 (0-1) */
  position: number;
  /** 功能描述 */
  function: string;
  /** 情感强度 (0-1) */
  emotionalIntensity: number;
  /** 信息密度 (0-1) */
  informationDensity: number;
}

export interface PerspectiveSettings {
  /** 主视角 */
  main: 'first_person' | 'limited_third' | 'omniscient_third';
  /** 视角切换点 */
  switchPoints: number[];
  /** 切换类型 */
  switchType: string;
}

export interface ChapterLayerParams {
  /** 整体结构模式 */
  structure: NarrativeStructure;
  /** 结构节点 */
  structureNodes: StructureNode[];
  /** 视角设置 */
  perspective: PerspectiveSettings;
  /** 节奏曲线 (位置 -> 节奏值) */
  rhythmCurve: Record<string, number>;
  /** 情感曲线 (位置 -> 情感值) */
  emotionalCurve: Record<string, number>;
}

// ============================================================================
// 风格指纹
// ============================================================================

export interface StyleFingerprint {
  /** 理性-感性 (0=理性, 1=感性) */
  rationalEmotional: number;
  /** 简洁-繁复 (0=简洁, 1=繁复) */
  conciseElaborate: number;
  /** 直白-含蓄 (0=直白, 1=含蓄) */
  directImplicit: number;
  /** 客观-主观 (0=客观, 1=主观) */
  objectiveSubjective: number;
  /** 古典-现代 (0=古典, 1=现代) */
  classicalModern: number;
  /** 严肃-戏谑 (0=严肃, 1=戏谑) */
  seriousPlayful: number;
  /** 紧凑-舒缓 (0=紧凑, 1=舒缓) */
  tenseRelaxed: number;
  /** 具体-抽象 (0=具体, 1=抽象) */
  concreteAbstract: number;
}

// ============================================================================
// 占位符系统
// ============================================================================

export interface PlaceholderSystem {
  /** 篇章级占位符 */
  chapter: Record<string, string>;
  /** 段落级占位符 */
  paragraph: Record<string, string>;
  /** 句子级占位符 */
  sentence: Record<string, string>;
  /** 成分级占位符 */
  component: Record<string, string>;
  /** 修辞占位符 */
  rhetoric: Record<string, string>;
  /** 内容占位符 */
  content: Record<string, string>;
}

// ============================================================================
// 约束规则
// ============================================================================

export interface ConstraintRules {
  /** 必须包含 */
  mustInclude: string[];
  /** 禁止包含 */
  mustExclude: string[];
  /** 结构约束 */
  structureConstraints: string[];
  /** 风格约束 */
  styleConstraints: string[];
}

// ============================================================================
// 完整模板定义
// ============================================================================

export interface ArticleTemplate {
  /** 元数据 */
  metadata: TemplateMetadata;
  /** 词汇层参数 */
  vocabulary: VocabularyLayerParams;
  /** 句子层参数 */
  sentence: SentenceLayerParams;
  /** 段落层参数 */
  paragraph: ParagraphLayerParams;
  /** 篇章层参数 */
  chapter: ChapterLayerParams;
  /** 风格指纹 */
  styleFingerprint: StyleFingerprint;
  /** 占位符系统 */
  placeholders: PlaceholderSystem;
  /** 约束规则 */
  constraints: ConstraintRules;
}

// ============================================================================
// 解析请求与响应
// ============================================================================

export interface ParseArticleRequest {
  /** 原始文本 */
  text: string;
  /** 模板名称 */
  templateName?: string;
  /** 文体类型 */
  genre?: TemplateMetadata['genre'];
  /** 风格标签 */
  styleTags?: string[];
}

export interface ParseArticleResponse {
  /** 是否成功 */
  success: boolean;
  /** 解析结果 */
  template?: ArticleTemplate;
  /** 错误信息 */
  error?: string;
}

// ============================================================================
// 生成请求与响应
// ============================================================================

export interface GenerateFromTemplateRequest {
  /** 模板ID或完整模板 */
  templateId?: string;
  template?: ArticleTemplate;
  /** 新主题/内容概要 */
  topic: string;
  /** 内容要点 */
  keyPoints?: string[];
  /** 风格调整参数 */
  styleAdjustments?: Partial<StyleFingerprint>;
  /** 目标字数 */
  targetLength?: number;
}

export interface GenerateFromTemplateResponse {
  /** 是否成功 */
  success: boolean;
  /** 生成的文章 */
  text?: string;
  /** 标题 */
  title?: string;
  /** 错误信息 */
  error?: string;
}

// ============================================================================
// 默认值
// ============================================================================

export const DEFAULT_STYLE_FINGERPRINT: StyleFingerprint = {
  rationalEmotional: 0.5,
  conciseElaborate: 0.5,
  directImplicit: 0.5,
  objectiveSubjective: 0.5,
  classicalModern: 0.5,
  seriousPlayful: 0.5,
  tenseRelaxed: 0.5,
  concreteAbstract: 0.5,
};

export const DEFAULT_VOCABULARY_PARAMS: VocabularyLayerParams = {
  complexity: 0.5,
  classicalRatio: 0.2,
  terminologyDensity: 5,
  metaphorDensity: 3,
  emotionalWordRatio: 0.1,
  forbiddenWords: [],
  preferredWords: [],
  posDistribution: {
    noun: 0.3,
    verb: 0.25,
    adjective: 0.15,
    adverb: 0.1,
    other: 0.2,
  },
};

export const DEFAULT_SENTENCE_PARAMS: SentenceLayerParams = {
  avgLength: 20,
  lengthStdDev: 8,
  longSentenceThreshold: 30,
  shortSentenceThreshold: 10,
  patterns: [],
  questionRatio: 0.05,
  exclamationRatio: 0.02,
  parallelismFrequency: 0.1,
};

export const DEFAULT_PARAGRAPH_PARAMS: ParagraphLayerParams = {
  avgLength: 150,
  functionDistribution: {
    introduction: 0.1,
    argument: 0.4,
    narrative: 0.2,
    transition: 0.1,
    climax: 0.1,
    conclusion: 0.1,
  },
  topicSentencePosition: 'start',
  examplePattern: {
    countPerParagraph: 1.2,
    types: ['case', 'quote'],
    position: 'after_point',
  },
  transitionWords: ['然而', '此外', '换言之', '综上所述'],
};

export const DEFAULT_CHAPTER_PARAMS: ChapterLayerParams = {
  structure: 'four_part',
  structureNodes: [
    { position: 0.1, function: '引入核心问题', emotionalIntensity: 0.3, informationDensity: 0.4 },
    { position: 0.3, function: '展开第一个论点', emotionalIntensity: 0.5, informationDensity: 0.6 },
    { position: 0.6, function: '核心矛盾爆发', emotionalIntensity: 0.9, informationDensity: 0.8 },
    { position: 0.9, function: '主题升华与留白', emotionalIntensity: 0.7, informationDensity: 0.5 },
  ],
  perspective: {
    main: 'limited_third',
    switchPoints: [],
    switchType: '',
  },
  rhythmCurve: {
    '0.1': 0.3, '0.2': 0.4, '0.3': 0.5, '0.4': 0.6,
    '0.5': 0.7, '0.6': 0.9, '0.7': 0.8, '0.8': 0.6,
    '0.9': 0.4, '1.0': 0.3,
  },
  emotionalCurve: {
    '0.1': 0.1, '0.2': 0.2, '0.3': 0.3, '0.4': 0.1,
    '0.5': -0.2, '0.6': -0.5, '0.7': -0.3, '0.8': 0.2,
    '0.9': 0.5, '1.0': 0.7,
  },
};

export const DEFAULT_PLACEHOLDERS: PlaceholderSystem = {
  chapter: {
    '[TITLE]': '文章标题',
    '[STRUCTURE]': '整体结构模式',
    '[PERSPECTIVE]': '叙述视角',
  },
  paragraph: {
    '[INTRO_PARA]': '引入段',
    '[ARG_PARA_1]': '第一论述段',
    '[NARR_PARA_1]': '第一叙事段',
    '[TRANS_PARA]': '过渡段',
    '[CLIMAX_PARA]': '高潮段',
    '[CONC_PARA]': '结论段',
  },
  sentence: {
    '[THESIS_SENT]': '核心论点句',
    '[ARG_SENT]': '论证句',
    '[EXAMPLE_SENT]': '举例句',
    '[QUOTE_SENT]': '引用句',
    '[TRANS_SENT]': '过渡句',
    '[CONC_SENT]': '结论句',
  },
  component: {
    '[SUBJECT]': '主语',
    '[PREDICATE]': '谓语',
    '[OBJECT]': '宾语',
    '[MODIFIER]': '修饰语',
    '[CLAUSE]': '从句',
  },
  rhetoric: {
    '[METAPHOR]': '比喻',
    '[PARALLEL]': '排比',
    '[ALLUSION]': '用典',
    '[RHET_QUEST]': '设问反问',
  },
  content: {
    '[TOPIC]': '核心主题',
    '[CHARACTER]': '人物',
    '[EVENT]': '事件',
    '[LOCATION]': '地点',
    '[TIME]': '时间',
    '[DATA]': '数据',
    '[QUOTE]': '引用内容',
  },
};

export const DEFAULT_CONSTRAINTS: ConstraintRules = {
  mustInclude: [],
  mustExclude: ['网络用语', '口语化表达'],
  structureConstraints: ['高潮必须在60%-70%位置', '结论前必须有转折'],
  styleConstraints: ['文言比例保持在0.3-0.4', '平均句长20±3字'],
};

/** 创建默认模板 */
export function createDefaultTemplate(name: string): ArticleTemplate {
  return {
    metadata: {
      id: `template-${Date.now()}`,
      name,
      parsedAt: new Date().toISOString(),
      version: '1.0',
    },
    vocabulary: DEFAULT_VOCABULARY_PARAMS,
    sentence: DEFAULT_SENTENCE_PARAMS,
    paragraph: DEFAULT_PARAGRAPH_PARAMS,
    chapter: DEFAULT_CHAPTER_PARAMS,
    styleFingerprint: DEFAULT_STYLE_FINGERPRINT,
    placeholders: DEFAULT_PLACEHOLDERS,
    constraints: DEFAULT_CONSTRAINTS,
  };
}

// ============================================================================
// 预置模板库
// ============================================================================

export const PRESET_TEMPLATES: ArticleTemplate[] = [
  {
    metadata: {
      id: 'template-classical-essay',
      name: '古典议论文',
      parsedAt: '2024-01-01',
      version: '1.0',
      genre: 'essay',
      styleTags: ['古典', '理性', '论证'],
      difficulty: 'intermediate',
    },
    vocabulary: {
      ...DEFAULT_VOCABULARY_PARAMS,
      classicalRatio: 0.4,
      complexity: 0.6,
    },
    sentence: {
      ...DEFAULT_SENTENCE_PARAMS,
      avgLength: 25,
      questionRatio: 0.08,
    },
    paragraph: {
      ...DEFAULT_PARAGRAPH_PARAMS,
      functionDistribution: {
        introduction: 0.1,
        argument: 0.5,
        narrative: 0.1,
        transition: 0.1,
        climax: 0.1,
        conclusion: 0.1,
      },
    },
    chapter: {
      ...DEFAULT_CHAPTER_PARAMS,
      structure: 'four_part',
    },
    styleFingerprint: {
      ...DEFAULT_STYLE_FINGERPRINT,
      rationalEmotional: 0.3,
      classicalModern: 0.3,
      directImplicit: 0.6,
    },
    placeholders: DEFAULT_PLACEHOLDERS,
    constraints: {
      mustInclude: ['比喻频率>0.05', '引用至少1处'],
      mustExclude: ['网络用语', '口语化表达'],
      structureConstraints: ['论证段占比>40%', '结论前必须有转折'],
      styleConstraints: ['文言比例保持在0.3-0.4', '平均句长25±5字'],
    },
  },
  {
    metadata: {
      id: 'template-modern-narrative',
      name: '现代叙事文',
      parsedAt: '2024-01-01',
      version: '1.0',
      genre: 'novel',
      styleTags: ['现代', '感性', '叙事'],
      difficulty: 'intermediate',
    },
    vocabulary: {
      ...DEFAULT_VOCABULARY_PARAMS,
      classicalRatio: 0.1,
      emotionalWordRatio: 0.15,
    },
    sentence: {
      ...DEFAULT_SENTENCE_PARAMS,
      avgLength: 18,
      lengthStdDev: 12,
    },
    paragraph: {
      ...DEFAULT_PARAGRAPH_PARAMS,
      functionDistribution: {
        introduction: 0.1,
        argument: 0.2,
        narrative: 0.4,
        transition: 0.1,
        climax: 0.1,
        conclusion: 0.1,
      },
    },
    chapter: {
      ...DEFAULT_CHAPTER_PARAMS,
      structure: 'three_act',
    },
    styleFingerprint: {
      ...DEFAULT_STYLE_FINGERPRINT,
      rationalEmotional: 0.7,
      classicalModern: 0.8,
      concreteAbstract: 0.3,
    },
    placeholders: DEFAULT_PLACEHOLDERS,
    constraints: DEFAULT_CONSTRAINTS,
  },
  {
    metadata: {
      id: 'template-historical-narrative',
      name: '历史情境叙事',
      parsedAt: '2024-01-01',
      version: '1.0',
      genre: 'prose',
      styleTags: ['历史', '深沉', '悲怆'],
      difficulty: 'advanced',
    },
    vocabulary: {
      ...DEFAULT_VOCABULARY_PARAMS,
      classicalRatio: 0.35,
      metaphorDensity: 5,
    },
    sentence: {
      ...DEFAULT_SENTENCE_PARAMS,
      avgLength: 22,
    },
    paragraph: {
      ...DEFAULT_PARAGRAPH_PARAMS,
      transitionWords: ['然而', '此时', '彼时', '正如', '于是'],
    },
    chapter: {
      ...DEFAULT_CHAPTER_PARAMS,
      structure: 'four_part',
    },
    styleFingerprint: {
      ...DEFAULT_STYLE_FINGERPRINT,
      rationalEmotional: 0.6,
      directImplicit: 0.7,
      seriousPlayful: 0.2,
    },
    placeholders: DEFAULT_PLACEHOLDERS,
    constraints: {
      mustInclude: ['历史细节描写', '人物内心刻画'],
      mustExclude: ['现代网络用语', '科技词汇'],
      structureConstraints: ['必须包含历史情境沉浸', '结尾必须悬置'],
      styleConstraints: ['文言比例0.3-0.4', '禁止上帝视角评判'],
    },
  },
];
