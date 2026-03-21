/**
 * ============================================================================
 * 文章生成器类型定义
 * ============================================================================
 * 基于历史叙事生成器设计文档实现
 */

// ============================================================================
// 第一部分：核心理念预设
// ============================================================================

/** 核心史观模式 */
export type HistoricalPerspectiveMode = 
  | 'thorough_situationalism'  // 彻底的历史情境主义（默认）
  | 'limited_situationalism'   // 有限历史情境主义
  | 'experimental_comparison'; // 实验性对比模式

/** 思想底色光谱 */
export interface IdeologicalSpectrum {
  /** 异端右翼内核（默认60%） */
  heterodoxRightWing: number;
  /** 东洋史学/结构分析框架（默认20%） */
  orientalHistoriography: number;
  /** 大东亚/使命史观渲染（默认20%） */
  greaterEastAsia: number;
}

/** 驱动内核选项 */
export interface DriveKernel {
  /** 理想驱动 */
  idealDriven: boolean;
  /** 恐惧驱动（默认强制） */
  fearDriven: boolean;
  /** 混合驱动 */
  mixedDriven: boolean;
}

/** 终极目标 */
export type UltimateGoal = 
  | 'empathy_void'           // 呈现"深度共情后的虚无"（默认）
  | 'heavy_decision_process' // 呈现"抉择的沉重过程"
  | 'structural_irony';      // 呈现"结构性的历史反讽"

/** 核心理念预设 */
export interface CorePhilosophyPreset {
  /** 核心史观模式 */
  perspectiveMode: HistoricalPerspectiveMode;
  /** 思想底色光谱 */
  ideologicalSpectrum: IdeologicalSpectrum;
  /** 驱动内核 */
  driveKernel: DriveKernel;
  /** 终极目标 */
  ultimateGoal: UltimateGoal;
}

// ============================================================================
// 第二部分：叙事视角与角色设定
// ============================================================================

/** 人称与视角 */
export type NarrativePerspective = 
  | 'first_person'              // 完全第一人称沉浸
  | 'limited_omniscient'        // 有限上帝视角（默认）
  | 'full_omniscient';          // 全知上帝视角

/** 阵营/语境 */
export type FactionContext = 
  | 'japanese_right_wing'       // 日方/右翼
  | 'chinese_resistance'        // 中方/抗战
  | 'manchukuo_puppet'          // 伪满/傀儡政权
  | 'soviet_left_wing'          // 苏俄/左翼
  | 'western_classical';        // 西方/古典

/** 角色标签 */
export type CharacterTag = 
  | 'decision_maker'            // 决策者
  | 'executor'                  // 执行者
  | 'believer'                  // 信仰者
  | 'opportunist'               // 投机者
  | 'disillusioned'             // 幻灭者
  | 'swept_along'               // 被裹挟者
  | 'observer'                  // 观察者
  | 'technocrat'                // 技术官僚
  | 'idealist';                 // 理想主义者

/** 信息茧房类型 */
export type InformationCocoonType = 
  | 'internal_documents'        // 接收的内部文件/宣传
  | 'street_rumors'             // 听到的街头谣言与小道消息
  | 'personal_trauma'           // 个人经历与创伤记忆
  | 'limited_enemy_info'        // 有限的敌方信息
  | 'circle_pressure'           // 所属圈子的共识与压力
  | 'wrong_intelligence';       // 错误的情报或学术理论

/** 角色设定 */
export interface CharacterSettings {
  /** 人称与视角 */
  perspective: NarrativePerspective;
  /** 阵营/语境 */
  faction: FactionContext;
  /** 角色标签 */
  characterTags: CharacterTag[];
  /** 信息茧房设定 */
  informationCocoon: InformationCocoonType[];
  /** 具体恐惧（文本） */
  specificFears: string;
  /** 宣称的理想（文本） */
  declaredIdeals: string;
  /** 恐惧如何催生理性化路径（文本） */
  fearRationalizationPath: string;
  /** 关键记忆闪回提示（文本） */
  keyMemoryFlashback: string;
}

// ============================================================================
// 第三部分：叙事技法与结构控制
// ============================================================================

/** 开端/切入点类型 */
export type OpeningType = 
  | 'symbolic_scene'            // 象征性场景/物品（默认）
  | 'decisive_moment'           // 决定性历史瞬间
  | 'news_event'                // 新闻事件/流言
  | 'private_moment';           // 私密时刻

