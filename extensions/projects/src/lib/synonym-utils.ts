/**
 * 同义词工具模块
 * 参考开源项目 Synonyms (https://github.com/chatopera/Synonyms) 的实现思路
 * 用于文本润色过程中的同义词替换
 */

// 常用同义词词典（基于词性分类）
const SYNONYM_DICT: Record<string, string[]> = {
  // 形容词
  '优秀': ['出色', '杰出', '卓越', '优异'],
  '重要': ['关键', '主要', '核心', '重大'],
  '明显': ['显著', '突出', '鲜明'],
  '困难': ['艰难', '艰巨', '棘手', '不易'],
  '简单': ['简便', '简易', '容易', '轻松'],
  '快速': ['迅速', '快捷', '高速', '飞速'],
  '准确': ['精确', '精准', '正确', '无误'],
  '完整': ['完备', '完善', '齐全', '周全'],
  '清晰': ['清楚', '明晰', '明确', '明了'],
  '丰富': ['充足', '充裕', '丰厚', '多彩'],
  '强大': ['强劲', '强盛', '雄厚', '有力'],
  '美观': ['漂亮', '美丽', '精致', '大方'],
  '实用': ['好用', '适用', '便捷', '方便'],
  '稳定': ['稳固', '平稳', '安定', '可靠'],
  '灵活': ['灵便', '机动', '活络', '变通'],
  '详细': ['详尽', '细致', '周详', '详备'],
  '全面': ['周全', '完备', '综合', '整体'],
  '深刻': ['深入', '深邃', '深厚', '透彻'],
  '广泛': ['普遍', '宽广', '广阔', '辽阔'],
  '独特': ['特别', '特殊', '独到', '与众不同'],
  
  // 动词
  '实现': ['达成', '完成', '做到', '促成'],
  '提高': ['提升', '增强', '加强', '增进'],
  '改进': ['改善', '改良', '优化', '完善'],
  '分析': ['解析', '剖析', '研究', '探究'],
  '研究': ['探究', '研讨', '钻研', '考察'],
  '开发': ['研制', '构建', '创设', '打造'],
  '设计': ['策划', '规划', '构思', '谋划'],
  '实施': ['施行', '实行', '执行', '落实'],
  '推广': ['普及', '传播', '宣传'],
  '应用': ['运用', '使用', '采用', '利用'],
  '支持': ['支撑', '援助', '扶持', '帮助'],
  '解决': ['处理', '化解', '应对'],
  '优化': ['改进', '完善', '改良', '提升'],
  '整合': ['融合', '结合', '统一', '集成'],
  '创新': ['革新', '创造', '开拓', '发明'],
  
  // 名词
  '方法': ['方式', '途径', '手段', '办法'],
  '问题': ['难题', '疑问', '议题', '课题'],
  '目标': ['目的', '指标', '宗旨', '方向'],
  '结果': ['成果', '成效', '效果', '结局'],
  '过程': ['流程', '进程', '经过', '历程'],
  '特点': ['特征', '特性', '特质', '属性'],
  '意义': ['价值', '作用', '重要性', '含义'],
  '影响': ['作用', '效应', '波及', '冲击'],
  '优势': ['长处', '优点', '益处'],
  '挑战': ['考验', '困难', '难题', '困境'],
  '机遇': ['机会', '契机', '时机', '良机'],
  '经验': ['经历', '心得', '体验', '阅历'],
  '知识': ['学问', '学识', '见闻', '素养'],
  '技术': ['工艺', '技能', '技艺'],
  '数据': ['资料', '信息', '材料', '素材'],
  
  // 程度副词
  '非常': ['十分', '极其', '特别', '格外'],
  '十分': ['非常', '极其', '特别', '相当'],
  '尤其': ['特别', '格外', '尤为'],
  '特别': ['格外', '尤其', '十分'],
  '相当': ['颇为', '十分', '比较', '较为'],
  '较为': ['比较', '相对', '颇'],
  
  // 连接词
  '因此': ['所以', '因而', '故而', '于是'],
  '但是': ['然而', '可是', '不过', '却'],
  '并且': ['而且', '同时', '此外'],
  '或者': ['或是', '抑或', '亦或'],
  '因为': ['由于', '因', '缘故'],
  '虽然': ['尽管', '固然', '虽'],
};

