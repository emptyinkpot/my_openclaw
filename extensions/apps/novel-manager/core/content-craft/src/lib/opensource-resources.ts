/**
 * ============================================================================
 * 开源资源库调研与集成方案
 * ============================================================================
 * 
 * 基于开源项目整理的可直接使用的资源库
 * 增量式集成，不修改现有核心逻辑
 */

// ============================================================================
// 一、中文同义词/近义词库
// ============================================================================

/**
 * 推荐1: 中文近义词词典（GitHub 高星项目）
 * 项目: https://github.com/huyingxi/synonyms
 * 特点: 10万+同义词对，支持Python调用
 * 
 * 可集成方式: 导出JSON数据，直接用于词汇替换
 */
export const SYNONYM_DATABASE: Array<{
  word: string;
  synonyms: string[];
  category: string;
  frequency: number; // 常用程度 1-5
}> = [
  // ===== 高频动词 =====
  { word: "说明", synonyms: ["表明", "显示", "证明", "揭示", "反映"], category: "动词", frequency: 5 },
  { word: "认为", synonyms: ["以为", "觉得", "相信", "确信", "主张"], category: "动词", frequency: 5 },
  { word: "发现", synonyms: ["察觉", "发觉", "觉察", "洞察", "洞见"], category: "动词", frequency: 5 },
  { word: "分析", synonyms: ["剖析", "解析", "辨析", "研析", "探析"], category: "动词", frequency: 5 },
  { word: "研究", synonyms: ["探究", "钻研", "研讨", "考究", "研析"], category: "动词", frequency: 5 },
  { word: "提出", synonyms: ["提议", "建议", "倡议", "倡导", "主张"], category: "动词", frequency: 5 },
  { word: "实现", synonyms: ["达成", "完成", "实现", "促成", "落实"], category: "动词", frequency: 5 },
  { word: "提高", synonyms: ["提升", "增强", "加强", "增进", "改善"], category: "动词", frequency: 5 },
  { word: "解决", synonyms: ["处理", "解决", "化解", "应对", "处置"], category: "动词", frequency: 5 },
  { word: "进行", synonyms: ["开展", "实施", "推行", "推进", "展开"], category: "动词", frequency: 5 },
  
  // ===== 高频名词 =====
  { word: "问题", synonyms: ["议题", "课题", "难题", "困境", "症结"], category: "名词", frequency: 5 },
  { word: "方法", synonyms: ["方式", "途径", "手段", "办法", "措施"], category: "名词", frequency: 5 },
  { word: "结果", synonyms: ["成果", "成效", "效果", "成效", "收获"], category: "名词", frequency: 5 },
  { word: "影响", synonyms: ["作用", "效应", "冲击", "波及", "影响"], category: "名词", frequency: 5 },
  { word: "发展", synonyms: ["演进", "进展", "推进", "拓展", "成长"], category: "名词", frequency: 5 },
  
  // ===== 高频形容词 =====
  { word: "重要", synonyms: ["关键", "核心", "重要", "要害", "枢纽"], category: "形容词", frequency: 5 },
  { word: "明显", synonyms: ["显著", "明显", "昭著", "突出", "显眼"], category: "形容词", frequency: 5 },
  { word: "主要", synonyms: ["首要", "根本", "核心", "基本", "主要"], category: "形容词", frequency: 5 },
  { word: "特别", synonyms: ["格外", "尤其", "特殊", "特别", "独特"], category: "形容词", frequency: 4 },
  
  // ===== 学术专用 =====
  { word: "研究", synonyms: ["探究", "研讨", "考究", "钻研", "研析"], category: "学术", frequency: 5 },
  { word: "证明", synonyms: ["证实", "验证", "论证", "印证", "佐证"], category: "学术", frequency: 5 },
  { word: "观点", synonyms: ["见解", "看法", "主张", "论点", "观点"], category: "学术", frequency: 5 },
  { word: "理论", synonyms: ["学说", "理论", "观点", "主张", "论说"], category: "学术", frequency: 4 },
];