/** 中间/主体展开路径 */
export type DevelopmentPath = 
  | 'dual_thread_weave'         // 由点及面，双线交织（默认）
  | 'core_contradiction';       // 核心矛盾纵深剖析

/** 结尾/收束类型 */
export type EndingType = 
  | 'suspended_image'           // 悬置性意象（默认）
  | 'contradiction_juxtaposed'  // 矛盾并置
  | 'open_question';            // 开放式追问

/** 叙事技法 */
export interface NarrativeTechniques {
  /** 启用"门罗式细节穿刺" */
  enableMunroDetailPuncture: boolean;
  /** 启用"石黑一雄式闪回" */
  enableIshiguroFlashback: boolean;
}

/** 论述与说服策略 */
export interface ArgumentStrategy {
  /** 内部逻辑自洽 */
  internalConsistency: boolean;
  /** 情感动员与悲情渲染 */
  emotionalMobilization: boolean;
  /** 通过排除法确立唯一性 */
  exclusionUniqueness: boolean;
  /** 展现代价，但不反思 */
  showCostWithoutReflection: boolean;
}

/** 叙事技法与结构控制 */
export interface NarrativeStructureSettings {
  /** 开端类型 */
  openingType: OpeningType;
  /** 开端描述内容 */
  openingDescription: string;
  /** 展开路径 */
  developmentPath: DevelopmentPath;
  /** 宏观线权重（仅双线交织模式） */
  macroWeight: number;
  /** 微观线权重（仅双线交织模式） */
  microWeight: number;
  /** 叙事技法 */
  techniques: NarrativeTechniques;
  /** 论述策略 */
  argumentStrategy: ArgumentStrategy;
  /** 结尾类型 */
  endingType: EndingType;
  /** 是否呼应开篇意象 */
  echoOpening: boolean;
}

// ============================================================================
// 第四部分：风格、词汇与输出控制
// ============================================================================

/** 文白比例 */
export interface ClassicalRatio {
  /** 文言比例 */
  classical: number;
  /** 白话比例 */
  vernacular: number;
}

/** 比喻系统偏好 */
export type MetaphorPreference = 
  | 'mechanical_engineering'    // 机械/工程比喻
  | 'biological_medical'        // 生物/医学比喻
  | 'drama_chess'               // 戏剧/棋局比喻（默认）
  | 'hydrological_geographic'   // 水文/地理比喻
  | 'architectural'             // 建筑比喻
  | 'theological';              // 神学比喻

/** 风格设置 */
export interface StyleSettings {
  /** 文白比例 */
  classicalRatio: ClassicalRatio;
  /** 比喻系统偏好（可多选） */
  metaphorPreferences: MetaphorPreference[];
  /** 是否植入文献典故 */
  embedLiteraryAllusions: boolean;
  /** 文献典故方向（文本） */
  literaryAllusionDirections: string;
  /** 文章长度（字数） */
  targetLength: number;
}

// ============================================================================
// 完整配置
// ============================================================================

/** 文章生成器完整配置 */
export interface ArticleGeneratorSettings {
  /** AI模型 */
  aiModel: string;
  /** 第一部分：核心理念预设 */
  corePhilosophy: CorePhilosophyPreset;
  /** 第二部分：叙事视角与角色设定 */
  character: CharacterSettings;
  /** 第三部分：叙事技法与结构控制 */
  narrativeStructure: NarrativeStructureSettings;
  /** 第四部分：风格、词汇与输出控制 */
  style: StyleSettings;
}

// ============================================================================
// 默认值
// ============================================================================

/** 默认核心理念预设 */
export const DEFAULT_CORE_PHILOSOPHY: CorePhilosophyPreset = {
  perspectiveMode: 'thorough_situationalism',
  ideologicalSpectrum: {
    heterodoxRightWing: 60,
    orientalHistoriography: 20,
    greaterEastAsia: 20,
  },
  driveKernel: {
    idealDriven: true,
    fearDriven: true,
    mixedDriven: false,
  },
  ultimateGoal: 'empathy_void',
};