// 不可替换词列表（专业术语、人名、地名等）
const NON_REPLACEABLE_WORDS = new Set([
  // 技术术语
  'React', 'Vue', 'Angular', 'TypeScript', 'JavaScript', 'Python', 'Java',
  'API', 'HTTP', 'HTTPS', 'REST', 'GraphQL', 'SQL', 'NoSQL',
  'CPU', 'GPU', 'RAM', 'SSD', 'HDD', 'LED', 'LCD',
  'AI', 'ML', 'DL', 'NLP', 'CV', 'OCR', 'LLM',
  'GPT', 'BERT', 'Transformer', 'CNN', 'RNN', 'LSTM',
  
  // 中文专有名词
  '人工智能', '机器学习', '深度学习', '神经网络', '自然语言处理',
  '计算机视觉', '大数据', '云计算', '区块链', '物联网',
]);

/**
 * 词性分类
 */
export type PartOfSpeech = 'noun' | 'verb' | 'adjective' | 'adverb' | 'conjunction' | 'other';

/**
 * 词性映射
 */
const POS_MAP: Record<string, PartOfSpeech> = {
  // 名词标记
  'n': 'noun', 'nr': 'noun', 'ns': 'noun', 'nt': 'noun', 'nz': 'noun',
  // 动词标记
  'v': 'verb', 'vd': 'verb', 'vn': 'verb', 'vg': 'verb', 'vi': 'verb',
  // 形容词标记
  'a': 'adjective', 'ad': 'adjective', 'an': 'adjective', 'ag': 'adjective',
  // 副词标记
  'd': 'adverb',
  // 连词标记
  'c': 'conjunction', 'cc': 'conjunction',
};

/**
 * 同义词查找结果
 */
export interface SynonymResult {
  word: string;
  synonyms: string[];
  scores: number[];
  partOfSpeech: PartOfSpeech;
}

/**
 * 获取同义词
 */
export function getSynonyms(word: string): SynonymResult | null {
  // 检查是否为不可替换词
  if (NON_REPLACEABLE_WORDS.has(word)) {
    return null;
  }
  
  // 查找同义词
  const synonyms = SYNONYM_DICT[word];
  if (!synonyms || synonyms.length === 0) {
    return null;
  }
  
  // 移除原词本身
  const filteredSynonyms = synonyms.filter(s => s !== word);
  if (filteredSynonyms.length === 0) {
    return null;
  }
  
  // 计算相似度分数（简单实现，实际项目中应使用词向量）
  const scores = filteredSynonyms.map((_, index) => 
    Math.max(0.5, 1 - index * 0.05)
  );
  
  return {
    word,
    synonyms: filteredSynonyms,
    scores,
    partOfSpeech: guessPartOfSpeech(word),
  };
}

/**
 * 猜测词性
 */
function guessPartOfSpeech(word: string): PartOfSpeech {
  // 简单的词性猜测规则
  const adjEndings = ['的', '性', '化'];
  const verbEndings = ['了', '着', '过', '起来', '下去'];
  const advEndings = ['地', '得'];
  
  if (adjEndings.some(ending => word.endsWith(ending))) {
    return 'adjective';
  }
  if (verbEndings.some(ending => word.endsWith(ending))) {
    return 'verb';
  }
  if (advEndings.some(ending => word.endsWith(ending))) {
    return 'adverb';
  }
  
  // 查词典
  const pos = POS_MAP[word];
  if (pos) {
    return pos;
  }
  
  return 'other';
}

/**
 * 选择最佳同义词
 */
export function selectBestSynonym(
  word: string, 
  context: string, 
  options: {
    minScore?: number;
    preferFormal?: boolean;
    keepTone?: boolean;
  } = {}
): string | null {
  const { minScore = 0.6, preferFormal = false } = options;
  
  const result = getSynonyms(word);
  if (!result) return null;
  
  // 过滤低分同义词
  const candidates = result.synonyms
    .map((syn, i) => ({ word: syn, score: result.scores[i] }))
    .filter(item => item.score >= minScore);
  
  if (candidates.length === 0) return null;
  
  // 如果偏好正式用词，优先选择较长的词
  if (preferFormal) {
    candidates.sort((a, b) => b.word.length - a.word.length);
  }
  
  // 简单上下文匹配（实际项目中应使用更复杂的模型）
  const selected = candidates[0];
  
  // 确保替换后的词在上下文中合适
  if (isContextuallyAppropriate(selected.word, context)) {
    return selected.word;
  }
  
  return null;
}