// ============================================================================
// 二、停用词/敏感词库（基于开源项目整理）
// ============================================================================

/**
 * 推荐2: 中文停用词库
 * 项目: https://github.com/goto456/stopwords
 * 特点: 包含多个停用词表，覆盖广泛
 * 
 * 这里筛选出对文本润色有价值的"低质量表达"
 */
export const LOW_QUALITY_EXPRESSIONS: Array<{
  expression: string;
  reason: string;
  severity: 'high' | 'medium' | 'low';
  improvement: string;
}> = [
  // ===== 废话类（严重降低文本质量）=====
  { expression: "不得不说", reason: "无意义的填充词", severity: "high", improvement: "直接删除或改为'需要指出'" },
  { expression: "大家都知道", reason: "主观臆断，缺乏依据", severity: "high", improvement: "删除或改为'众所周知'" },
  { expression: "众所周知", reason: "陈词滥调", severity: "medium", improvement: "删除或直接陈述事实" },
  { expression: "不言而喻", reason: "陈词滥调", severity: "medium", improvement: "删除或直接陈述结论" },
  { expression: "由此可见", reason: "过渡词滥用", severity: "medium", improvement: "改为'这说明'或直接陈述" },
  { expression: "毋庸置疑", reason: "主观判断词", severity: "medium", improvement: "改为'显然'或提供证据" },
  { expression: "不难发现", reason: "无意义的过渡", severity: "medium", improvement: "直接陈述发现" },
  { expression: "有意思的是", reason: "口语化过渡", severity: "low", improvement: "改为'值得注意的是'" },
  { expression: "值得注意的是", reason: "AI高频过渡", severity: "medium", improvement: "改为'需要关注'" },
  { expression: "这是一个值得思考的问题", reason: "无意义的填充", severity: "high", improvement: "直接提出问题" },
  
  // ===== 重复表达 =====
  { expression: "基本上可以说", reason: "冗余表达", severity: "medium", improvement: "改为'基本上'" },
  { expression: "可以说是", reason: "口语化", severity: "low", improvement: "改为'可视为'或删除" },
  { expression: "实际上来说", reason: "冗余表达", severity: "low", improvement: "改为'实际上'" },
  { expression: "从某种程度上说", reason: "模糊限定语", severity: "low", improvement: "改为'某种意义上'" },
  { expression: "在一定程度上", reason: "模糊限定语", severity: "low", improvement: "改为'部分地'" },
  { expression: "在某种程度上", reason: "模糊限定语", severity: "low", improvement: "改为'某种程度上'" },
  { expression: "可以这样说", reason: "冗余表达", severity: "low", improvement: "删除" },
  { expression: "我们可以看到", reason: "冗余表达", severity: "medium", improvement: "改为'由此可见'" },
  { expression: "能够看到", reason: "冗余表达", severity: "low", improvement: "改为'可见'" },
  
  // ===== 口语化表达 =====
  { expression: "反正", reason: "口语化", severity: "low", improvement: "删除或改为'无论如何'" },
  { expression: "说白了", reason: "口语化", severity: "medium", improvement: "改为'简言之'或'换言之'" },
  { expression: "换句话说", reason: "AI高频词", severity: "medium", improvement: "改为'换言之'或'简言之'" },
  { expression: "打个比方", reason: "口语化", severity: "low", improvement: "改为'譬喻'或'比如'" },
  { expression: "比如说", reason: "口语化", severity: "low", improvement: "改为'例如'" },
  { expression: "就是", reason: "口语化", severity: "low", improvement: "根据上下文调整" },
  { expression: "其实", reason: "口语化过渡", severity: "low", improvement: "改为'实际上'" },
  { expression: "确实", reason: "无意义的强调", severity: "low", improvement: "删除或改为'的确'" },
  
  // ===== AI生成特征 =====
  { expression: "综上所述", reason: "AI总结标志", severity: "medium", improvement: "改为'概括而言'" },
  { expression: "总而言之", reason: "AI总结标志", severity: "medium", improvement: "改为'归纳起来'" },
  { expression: "一方面...另一方面", reason: "AI对比模式", severity: "medium", improvement: "改为'从一个角度看...从另一个角度看'" },
  { expression: "发挥着重要作用", reason: "AI评价套话", severity: "medium", improvement: "改为'至关重要'" },
  { expression: "具有重要意义", reason: "AI评价套话", severity: "medium", improvement: "改为'意义深远'" },
  { expression: "有着密切的关系", reason: "AI关联套话", severity: "medium", improvement: "改为'息息相关'" },
  { expression: "不可否认的是", reason: "AI让步套话", severity: "medium", improvement: "改为'诚然'" },
  
  // ===== 虚弱动词 =====
  { expression: "进行", reason: "虚弱动词", severity: "low", improvement: "改为具体动词如'开展''实施'" },
  { expression: "做出", reason: "虚弱动词", severity: "low", improvement: "改为具体动词如'制定''完成'" },
  { expression: "加以", reason: "虚弱动词", severity: "low", improvement: "改为具体动词或删除" },
  { expression: "予以", reason: "虚弱动词", severity: "low", improvement: "改为具体动词或删除" },
  
  // ===== 学术冗余 =====
  { expression: "从...的角度来看", reason: "学术冗余", severity: "low", improvement: "改为'从...角度'" },
  { expression: "在...的背景下", reason: "学术套话", severity: "medium", improvement: "简化为'在...背景下'" },
  { expression: "基于...的原因", reason: "冗余表达", severity: "low", improvement: "改为'因为'" },
  { expression: "关于...的问题", reason: "冗余表达", severity: "low", improvement: "改为'关于...'" },
];

