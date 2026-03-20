/**
 * ============================================================================
 * 增强功能类型定义
 * ============================================================================
 * 
 * 整合开源项目优秀特性：
 * - Writing-Helper: 6维风格定制
 * - Article Writer: 三模式写作
 * - awesome-ai-research: 学术润色Prompt
 * - GPT Academic: 翻译功能
 * - BypassAIGC: AI检测对抗
 */

// ============================================================================
// 写作模式（Article Writer 风格）
// ============================================================================

/** 写作模式类型 */
export type WritingMode = 
  | 'coach'    // 教练模式：0%AI，仅提供建议
  | 'fast'     // 快速模式：100%AI，全自动生成
  | 'hybrid';  // 混合模式：40%AI，人机协作

/** 写作模式配置 */
export interface WritingModeConfig {
  mode: WritingMode;
  /** AI参与度 (0-100) */
  aiInvolvement: number;
  /** 模式描述 */
  description: string;
  /** 推荐场景 */
  recommendedScenarios: string[];
}

/** 写作模式预设 */
export const WRITING_MODE_CONFIGS: Record<WritingMode, WritingModeConfig> = {
  coach: {
    mode: 'coach',
    aiInvolvement: 0,
    description: 'AI作为写作教练，提供修改建议和指导，用户手动完成所有修改',
    recommendedScenarios: ['学习写作技巧', '提升写作能力', '重要文档创作'],
  },
  fast: {
    mode: 'fast',
    aiInvolvement: 100,
    description: 'AI全自动润色/生成，快速获得结果，适合效率优先场景',
    recommendedScenarios: ['批量处理', '时间紧迫', '初稿快速生成'],
  },
  hybrid: {
    mode: 'hybrid',
    aiInvolvement: 40,
    description: '人机协作模式，AI处理基础润色，用户把控关键决策',
    recommendedScenarios: ['日常写作', '内容创作', '平衡效率与质量'],
  },
};

// ============================================================================
// 6维风格定制（Writing-Helper 风格）
// ============================================================================

/** 6维风格维度 */
export interface SixDimensionStyle {
  /** 语言维度：口语化 ←→ 书面化 */
  language: number;  // 0=口语化, 1=书面化
  /** 结构维度：松散 ←→ 严谨 */
  structure: number; // 0=松散, 1=严谨
  /** 情感维度：冷静 ←→ 热情 */
  emotion: number;   // 0=冷静, 1=热情
  /** 思维维度：具体 ←→ 抽象 */
  thinking: number;  // 0=具体, 1=抽象
  /** 视角维度：主观 ←→ 客观 */
  perspective: number; // 0=主观, 1=客观
  /** 领域维度：通用 ←→ 专业 */
  domain: number;    // 0=通用, 1=专业
}

/** 风格维度描述 */
export const STYLE_DIMENSIONS: Array<{
  key: keyof SixDimensionStyle;
  leftLabel: string;
  rightLabel: string;
  description: string;
}> = [
  { key: 'language', leftLabel: '口语化', rightLabel: '书面化', description: '语言的正式程度' },
  { key: 'structure', leftLabel: '松散', rightLabel: '严谨', description: '文章结构的紧密程度' },
  { key: 'emotion', leftLabel: '冷静', rightLabel: '热情', description: '情感表达的强度' },
  { key: 'thinking', leftLabel: '具体', rightLabel: '抽象', description: '思维方式的特征' },
  { key: 'perspective', leftLabel: '主观', rightLabel: '客观', description: '叙述视角的选择' },
  { key: 'domain', leftLabel: '通用', rightLabel: '专业', description: '领域专业深度' },
];

/** 默认6维风格 */
export const DEFAULT_SIX_DIMENSION_STYLE: SixDimensionStyle = {
  language: 0.6,
  structure: 0.7,
  emotion: 0.4,
  thinking: 0.5,
  perspective: 0.6,
  domain: 0.5,
};

/** 风格预设 */
export interface StylePreset {
  id: string;
  name: string;
  description: string;
  style: SixDimensionStyle;
  tags: string[];
}

