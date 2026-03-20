/**
 * ============================================================================
 * 开源资源库预置数据
 * ============================================================================
 * 
 * 基于开源项目整理的词汇库、禁用词库等资源
 * 增量式集成，不修改现有核心逻辑
 */

// ============================================================================
// 高质量词汇替换库
// ============================================================================

/**
 * 同义词替换库 - 提升文本多样性
 * 来源：综合多个开源项目整理
 */
export const SYNONYM_VOCABULARY: Array<{
  original: string;
  synonyms: string[];
  category: string;
  context?: string; // 适用语境
}> = [
  // ===== 表示/表达类 =====
  { original: "表示", synonyms: ["认为", "指出", "称", "说道", "强调", "坦言", "坦言道"], category: "表达", context: "学术/新闻" },
  { original: "认为", synonyms: ["以为", "觉得", "深信", "确信", "笃信", "信奉"], category: "表达", context: "通用" },
  { original: "说", synonyms: ["说道", "言道", "道", "称", "言", "云"], category: "表达", context: "文学" },
  { original: "指出", synonyms: ["提到", "言及", "谈及", "论及", "点出", "道出"], category: "表达", context: "学术" },
  
  // ===== 变化/发展类 =====
  { original: "变化", synonyms: ["变迁", "演变", "演变", "转化", "更迭", "嬗变"], category: "变化", context: "文学" },
  { original: "发展", synonyms: ["演进", "推进", "拓展", "延展", "深化", "拓深"], category: "变化", context: "学术" },
  { original: "出现", synonyms: ["涌现", "显现", "呈现", "显露", "浮出", "昭示"], category: "变化", context: "通用" },
  { original: "改变", synonyms: ["更改", "更易", "易换", "变换", "扭转", "扭转"], category: "变化", context: "通用" },
  
  // ===== 影响/作用类 =====
  { original: "影响", synonyms: ["波及", "触及", "牵动", "撼动", "震动", "撼摇"], category: "影响", context: "文学" },
  { original: "作用", synonyms: ["效力", "功效", "效用", "功绩", "功用", "功能"], category: "影响", context: "学术" },
  { original: "导致", synonyms: ["引致", "招致", "致使", "使得", "诱致", "诱发"], category: "影响", context: "学术" },
  
  // ===== 研究/分析类 =====
  { original: "研究", synonyms: ["探究", "研讨", "钻研", "考究", "探究", "研析"], category: "学术", context: "学术" },
  { original: "分析", synonyms: ["剖析", "解析", "研析", "辨析", "探析", "阐析"], category: "学术", context: "学术" },
  { original: "发现", synonyms: ["发觉", "察觉", "洞察", "洞见", "察觉", "察知"], category: "学术", context: "学术" },
  
  // ===== 重要/关键类 =====
  { original: "重要", synonyms: ["关键", "要害", "枢纽", "关键性", "举足轻重", "至关重要"], category: "程度", context: "通用" },
  { original: "主要", synonyms: ["首要", "首要", "核心", "根本", "基本", "本质"], category: "程度", context: "学术" },
  { original: "显著", synonyms: ["明显", "昭著", "昭然", "显明", "显见", "显然"], category: "程度", context: "学术" },
  
  // ===== 时间/过程类 =====
  { original: "开始", synonyms: ["起始", "肇始", "发端", "开端", "起头", "先河"], category: "时间", context: "文学" },
  { original: "结束", synonyms: ["终结", "终结", "落幕", "收尾", "告终", "完结"], category: "时间", context: "文学" },
  { original: "过程", synonyms: ["历程", "进程", "经纬", "轨迹", "脉络", "经过"], category: "时间", context: "通用" },
  
  // ===== 观点/看法类 =====
  { original: "观点", synonyms: ["见解", "看法", "主张", "论点", "论调", "观点"], category: "观点", context: "学术" },
  { original: "看法", synonyms: ["见解", "心得", "体悟", "感悟", "认识", "认知"], category: "观点", context: "通用" },
];

// ============================================================================
// 文学风格词汇库
// ============================================================================

/**
 * 文学化表达词汇 - 提升文学性
 * 用于文言风格转换
 */