/** 默认角色设定 */
export const DEFAULT_CHARACTER: CharacterSettings = {
  perspective: 'limited_omniscient',
  faction: 'japanese_right_wing',
  characterTags: ['decision_maker'],
  informationCocoon: ['internal_documents', 'street_rumors', 'personal_trauma', 'circle_pressure'],
  specificFears: '',
  declaredIdeals: '',
  fearRationalizationPath: '',
  keyMemoryFlashback: '',
};

/** 默认叙事结构 */
export const DEFAULT_NARRATIVE_STRUCTURE: NarrativeStructureSettings = {
  openingType: 'symbolic_scene',
  openingDescription: '',
  developmentPath: 'dual_thread_weave',
  macroWeight: 50,
  microWeight: 50,
  techniques: {
    enableMunroDetailPuncture: true,
    enableIshiguroFlashback: true,
  },
  argumentStrategy: {
    internalConsistency: true,
    emotionalMobilization: true,
    exclusionUniqueness: true,
    showCostWithoutReflection: true,
  },
  endingType: 'suspended_image',
  echoOpening: true,
};

/** 默认风格设置 */
export const DEFAULT_STYLE: StyleSettings = {
  classicalRatio: {
    classical: 40,
    vernacular: 60,
  },
  metaphorPreferences: ['drama_chess'],
  embedLiteraryAllusions: true,
  literaryAllusionDirections: '',
  targetLength: 2000,
};

/** 默认完整配置 */
export const DEFAULT_ARTICLE_GENERATOR_SETTINGS: ArticleGeneratorSettings = {
  aiModel: 'doubao-seed-2-0-pro-260115',
  corePhilosophy: DEFAULT_CORE_PHILOSOPHY,
  character: DEFAULT_CHARACTER,
  narrativeStructure: DEFAULT_NARRATIVE_STRUCTURE,
  style: DEFAULT_STYLE,
};

// ============================================================================
// 标签与选项定义
// ============================================================================

/** 核心史观模式选项 */
export const HISTORICAL_PERSPECTIVE_OPTIONS = [
  {
    id: 'thorough_situationalism',
    title: '彻底的历史情境主义',
    desc: '严格禁锢于角色当时的认知、信息与情感。未来是真正的未知，所有判断基于"当时何以可能"。生成文本必须彻底抛弃后见之明与上帝视角评判。',
  },
  {
    id: 'limited_situationalism',
    title: '有限历史情境主义',
    desc: '基本遵循A，但允许在章节末或注释中，以"后世史家注"的形式提供极简的、事实性的后续结果，仅作背景参考，不参与叙事和评判。',
  },
  {
    id: 'experimental_comparison',
    title: '实验性对比模式',
    desc: '（慎用）生成平行文本，一份遵循A，另一份采用"全知上帝视角"对同一事件进行评述，旨在让用户感受差异。不用于正式叙事。',
  },
] as const;

/** 终极目标选项 */
export const ULTIMATE_GOAL_OPTIONS = [
  {
    id: 'empathy_void',
    title: '深度共情后的虚无',
    desc: '通过彻底沉浸角色逻辑，暴露其信念在现实前的脆弱与荒诞，导向悬置判断的苍凉感。是核心叙事策略。',
  },
  {
    id: 'heavy_decision_process',
    title: '抉择的沉重过程',
    desc: '侧重于展示在信息迷雾中做决定的艰难与痛苦。',
  },
  {
    id: 'structural_irony',
    title: '结构性的历史反讽',
    desc: '侧重于计划与结果、口号与现实的残酷反差。',
  },
] as const;

/** 人称视角选项 */
export const NARRATIVE_PERSPECTIVE_OPTIONS = [
  {
    id: 'first_person',
    title: '完全第一人称沉浸',
    desc: '以"我"叙述，严格受限',
  },
  {
    id: 'limited_omniscient',
    title: '有限上帝视角',
    desc: '第三人称，但视角集中于一至三个核心角色，所知不超出该角色',
  },
  {
    id: 'full_omniscient',
    title: '全知上帝视角',
    desc: '仅当【核心理念预设】中选择了C模式时可用',
  },
] as const;