/** 风格预设库 */
export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'academic-paper',
    name: '学术论文',
    description: '适合期刊论文、学位论文等学术写作',
    style: { language: 0.9, structure: 0.9, emotion: 0.1, thinking: 0.7, perspective: 0.9, domain: 0.9 },
    tags: ['学术', '正式', '严谨'],
  },
  {
    id: 'literary-prose',
    name: '文学散文',
    description: '适合文学创作、散文写作',
    style: { language: 0.7, structure: 0.4, emotion: 0.8, thinking: 0.6, perspective: 0.3, domain: 0.3 },
    tags: ['文学', '抒情', '艺术'],
  },
  {
    id: 'news-report',
    name: '新闻报道',
    description: '适合新闻报道、时事评论',
    style: { language: 0.6, structure: 0.8, emotion: 0.2, thinking: 0.4, perspective: 0.9, domain: 0.5 },
    tags: ['新闻', '客观', '简洁'],
  },
  {
    id: 'blog-post',
    name: '博客文章',
    description: '适合个人博客、公众号文章',
    style: { language: 0.4, structure: 0.5, emotion: 0.6, thinking: 0.5, perspective: 0.4, domain: 0.4 },
    tags: ['博客', '轻松', '个性'],
  },
  {
    id: 'business-doc',
    name: '商务文档',
    description: '适合商业报告、工作文档',
    style: { language: 0.8, structure: 0.9, emotion: 0.1, thinking: 0.6, perspective: 0.8, domain: 0.7 },
    tags: ['商务', '正式', '高效'],
  },
];

// ============================================================================
// 学术润色Prompt模板（awesome-ai-research 风格）
// ============================================================================

/** 学术润色模板类型 */
export type AcademicPolishType = 
  | 'translate_cn_en'    // 中译英
  | 'translate_en_cn'    // 英译中
  | 'polish'             // 润色
  | 'condense'           // 缩写
  | 'expand'             // 扩写
  | 'grammar_check'      // 语法检查
  | 'citation_format';   // 引用格式化

/** 学术润色模板 */
export interface AcademicPolishTemplate {
  id: AcademicPolishType;
  name: string;
  description: string;
  promptTemplate: string;
  example?: {
    input: string;
    output: string;
  };
}

/** 学术润色Prompt模板库 */
export const ACADEMIC_POLISH_TEMPLATES: AcademicPolishTemplate[] = [
  {
    id: 'polish',
    name: '学术润色',
    description: '提升学术论文的表达质量和专业性',
    promptTemplate: `你是一位专业的学术写作编辑。请对以下文本进行润色，要求：

1. 保持原意不变，提升表达的学术规范性
2. 优化句式结构，增强逻辑连贯性
3. 使用更精准的学术词汇
4. 保持语言简洁，避免冗余表达
5. 检查并修正语法错误

原文：
{input}

请输出润色后的文本：`,
    example: {
      input: '这个研究很重要，我们发现了一些有趣的结果。',
      output: '本研究具有重要的学术价值，实验结果揭示了若干值得关注的发现。',
    },
  },
  {
    id: 'translate_cn_en',
    name: '中译英',
    description: '将中文论文翻译为学术英语',
    promptTemplate: `你是一位专业的学术论文翻译专家。请将以下中文文本翻译成学术英语，要求：

1. 使用正式的学术英语表达
2. 保持专业术语的准确性
3. 遵循学术写作惯例（如被动语态、第三人称等）
4. 确保翻译的自然流畅

中文原文：
{input}

请输出英文翻译：`,
  },
  {
    id: 'translate_en_cn',
    name: '英译中',
    description: '将英文论文翻译为中文',
    promptTemplate: `你是一位专业的学术论文翻译专家。请将以下英文文本翻译成中文，要求：

1. 使用规范的学术中文表达
2. 保持专业术语的准确翻译
3. 确保中文表达自然流畅
4. 必要时保留关键英文术语

英文原文：
{input}

请输出中文翻译：`,
  },
  {
    id: 'condense',
    name: '论文缩写',
    description: '压缩论文篇幅，保留核心观点',
    promptTemplate: `你是一位学术写作专家。请对以下文本进行缩写，要求：

1. 保留核心论点和关键信息
2. 删除冗余表达和次要细节
3. 保持逻辑完整性
4. 目标字数：原文的60%左右

原文（{word_count}字）：
{input}

请输出缩写后的文本：`,
  },
  {
    id: 'expand',
    name: '内容扩写',
    description: '扩展论文内容，增加论述深度',
    promptTemplate: `你是一位学术写作专家。请对以下文本进行扩写，要求：

1. 保持原有论点和逻辑结构
2. 增加论证细节和支撑材料
3. 补充相关背景信息
4. 扩展分析与讨论部分
5. 目标字数：原文的150%左右

原文（{word_count}字）：
{input}

请输出扩写后的文本：`,
  },
  {
    id: 'grammar_check',
    name: '语法检查',
    description: '检查并修正语法错误',
    promptTemplate: `你是一位专业的文字编辑。请检查以下文本的语法问题，要求：

1. 指出所有语法错误
2. 提供修改建议
3. 保持原文风格

原文：
{input}

请输出：
【语法问题】
- 问题1：... → 建议：...
- 问题2：... → 建议：...

【修改后文本】
...`,
  },
];