/**
 * 检查词汇在上下文中是否合适
 */
function isContextuallyAppropriate(word: string, context: string): boolean {
  // 简单规则检查
  // 1. 避免重复
  if (context.includes(word)) {
    // 如果文中已出现多次该词，不建议替换
    const count = (context.match(new RegExp(word, 'g')) || []).length;
    if (count > 2) return false;
  }
  
  // 2. 检查词长是否合适
  if (word.length < 1 || word.length > 10) {
    return false;
  }
  
  return true;
}

/**
 * 批量同义词替换
 */
export function batchSynonymReplace(
  text: string,
  options: {
    replaceRatio?: number;
    minScore?: number;
    preserveWords?: string[];
    preferFormal?: boolean;
  } = {}
): { text: string; replacements: Array<{ original: string; replaced: string; position: number }> } {
  const {
    replaceRatio = 0.2,
    minScore = 0.6,
    preserveWords = [],
    preferFormal = false,
  } = options;
  
  const preserveSet = new Set([...NON_REPLACEABLE_WORDS, ...preserveWords]);
  const replacements: Array<{ original: string; replaced: string; position: number }> = [];
  
  // 简单分词（实际项目应使用jieba等工具）
  const words = segmentText(text);
  
  // 计算需要替换的词数
  const replaceCount = Math.max(1, Math.floor(words.length * replaceRatio));
  
  // 找出可替换的词
  const replaceableIndices: number[] = [];
  words.forEach((word, index) => {
    if (!preserveSet.has(word.word) && getSynonyms(word.word)) {
      replaceableIndices.push(index);
    }
  });
  
  // 随机选择要替换的词
  const toReplace = shuffleArray(replaceableIndices).slice(0, replaceCount);
  
  // 执行替换
  let offset = 0;
  toReplace.sort((a, b) => a - b).forEach(index => {
    const word = words[index];
    const replacement = selectBestSynonym(word.word, text, { minScore, preferFormal });
    
    if (replacement) {
      const position = word.position + offset;
      replacements.push({
        original: word.word,
        replaced: replacement,
        position,
      });
      offset += replacement.length - word.word.length;
    }
  });
  
  // 构建新文本
  let newText = text;
  replacements.forEach(({ original, replaced, position }) => {
    newText = newText.slice(0, position) + replaced + newText.slice(position + original.length);
  });
  
  return { text: newText, replacements };
}

/**
 * 简单文本分词
 */
function segmentText(text: string): Array<{ word: string; position: number }> {
  const result: Array<{ word: string; position: number }> = [];
  
  // 简单规则：按标点和空格分词
  // 实际项目应使用jieba等中文分词工具
  const pattern = /[\u4e00-\u9fa5]+|[a-zA-Z]+|[0-9]+|[^\u4e00-\u9fa5a-zA-Z0-9]+/g;
  let match;
  
  while ((match = pattern.exec(text)) !== null) {
    result.push({
      word: match[0],
      position: match.index,
    });
  }
  
  return result;
}

/**
 * 数组随机打乱
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 计算两个句子的相似度
 */
export function calculateSimilarity(sentence1: string, sentence2: string): number {
  // 简单的Jaccard相似度
  const words1 = new Set(segmentText(sentence1).map(w => w.word));
  const words2 = new Set(segmentText(sentence2).map(w => w.word));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * 提取关键词
 */
export function extractKeywords(text: string, topK: number = 5): string[] {
  const words = segmentText(text);
  const wordFreq: Record<string, number> = {};
  
  // 计算词频
  words.forEach(({ word }) => {
    // 过滤停用词和标点
    if (word.length >= 2 && !NON_REPLACEABLE_WORDS.has(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });
  
  // 排序并返回topK
  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([word]) => word);
}

export default {
  getSynonyms,
  selectBestSynonym,
  batchSynonymReplace,
  calculateSimilarity,
  extractKeywords,
};