export const LITERARY_VOCABULARY: Array<{
  modern: string;     // 现代表达
  literary: string;   // 文学表达
  classical?: string; // 古典表达
  context: string;
}> = [
  // ===== 时间表达 =====
  { modern: "现在", literary: "如今", classical: "今", context: "时间" },
  { modern: "以前", literary: "往昔", classical: "昔", context: "时间" },
  { modern: "以后", literary: "日后", classical: "后", context: "时间" },
  { modern: "同时", literary: "与此同时", classical: "同步", context: "时间" },
  { modern: "突然", literary: "陡然", classical: "忽", context: "时间" },
  { modern: "渐渐", literary: "逐渐", classical: "渐", context: "时间" },
  
  // ===== 程度表达 =====
  { modern: "非常", literary: "极为", classical: "甚", context: "程度" },
  { modern: "特别", literary: "格外", classical: "尤", context: "程度" },
  { modern: "更加", literary: "愈发", classical: "益", context: "程度" },
  { modern: "稍微", literary: "略微", classical: "稍", context: "程度" },
  { modern: "完全", literary: "全然", classical: "尽", context: "程度" },
  
  // ===== 因果关系 =====
  { modern: "因为", literary: "由于", classical: "因", context: "因果" },
  { modern: "所以", literary: "故而", classical: "故", context: "因果" },
  { modern: "但是", literary: "然而", classical: "然", context: "转折" },
  { modern: "可是", literary: "可是", classical: "顾", context: "转折" },
  { modern: "虽然", literary: "虽说", classical: "虽", context: "让步" },
  
  // ===== 人物动作 =====
  { modern: "看", literary: "望去", classical: "望", context: "动作" },
  { modern: "想", literary: "思忖", classical: "思", context: "心理" },
  { modern: "说", literary: "说道", classical: "道", context: "言语" },
  { modern: "走", literary: "前行", classical: "行", context: "动作" },
  { modern: "做", literary: "行事", classical: "为", context: "动作" },
  
  // ===== 情感表达 =====
  { modern: "高兴", literary: "欣喜", classical: "喜", context: "情感" },
  { modern: "悲伤", literary: "哀伤", classical: "悲", context: "情感" },
  { modern: "愤怒", literary: "愤懑", classical: "怒", context: "情感" },
  { modern: "担心", literary: "忧虑", classical: "忧", context: "情感" },
  { modern: "惊讶", literary: "惊诧", classical: "惊", context: "情感" },
];

// ============================================================================
// AI特征词汇识别库
// ============================================================================

/**
 * AI生成文本特征词 - 用于识别和替换
 * 这些词汇在AI生成文本中出现频率过高
 */
export const AI_CHARACTERISTIC_WORDS: Array<{
  phrase: string;
  reason: string;
  alternatives: string[];
  severity: 'high' | 'medium' | 'low';
}> = [
  // ===== 高频AI词汇 =====
  { phrase: "值得注意的是", reason: "AI高频过渡词", alternatives: ["需要关注的是", "值得关注的是", "有意思的是"], severity: "high" },
  { phrase: "综上所述", reason: "AI总结模式", alternatives: ["概括而言", "总而言之", "总的来说"], severity: "high" },
  { phrase: "总而言之", reason: "AI总结模式", alternatives: ["概括而言", "总体来看", "总的来说"], severity: "high" },
  { phrase: "首先，其次，最后", reason: "AI列举模式", alternatives: ["先是，再是，末了", "一开始，接着，最后"], severity: "high" },
  { phrase: "不可否认的是", reason: "AI让步句式", alternatives: ["诚然", "必须承认"], severity: "medium" },
  { phrase: "不可否认", reason: "AI让步句式", alternatives: ["诚然", "不容否认"], severity: "medium" },
  
  // ===== AI句式特征 =====
  { phrase: "这在一定程度上", reason: "AI模糊限定", alternatives: ["某种意义上", "从某种角度看"], severity: "medium" },
  { phrase: "具有重要意义", reason: "AI评价模式", alternatives: ["至关重要", "意义深远", "举足轻重"], severity: "medium" },
  { phrase: "发挥着重要作用", reason: "AI评价模式", alternatives: ["扮演着关键角色", "有着举足轻重的地位"], severity: "medium" },
  { phrase: "有着密切的关系", reason: "AI关系描述", alternatives: ["息息相关", "紧密相连", "休戚相关"], severity: "medium" },
  
  // ===== AI表达习惯 =====
  { phrase: "事实上", reason: "AI转折习惯", alternatives: ["其实", "实际上", "说到底"], severity: "low" },
  { phrase: "换句话说", reason: "AI解释习惯", alternatives: ["换言之", "简单来说", "换而言之"], severity: "low" },
  { phrase: "另一方面", reason: "AI并列习惯", alternatives: ["从另一角度", "换个角度看"], severity: "low" },
  { phrase: "在很大程度上", reason: "AI程度限定", alternatives: ["很大程度上", "在很大程度上", "相当程度上"], severity: "low" },
  
  // ===== AI开头模式 =====
  { phrase: "随着...的发展", reason: "AI常见开头", alternatives: ["伴随着...的演进", "...日益发展之际"], severity: "high" },
  { phrase: "在当今社会", reason: "AI常见开头", alternatives: ["当今时代", "在这个时代"], severity: "high" },
  { phrase: "在现代社会", reason: "AI常见开头", alternatives: ["现代社会里", "当今世界"], severity: "high" },
];

// ============================================================================
// 网络用语识别库
// ============================================================================