// ============================================================================
// 三、AI生成特征词库（基于学术研究整理）
// ============================================================================

/**
 * 推荐3: AI文本检测对抗词库
 * 来源: 多篇AI检测论文 + 实际测试整理
 * 
 * 这些词汇/句式在AI生成文本中统计频率异常高
 */
export const AI_GENERATION_SIGNATURES: Array<{
  signature: string;
  category: 'transition' | 'structure' | 'expression' | 'tone';
  humanAlternatives: string[];
  explanation: string;
}> = [
  // ===== 过渡词特征 =====
  { 
    signature: "首先...其次...最后...", 
    category: 'structure',
    humanAlternatives: ["先是...再是...末了...", "一开始...接着...到了..."],
    explanation: "AI偏爱工整的三段式结构，人类写作更灵活"
  },
  { 
    signature: "值得注意的是", 
    category: 'transition',
    humanAlternatives: ["有趣的是", "需要关注的是", "一个值得关注的现象是"],
    explanation: "AI高频使用的强调过渡词"
  },
  { 
    signature: "综上所述", 
    category: 'transition',
    humanAlternatives: ["概括而言", "总的来说", "归纳起来"],
    explanation: "AI总结段落的标志性开头"
  },
  { 
    signature: "总而言之", 
    category: 'transition',
    humanAlternatives: ["归根结底", "说到底", "归根到底"],
    explanation: "AI总结的另一种高频表达"
  },
  { 
    signature: "一方面...另一方面...", 
    category: 'structure',
    humanAlternatives: ["从一个角度看...从另一个角度看...", "从...来看...而从...来看..."],
    explanation: "AI常用的对比结构"
  },
  
  // ===== 表达特征 =====
  { 
    signature: "发挥着重要作用", 
    category: 'expression',
    humanAlternatives: ["至关重要", "举足轻重", "不可或缺"],
    explanation: "AI评价时的程式化表达"
  },
  { 
    signature: "具有重要意义", 
    category: 'expression',
    humanAlternatives: ["意义深远", "影响重大", "价值非凡"],
    explanation: "AI论述意义的模板表达"
  },
  { 
    signature: "有着密切的关系", 
    category: 'expression',
    humanAlternatives: ["息息相关", "紧密相连", "休戚相关"],
    explanation: "AI描述关联的套路表达"
  },
  { 
    signature: "在一定程度上", 
    category: 'expression',
    humanAlternatives: ["某种程度上", "某种意义上", "从某种角度"],
    explanation: "AI常用的模糊限定"
  },
  
  // ===== 语调特征 =====
  { 
    signature: "不可否认的是", 
    category: 'tone',
    humanAlternatives: ["诚然", "必须承认", "不可否认"],
    explanation: "AI让步句式的标志"
  },
  { 
    signature: "不可否认", 
    category: 'tone',
    humanAlternatives: ["诚然", "确乎", "的确"],
    explanation: "AI让步表达"
  },
  { 
    signature: "众所周知", 
    category: 'tone',
    humanAlternatives: ["大家都知道", "人所共知", "有目共睹"],
    explanation: "AI陈述常识的标志"
  },
  
  // ===== 开头特征 =====
  { 
    signature: "随着...的发展", 
    category: 'structure',
    humanAlternatives: ["伴随着...的演进", "...日新月异之际", "在...蓬勃发展的今天"],
    explanation: "AI最常用的开头模式"
  },
  { 
    signature: "在当今社会", 
    category: 'structure',
    humanAlternatives: ["当今时代", "当今世界", "当今社会里"],
    explanation: "AI时代背景开头"
  },
  { 
    signature: "在现代社会", 
    category: 'structure',
    humanAlternatives: ["现代社会里", "当今时代", "眼下"],
    explanation: "AI社会背景开头"
  },
  
  // ===== 新增特征 =====
  { 
    signature: "不难看出", 
    category: 'transition',
    humanAlternatives: ["显而易见", "可以观察到", "我们看到"],
    explanation: "AI常用的过渡表达"
  },
  { 
    signature: "显而易见的是", 
    category: 'transition',
    humanAlternatives: ["很明显", "可以清楚地看到", "明显地"],
    explanation: "AI强调句式"
  },
  { 
    signature: "从长远来看", 
    category: 'transition',
    humanAlternatives: ["放眼未来", "从未来的角度", "展望未来"],
    explanation: "AI展望句式"
  },
  { 
    signature: "从另一个角度来看", 
    category: 'transition',
    humanAlternatives: ["换个角度看", "从另一面看", "反过来看"],
    explanation: "AI转换视角套话"
  },
  { 
    signature: "这表明了", 
    category: 'expression',
    humanAlternatives: ["这说明", "这反映出", "这体现出"],
    explanation: "AI解释说明句式"
  },
  { 
    signature: "这说明了", 
    category: 'expression',
    humanAlternatives: ["这揭示出", "这暗示着", "这证明了"],
    explanation: "AI解释说明句式"
  },
  { 
    signature: "具有重要意义", 
    category: 'expression',
    humanAlternatives: ["意义深远", "影响重大", "价值非凡"],
    explanation: "AI评价套话"
  },
  { 
    signature: "起到了...作用", 
    category: 'expression',
    humanAlternatives: ["...发挥了...", "...产生了...影响"],
    explanation: "AI描述作用的套话"
  },
  { 
    signature: "对...产生了深远影响", 
    category: 'expression',
    humanAlternatives: ["深刻改变了...", "对...影响深远", "极大地影响了..."],
    explanation: "AI描述影响的套话"
  },
  { 
    signature: "近年来", 
    category: 'structure',
    humanAlternatives: ["这几年", "近些年来", "最近几年"],
    explanation: "AI时间背景开头"
  },
  { 
    signature: "随着科技的进步", 
    category: 'structure',
    humanAlternatives: ["科技进步推动下", "科技日新月异之际", "科技发展至今"],
    explanation: "AI科技背景开头"
  },
  { 
    signature: "在...的背景下", 
    category: 'structure',
    humanAlternatives: ["在...背景下", "...的大环境下", "面对...的形势"],
    explanation: "AI背景引入套话"
  },
];