// ============================================================================
// 翻译功能（GPT Academic 风格）
// ============================================================================

/** 翻译语言对 */
export interface LanguagePair {
  source: string;
  target: string;
  name: string;
}

/** 支持的语言对 */
export const LANGUAGE_PAIRS: LanguagePair[] = [
  { source: 'zh', target: 'en', name: '中 → 英' },
  { source: 'en', target: 'zh', name: '英 → 中' },
  { source: 'zh', target: 'ja', name: '中 → 日' },
  { source: 'ja', target: 'zh', name: '日 → 中' },
  { source: 'zh', target: 'de', name: '中 → 德' },
  { source: 'zh', target: 'fr', name: '中 → 法' },
];

/** 翻译请求 */
export interface TranslateRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
  style?: 'academic' | 'literary' | 'casual';
}

/** 翻译响应 */
export interface TranslateResponse {
  success: boolean;
  translatedText?: string;
  error?: string;
}

// ============================================================================
// AI检测对抗（BypassAIGC 风格）
// ============================================================================

/** AI检测对抗模式 */
export type AntiDetectionMode = 
  | 'light'    // 轻度：保持原意，微调表达
  | 'medium'   // 中度：重构句式，增加变化
  | 'heavy';   // 重度：大幅改写，彻底改写

/** AI检测对抗配置 */
export interface AntiDetectionConfig {
  mode: AntiDetectionMode;
  /** 添加人工痕迹 */
  addHumanTouch: boolean;
  /** 增加个人化表达 */
  personalize: boolean;
  /** 引入细微瑕疵（模拟人类写作特点）*/
  addImperfections: boolean;
  /** 变换句式结构 */
  varyStructure: boolean;
}

/** AI检测对抗预设 */
export const ANTI_DETECTION_PRESETS: Record<AntiDetectionMode, AntiDetectionConfig> = {
  light: {
    mode: 'light',
    addHumanTouch: true,
    personalize: false,
    addImperfections: false,
    varyStructure: true,
  },
  medium: {
    mode: 'medium',
    addHumanTouch: true,
    personalize: true,
    addImperfections: false,
    varyStructure: true,
  },
  heavy: {
    mode: 'heavy',
    addHumanTouch: true,
    personalize: true,
    addImperfections: true,
    varyStructure: true,
  },
};

/** AI检测对抗Prompt模板 */
export const ANTI_DETECTION_PROMPT = `你是一位专业的文本人性化编辑。请将以下AI生成的文本改写为更具人类写作特征的版本，要求：

## 改写原则

1. **打破AI模式**
   - 避免过于工整的句式结构
   - 减少重复性的过渡词（如"首先、其次、最后"）
   - 增加句子长度的变化

2. **增加个人特征**
   - 添加主观判断和个人见解
   - 使用更口语化的连接词
   - 引入适当的犹豫和思考痕迹

3. **保留核心内容**
   - 保持原文的主要观点和论据
   - 不改变事实信息
   - 维持逻辑连贯性

4. **模拟人类特征**
   - 添加适当的修辞变化
   - 引入轻微的不完美（如口语化表达）
   - 增加情感色彩

## 改写强度
{intensity}

原文：
{input}

请输出人性化后的文本：`;

// ============================================================================
// 增强版润色配置
// ============================================================================

/** 增强版润色配置 */
export interface EnhancedPolishConfig {
  /** 写作模式 */
  writingMode: WritingMode;
  /** 6维风格 */
  sixDimensionStyle: SixDimensionStyle;
  /** 学术润色类型（可选） */
  academicPolishType?: AcademicPolishType;
  /** AI检测对抗配置（可选） */
  antiDetection?: AntiDetectionConfig;
}

/** 默认增强配置 */
export const DEFAULT_ENHANCED_POLISH_CONFIG: EnhancedPolishConfig = {
  writingMode: 'hybrid',
  sixDimensionStyle: DEFAULT_SIX_DIMENSION_STYLE,
};