/**
 * 网络用语/口语化表达 - 用于正式文本净化
 */
export const INTERNET_SLANG: Array<{
  slang: string;
  formal: string;
  context: string;
}> = [
  // ===== 程度副词 =====
  { slang: "超", formal: "非常", context: "程度" },
  { slang: "巨", formal: "极其", context: "程度" },
  { slang: "贼", formal: "非常", context: "程度" },
  { slang: "特别特别", formal: "格外", context: "程度" },
  
  // ===== 动作表达 =====
  { slang: "打卡", formal: "记录", context: "动作" },
  { slang: "种草", formal: "推荐", context: "推荐" },
  { slang: "拔草", formal: "购买", context: "消费" },
  { slang: "安利", formal: "推荐", context: "推荐" },
  
  // ===== 情感表达 =====
  { slang: "破防", formal: "触动", context: "情感" },
  { slang: "上头", formal: "沉迷", context: "状态" },
  { slang: "emo", formal: "伤感", context: "情感" },
  { slang: "躺平", formal: "消极应对", context: "态度" },
  
  // ===== 评价表达 =====
  { slang: "绝了", formal: "出色", context: "评价" },
  { slang: "yyds", formal: "卓越", context: "评价" },
  { slang: "绝绝子", formal: "极佳", context: "评价" },
  { slang: "太绝了", formal: "非常出色", context: "评价" },
];

// ============================================================================
// 学术写作优化库
// ============================================================================

/**
 * 学术写作常用表达 - 提升学术规范性
 */
export const ACADEMIC_EXPRESSIONS: Array<{
  informal: string;    // 非正式表达
  formal: string;      // 正式学术表达
  category: string;
}> = [
  // ===== 论述类 =====
  { informal: "我觉得", formal: "笔者认为", category: "论述" },
  { informal: "我认为", formal: "本文认为", category: "论述" },
  { informal: "在我看来", formal: "从本研究视角来看", category: "论述" },
  { informal: "我想说", formal: "需要指出的是", category: "论述" },
  
  // ===== 证据类 =====
  { informal: "例子", formal: "案例", category: "证据" },
  { informal: "证明", formal: "证实", category: "证据" },
  { informal: "可以看出来", formal: "由此可见", category: "证据" },
  { informal: "说明", formal: "表明", category: "证据" },
  
  // ===== 分析类 =====
  { informal: "分析一下", formal: "对此进行分析", category: "分析" },
  { informal: "研究一下", formal: "开展研究", category: "分析" },
  { informal: "比较一下", formal: "进行比较分析", category: "分析" },
  { informal: "总结一下", formal: "归纳如下", category: "分析" },
  
  // ===== 结论类 =====
  { informal: "结果是", formal: "研究结果表明", category: "结论" },
  { informal: "结论是", formal: "由此得出结论", category: "结论" },
  { informal: "总的来说", formal: "综上所述", category: "结论" },
  { informal: "最后", formal: "最后需要指出的是", category: "结论" },
];

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 将词汇库转换为ResourceItem格式
 */
export function convertToResourceItems(
  vocabulary: typeof SYNONYM_VOCABULARY,
  type: 'vocabulary'
): Array<{
  id: string;
  content: string;
  type: string;
  category: string;
  note?: string;
  createdAt: number;
}> {
  return vocabulary.map((item, index) => ({
    id: `preset-synonym-${index}`,
    content: `${item.original}→${item.synonyms.join('/')}`,
    type,
    category: item.category,
    note: item.context,
    createdAt: Date.now(),
  }));
}

/**
 * 将AI特征词转换为禁用词格式
 */
export function convertToBannedWords(
  words: typeof AI_CHARACTERISTIC_WORDS
): Array<{
  id: string;
  content: string;
  type: string;
  category: string;
  reason: string;
  alternative?: string;
  createdAt: number;
}> {
  return words.map((item, index) => ({
    id: `preset-ai-word-${index}`,
    content: item.phrase,
    type: 'ai_style',
    category: 'AI特征词',
    reason: item.reason,
    alternative: item.alternatives[0],
    createdAt: Date.now(),
  }));
}

// ============================================================================
// 资源库统计
// ============================================================================

export const RESOURCE_STATS = {
  synonymVocabulary: SYNONYM_VOCABULARY.length,
  literaryVocabulary: LITERARY_VOCABULARY.length,
  aiCharacteristicWords: AI_CHARACTERISTIC_WORDS.length,
  internetSlang: INTERNET_SLANG.length,
  academicExpressions: ACADEMIC_EXPRESSIONS.length,
  total: SYNONYM_VOCABULARY.length + LITERARY_VOCABULARY.length + 
         AI_CHARACTERISTIC_WORDS.length + INTERNET_SLANG.length + 
         ACADEMIC_EXPRESSIONS.length,
};