// ============================================================================
// 四、学术写作规范词库
// ============================================================================

/**
 * 推荐4: 学术写作词汇规范
 * 来源: 学术写作指南 + 论文写作规范
 * 
 * 非正式表达 → 正式学术表达
 */
export const ACADEMIC_WRITING_STANDARDS: Array<{
  informal: string;
  formal: string;
  context: string;
  note?: string;
}> = [
  // ===== 主语表述 =====
  { informal: "我觉得", formal: "笔者认为", context: "观点陈述" },
  { informal: "我认为", formal: "本文认为", context: "观点陈述" },
  { informal: "我们研究发现", formal: "研究表明", context: "研究结论" },
  { informal: "我们可以看到", formal: "由此可见", context: "论证推导" },
  
  // ===== 证据引用 =====
  { informal: "比如说", formal: "例如", context: "举例说明" },
  { informal: "举个例子", formal: "以...为例", context: "举例说明" },
  { informal: "可以看到", formal: "由此可见", context: "证据展示" },
  { informal: "看出来", formal: "可以看出", context: "分析推断" },
  
  // ===== 因果关系 =====
  { informal: "因为...所以...", formal: "由于...因此...", context: "因果论述" },
  { informal: "所以", formal: "因此", context: "因果连接" },
  { informal: "结果就是", formal: "结果表明", context: "结论陈述" },
  { informal: "原因是", formal: "原因在于", context: "原因分析" },
  
  // ===== 对比转折 =====
  { informal: "但是", formal: "然而", context: "转折论述" },
  { informal: "不过", formal: "然而", context: "转折论述" },
  { informal: "反过来", formal: "反之", context: "对比论述" },
  { informal: "相反", formal: "恰恰相反", context: "对比论述" },
  
  // ===== 总结归纳 =====
  { informal: "总的来说", formal: "综上所述", context: "总结陈述" },
  { informal: "总之", formal: "归纳起来", context: "总结陈述" },
  { informal: "最后要说的是", formal: "最后需要指出的是", context: "结语陈述", note: "学术论文结尾常用" },
  
  // ===== 程度表达 =====
  { informal: "非常", formal: "极为", context: "程度描述" },
  { informal: "特别", formal: "尤为", context: "程度描述" },
  { informal: "比较", formal: "相对", context: "程度描述" },
  { informal: "越来越", formal: "日益", context: "程度描述" },
];