/** 阵营选项 */
export const FACTION_OPTIONS = [
  {
    id: 'japanese_right_wing',
    title: '日方/右翼',
    desc: '关东军参谋、内阁官僚、知识分子、开拓民',
  },
  {
    id: 'chinese_resistance',
    title: '中方/抗战',
    desc: '国民政府人员、中共人员、地方军阀、普通士兵、沦陷区民众',
  },
  {
    id: 'manchukuo_puppet',
    title: '伪满/傀儡政权',
    desc: '溥仪、郑孝胥、张景惠、伪满官吏',
  },
  {
    id: 'soviet_left_wing',
    title: '苏俄/左翼',
    desc: '共产国际代表、苏军顾问、中共内部人员',
  },
  {
    id: 'western_classical',
    title: '西方/古典',
    desc: '记者、外交官、殖民官员、罗马总督',
  },
] as const;

/** 角色标签选项 */
export const CHARACTER_TAG_OPTIONS = [
  { id: 'decision_maker', label: '决策者' },
  { id: 'executor', label: '执行者' },
  { id: 'believer', label: '信仰者' },
  { id: 'opportunist', label: '投机者' },
  { id: 'disillusioned', label: '幻灭者' },
  { id: 'swept_along', label: '被裹挟者' },
  { id: 'observer', label: '观察者' },
  { id: 'technocrat', label: '技术官僚' },
  { id: 'idealist', label: '理想主义者' },
] as const;

/** 信息茧房选项 */
export const INFORMATION_COCOON_OPTIONS = [
  { id: 'internal_documents', label: '接收的内部文件/宣传' },
  { id: 'street_rumors', label: '听到的街头谣言与小道消息' },
  { id: 'personal_trauma', label: '个人经历与创伤记忆' },
  { id: 'limited_enemy_info', label: '有限的敌方信息（通常是被扭曲的）' },
  { id: 'circle_pressure', label: '所属圈子的共识与压力' },
  { id: 'wrong_intelligence', label: '错误的情报或学术理论' },
] as const;

/** 开端类型选项 */
export const OPENING_TYPE_OPTIONS = [
  {
    id: 'symbolic_scene',
    title: '象征性场景/物品',
    desc: '例：奠基仪式、一份文件、一件服装',
  },
  {
    id: 'decisive_moment',
    title: '决定性历史瞬间',
    desc: '例：签字前夜、会议表决、战役发起时刻',
  },
  {
    id: 'news_event',
    title: '新闻事件/流言',
    desc: '一则当时的电报、报纸头条、坊间传闻',
  },
  {
    id: 'private_moment',
    title: '私密时刻',
    desc: '例：角色独处时的某个动作、一段未寄出的日记',
  },
] as const;

/** 展开路径选项 */
export const DEVELOPMENT_PATH_OPTIONS = [
  {
    id: 'dual_thread_weave',
    title: '由点及面，双线交织',
    desc: '宏观线（决策推演、会议争论）+ 微观线（普通人遭遇、环境细节）交替出现，形成张力',
  },
  {
    id: 'core_contradiction',
    title: '核心矛盾纵深剖析',
    desc: '聚焦一个核心矛盾，从不同角色的视角反复切入，呈现"罗生门"效应',
  },
] as const;

/** 结尾类型选项 */
export const ENDING_TYPE_OPTIONS = [
  {
    id: 'suspended_image',
    title: '悬置性意象',
    desc: '终结于一个充满未完成感的象征画面，不给出结论',
  },
  {
    id: 'contradiction_juxtaposed',
    title: '矛盾并置',
    desc: '将宏伟蓝图与残酷现实、公开宣言与私下算计并置，自然形成反讽',
  },
  {
    id: 'open_question',
    title: '开放式追问',
    desc: '以角色内心一个无解的问题收尾',
  },
] as const;

/** 比喻系统选项 */
export const METAPHOR_PREFERENCE_OPTIONS = [
  { id: 'mechanical_engineering', label: '机械/工程比喻', examples: '机器、齿轮、蓝图' },
  { id: 'biological_medical', label: '生物/医学比喻', examples: '肌体、毒瘤、血脉' },
  { id: 'drama_chess', label: '戏剧/棋局比喻', examples: '舞台、演员、棋手、棋子' },
  { id: 'hydrological_geographic', label: '水文/地理比喻', examples: '洪流、暗流、土壤' },
  { id: 'architectural', label: '建筑比喻', examples: '大厦、基石、废墟' },
  { id: 'theological', label: '神学比喻', examples: '圣殿、天启、救赎' },
] as const;