// ============================================================================
// 五、文言风格转换词库
// ============================================================================

/**
 * 推荐5: 文言文/古典风格词库
 * 来源: 古汉语词典 + 文言文语料整理
 */
export const CLASSICAL_STYLE_VOCABULARY: Array<{
  modern: string;
  literary: string;
  classical: string;
  context: string;
}> = [
  // ===== 时间 =====
  { modern: "现在", literary: "如今", classical: "今", context: "时间" },
  { modern: "以前", literary: "往昔", classical: "昔", context: "时间" },
  { modern: "以后", literary: "日后", classical: "后", context: "时间" },
  { modern: "最近", literary: "近时", classical: "近来", context: "时间" },
  { modern: "突然", literary: "陡然", classical: "忽", context: "时间" },
  { modern: "渐渐", literary: "逐渐", classical: "渐", context: "时间" },
  { modern: "刚刚", literary: "方才", classical: "甫", context: "时间" },
  { modern: "一直", literary: "始终", classical: "素", context: "时间" },
  
  // ===== 程度 =====
  { modern: "非常", literary: "极为", classical: "甚", context: "程度" },
  { modern: "特别", literary: "格外", classical: "尤", context: "程度" },
  { modern: "更加", literary: "愈发", classical: "益", context: "程度" },
  { modern: "稍微", literary: "略微", classical: "稍", context: "程度" },
  { modern: "完全", literary: "全然", classical: "尽", context: "程度" },
  { modern: "几乎", literary: "几近", classical: "几", context: "程度" },
  
  // ===== 关联 =====
  { modern: "因为", literary: "由于", classical: "因", context: "因果" },
  { modern: "所以", literary: "故而", classical: "故", context: "因果" },
  { modern: "但是", literary: "然而", classical: "然", context: "转折" },
  { modern: "如果", literary: "倘若", classical: "若", context: "假设" },
  { modern: "虽然", literary: "虽说", classical: "虽", context: "让步" },
  { modern: "即使", literary: "纵使", classical: "纵", context: "让步" },
  
  // ===== 动作 =====
  { modern: "看", literary: "望去", classical: "望", context: "动作" },
  { modern: "听", literary: "聆听", classical: "闻", context: "动作" },
  { modern: "说", literary: "说道", classical: "道", context: "言语" },
  { modern: "想", literary: "思忖", classical: "思", context: "心理" },
  { modern: "知道", literary: "知晓", classical: "知", context: "认知" },
  { modern: "能够", literary: "能够", classical: "能", context: "能力" },
  
  // ===== 人物 =====
  { modern: "人们", literary: "世人", classical: "人", context: "人物" },
  { modern: "大家", literary: "众人", classical: "众", context: "人物" },
  { modern: "自己", literary: "自身", classical: "己", context: "人物" },
  { modern: "别人", literary: "他人", classical: "人", context: "人物" },
  
  // ===== 情感 =====
  { modern: "高兴", literary: "欣喜", classical: "喜", context: "情感" },
  { modern: "悲伤", literary: "哀伤", classical: "悲", context: "情感" },
  { modern: "愤怒", literary: "愤懑", classical: "怒", context: "情感" },
  { modern: "担心", literary: "忧虑", classical: "忧", context: "情感" },
  { modern: "惊讶", literary: "惊诧", classical: "惊", context: "情感" },
  { modern: "喜欢", literary: "钟爱", classical: "好", context: "情感" },
];

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 批量转换资源格式
 */
export function getResourceStats() {
  return {
    synonyms: SYNONYM_DATABASE.length,
    lowQuality: LOW_QUALITY_EXPRESSIONS.length,
    aiSignatures: AI_GENERATION_SIGNATURES.length,
    academic: ACADEMIC_WRITING_STANDARDS.length,
    classical: CLASSICAL_STYLE_VOCABULARY.length,
    total: SYNONYM_DATABASE.length + 
           LOW_QUALITY_EXPRESSIONS.length + 
           AI_GENERATION_SIGNATURES.length + 
           ACADEMIC_WRITING_STANDARDS.length +
           CLASSICAL_STYLE_VOCABULARY.length,
  };
}

/**
 * 推荐的开源项目列表
 */
export const RECOMMENDED_OPENSOURCE_PROJECTS = [
  {
    name: "中文同义词词典",
    repo: "https://github.com/huyingxi/synonyms",
    stars: "2.5K+",
    description: "中文近义词、反义词词典，支持Python调用",
    usage: "可导出JSON数据用于词汇替换",
  },
  {
    name: "中文停用词库",
    repo: "https://github.com/goto456/stopwords",
    stars: "3K+",
    description: "多个中文停用词表，覆盖广泛",
    usage: "可用于识别低质量表达",
  },
  {
    name: "HanLP",
    repo: "https://github.com/hankcs/HanLP",
    stars: "30K+",
    description: "中文NLP工具包，包含同义词、近义词分析",
    usage: "可通过API获取同义词推荐",
  },
  {
    name: "Jieba中文分词",
    repo: "https://github.com/fxsjy/jieba",
    stars: "30K+",
    description: "中文分词工具，支持词性标注",
    usage: "可用于文本分析和词性识别",
  },
  {
    name: "AI Text Detector",
    repo: "https://github.com/openai/gpt-2-output-dataset",
    stars: "5K+",
    description: "AI文本检测研究数据集",
    usage: "可用于训练识别AI生成特征",
  },
];
