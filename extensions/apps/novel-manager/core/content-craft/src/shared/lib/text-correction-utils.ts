/**
 * 文本纠错工具模块
 * 参考开源项目 pycorrector (https://github.com/shibing624/pycorrector) 的实现思路
 * 用于文本润色过程中的拼写纠错和语法检查
 */

// 常见错误类型
export enum ErrorType {
  SOUND_SIMILAR = 'sound_similar',    // 音似错误
  SHAPE_SIMILAR = 'shape_similar',    // 形似错误
  GRAMMAR = 'grammar',                 // 语法错误
  PROPER_NAME = 'proper_name',        // 专名错误
  COMMON_ERROR = 'common_error',      // 常见错误
}

// 错误检测结果
export interface DetectedError {
  error: string;           // 错误词
  position: number;        // 错误位置
  endPosition: number;     // 结束位置
  type: ErrorType;         // 错误类型
  suggestions: string[];   // 建议修正
  confidence: number;      // 置信度
}

// 纠错结果
export interface CorrectionResult {
  original: string;        // 原文
  corrected: string;       // 纠正后
  errors: Array<{
    error: string;
    correction: string;
    position: number;
    type: ErrorType;
  }>;
}

// 音似词词典（拼音相同或相近）
const SOUND_SIMILAR_DICT: Record<string, string[]> = {
  '因该': ['应该'],
  '以经': ['已经'],
  '在次': ['再次'],
  '不在': ['不在', '不再'],
  '必须': ['必需', '必须'],
  '必需': ['必须', '必需'],
  '权力': ['权利', '权力'],
  '反应': ['反应', '反映'],
  '反映': ['反应', '反映'],
  '截止': ['截止', '截至'],
  '截至': ['截止', '截至'],
  '启事': ['启事', '启示'],
  '启示': ['启事', '启示'],
  '学历': ['学历', '学力'],
  '学力': ['学历', '学力'],
  '夸奖': ['夸奖', '夸耀'],
  '夸耀': ['夸奖', '夸耀'],
  '钻研': ['钻研', '专研'],
  '专研': ['钻研', '专研'],
  '考验': ['考验', '考俭'],
  '坚苦': ['艰苦'],
  '艰苦': ['坚苦', '艰苦'],
  '辛酸': ['辛酸', '心酸'],
  '心酸': ['辛酸', '心酸'],
  '化妆': ['化妆', '化装'],
  '化装': ['化妆', '化装'],
  '终身': ['终身', '终生'],
  '终生': ['终身', '终生'],
  '意气': ['意气', '义气'],
  '义气': ['意气', '义气'],
  '包含': ['包含', '包涵'],
  '包涵': ['包含', '包涵'],
  '去除': ['去除', '除去'],
  '爆发': ['爆发', '暴发'],
  '暴发': ['爆发', '暴发'],
  '处世': ['处世', '处事'],
  '处事': ['处世', '处事'],
  '检察': ['检察', '检查'],
  '检查': ['检察', '检查'],
  '年轻': ['年轻', '年青'],
  '年青': ['年轻', '年青'],
};

// 形似词词典（字形相近）
const SHAPE_SIMILAR_DICT: Record<string, string[]> = {
  '己': ['已', '巳'],
  '已': ['己', '巳'],
  '巳': ['己', '已'],
  '戊': ['戊', '戌', '戍', '戎'],
  '戌': ['戊', '戌', '戍', '戎'],
  '戍': ['戊', '戌', '戍', '戎'],
  '戎': ['戊', '戌', '戍', '戎'],
  '未': ['未', '末'],
  '末': ['未', '末'],
  '日': ['日', '曰'],
  '曰': ['日', '曰'],
  '刀': ['刀', '力', '刃'],
  '力': ['刀', '力', '刃'],
  '人': ['人', '入', '八'],
  '入': ['人', '入', '八'],
  '土': ['土', '士'],
  '士': ['土', '士'],
  '折': ['折', '拆'],
  '拆': ['折', '拆'],
  '拔': ['拔', '拨'],
  '拨': ['拔', '拨'],
  '徒': ['徒', '徙'],
  '徙': ['徒', '徙'],
  '栗': ['栗', '粟'],
  '粟': ['栗', '粟'],
  '免': ['免', '兔'],
  '兔': ['免', '兔'],
  '茶': ['茶', '荼'],
  '荼': ['茶', '荼'],
  '崇': ['崇', '祟'],
  '祟': ['崇', '祟'],
  '管': ['管', '菅'],
  '菅': ['管', '菅'],
  '官': ['官', '宫'],
  '宫': ['官', '宫'],
  '壁': ['壁', '璧'],
  '璧': ['壁', '璧'],
  '贬': ['贬', '眨'],
  '眨': ['贬', '眨'],
  '杆': ['杆', '秆'],
  '秆': ['杆', '秆'],
};

// 常见错误词典
const COMMON_ERROR_DICT: Record<string, string[]> = {
  '的地得': [],  // 特殊处理
  '做作': ['做', '作'],
  '按装': ['安装'],
  '按奈': ['按捺'],
  '安祥': ['安详'],
  '弊病': ['弊端'],
  '针贬': ['针砭'],
  '斑澜': ['斑斓'],
  '暴炸': ['爆炸'],
  '渲泄': ['宣泄'],
  '暄哗': ['喧哗'],
  '通谍': ['通牒'],
  '辩证': ['辨正'],
  '辨正': ['辩证'],
  '粗旷': ['粗犷'],
  '穿带': ['穿戴'],
  '淬炼': ['锤炼'],
  '凑和': ['凑合'],
  '座落': ['坐落'],
  '坐落': ['座落'],
  '代款': ['贷款'],
  '担搁': ['耽搁'],
  '挡工': ['停工'],
  '倒致': ['导致'],
  '抵压': ['抵押'],
  '凋谢': ['凋谢'],
  '渡过': ['度过'],
  '度过': ['渡过'],
  '防碍': ['妨碍'],
  '分岐': ['分歧'],
  '福份': ['福分'],
  '复盖': ['覆盖'],
  '恭唯': ['恭维'],
  '勾通': ['沟通'],
  '沟通': ['勾通'],
  '贯输': ['灌输'],
  '寒喧': ['寒暄'],
  '和霭': ['和蔼'],
  '弘大': ['宏大'],
  '哄托': ['烘托'],
  '汇考': ['会考'],
  '激流': ['急流'],
  '急流': ['激流'],
  '计画': ['计划'],
  '记念': ['纪念'],
  '家俱': ['家具'],
  '家具': ['家俱'],
  '娇正': ['矫正'],
  '矫正': ['娇正'],
  '结余': ['节余'],
  '节余': ['结余'],
  '精减': ['精简'],
  '精简': ['精减'],
  '警惕': ['警剔'],
  '警剔': ['警惕'],
  '决窍': ['诀窍'],
  '诀窍': ['决窍'],
  '峻工': ['竣工'],
  '竣工': ['峻工'],
  '刻服': ['克服'],
  '克服': ['刻服'],
  '夸台': ['垮台'],
  '垮台': ['夸台'],
  '框子': ['架子'],
  '烂调': ['滥调'],
  '滥调': ['烂调'],
  '烂尾': ['烂尾'],
  '兰色': ['蓝色'],
  '蓝色': ['兰色'],
  '朗颂': ['朗诵'],
  '朗诵': ['朗颂'],
  '利害': ['厉害'],
  '厉害': ['利害'],
  '连络': ['联络'],
  '联络': ['连络'],
  '留传': ['流传'],
  '流传': ['留传'],
  '流窜': ['流串'],
  '流串': ['流窜'],
  '乱蹿': ['乱窜'],
  '乱窜': ['乱蹿'],
  '贸然': ['冒然'],
  '冒然': ['贸然'],
  '迷团': ['谜团'],
  '谜团': ['迷团'],
  '渺小': ['微小'],
  '微小': ['渺小'],
  '磨炼': ['磨练'],
  '磨练': ['磨炼'],
  '凝洁': ['凝结'],
  '凝结': ['凝洁'],
  '徘怀': ['徘徊'],
  '徘徊': ['徘怀'],
  '旁证': ['旁证'],
  '陪养': ['培养'],
  '培养': ['陪养'],
  '品行': ['品性'],
  '品性': ['品行'],
  '启封': ['起封'],
  '起封': ['启封'],
  '气慨': ['气概'],
  '气概': ['气慨'],
  '恰商': ['洽商'],
  '洽商': ['恰商'],
  '歉虚': ['谦虚'],
  '谦虚': ['歉虚'],
  '溶化': ['融化'],
  '融化': ['溶化'],
  '熔化': ['熔化'],
  '丧钟': ['丧钟'],
  '傻呼呼': ['傻乎乎'],
  '傻乎乎': ['傻呼呼'],
  '伸吟': ['呻吟'],
  '呻吟': ['伸吟'],
  '梳妆': ['梳装'],
  '梳装': ['梳妆'],
  '疏浚': ['疏通'],
  '疏通': ['疏浚'],
  '题纲': ['提纲'],
  '提纲': ['题纲'],
  '通俗': ['通俗'],
  '通迅': ['通讯'],
  '通讯': ['通迅'],
  '推祟': ['推崇'],
  '推崇': ['推祟'],
  '拖蹋': ['拖沓'],
  '拖沓': ['拖蹋'],
  '委曲': ['委屈'],
  '委屈': ['委曲'],
  '委靡': ['萎靡'],
  '萎靡': ['委靡'],
  '文彩': ['文采'],
  '文采': ['文彩'],
  '污告': ['诬告'],
  '诬告': ['污告'],
  '无耐': ['无奈'],
  '无奈': ['无耐'],
  '象样': ['像样'],
  '像样': ['象样'],
  '消声匿迹': ['销声匿迹'],
  '销声匿迹': ['消声匿迹'],
  '刑侦': ['刑侦'],
  '形迹': ['行迹'],
  '行迹': ['形迹'],
  '修练': ['修炼'],
  '修炼': ['修练'],
  '压制': ['压制'],
  '眼花瞭乱': ['眼花缭乱'],
  '眼花缭乱': ['眼花瞭乱'],
  '一但': ['一旦'],
  '一旦': ['一但'],
  '一付': ['一副'],
  '一副': ['一付'],
  '引伸': ['引申'],
  '引申': ['引伸'],
  '映证': ['印证'],
  '印证': ['映证'],
  '悠远': ['幽远'],
  '幽远': ['悠远'],
  '予备': ['预备'],
  '预备': ['予备'],
  '原故': ['缘故'],
  '缘故': ['原故'],
  '帐蓬': ['帐篷'],
  '帐篷': ['帐蓬'],
  '帐号': ['账号'],
  '账号': ['帐号'],
  '折皱': ['褶皱'],
  '褶皱': ['折皱'],
  '震憾': ['震撼'],
  '震撼': ['震憾'],
  '争辨': ['争辩'],
  '争辩': ['争辨'],
  '直着': ['执著'],
  '执著': ['直着'],
  '致哀': ['志哀'],
  '志哀': ['致哀'],
  '至于': ['至于'],
  '衷爱': ['钟爱'],
  '钟爱': ['衷爱'],
  '衷心': ['衷心'],
  '妆梳': ['装束'],
  '装束': ['妆梳'],
  '装饰': ['装饰'],
  '妆饰': ['装饰'],
  '坐位': ['座位'],
  '座位': ['坐位'],
  '座标': ['坐标'],
  '坐标': ['座标'],
};

// 成语纠错词典
const IDIOM_DICT: Record<string, string[]> = {
  '穿流不息': ['川流不息'],
  '川流不息': ['穿流不息'],
  '接中迩来': ['接踵而来'],
  '接踵而来': ['接中迩来'],
  '带带相传': ['代代相传'],
  '代代相传': ['带带相传'],
  '相辅相承': ['相辅相成'],
  '相辅相成': ['相辅相承'],
  '按部就班': ['按部就班'],
  '按步就班': ['按部就班'],
  '按部就搬': ['按部就班'],
  '一愁莫展': ['一筹莫展'],
  '一筹莫展': ['一愁莫展'],
  '迫不急待': ['迫不及待'],
  '迫不及待': ['迫不急待'],
  '破釜沈舟': ['破釜沉舟'],
  '破釜沉舟': ['破釜沈舟'],
  '世外桃园': ['世外桃源'],
  '世外桃源': ['世外桃园'],
  '闲情逸志': ['闲情逸致'],
  '闲情逸致': ['闲情逸志'],
  '闲情逸智': ['闲情逸致'],
  '振耳欲聋': ['震耳欲聋'],
  '震耳欲聋': ['振耳欲聋'],
  '名符其实': ['名副其实'],
  '名副其实': ['名符其实'],
  '美仑美奂': ['美轮美奂'],
  '美轮美奂': ['美仑美奂'],
  '相得益章': ['相得益彰'],
  '相得益彰': ['相得益章'],
  '真知灼见': ['真知灼见'],
  '真知卓见': ['真知灼见'],
  '再接再励': ['再接再厉'],
  '再接再厉': ['再接再励'],
  '走头无路': ['走投无路'],
  '走投无路': ['走投无路'],
  '按捺不住': ['按捺不住'],
  '按奈不住': ['按捺不住'],
  '直截了当': ['直截了当'],
  '直接了当': ['直截了当'],
  '饮鸠止渴': ['饮鸩止渴'],
  '饮鸩止渴': ['饮鸠止渴'],
  '出奇致胜': ['出奇制胜'],
  '出奇制胜': ['出奇致胜'],
  '义不容词': ['义不容辞'],
  '义不容辞': ['义不容词'],
  '声名狼籍': ['声名狼藉'],
  '声名狼藉': ['声名狼籍'],
  '精兵减政': ['精兵简政'],
  '精兵简政': ['精兵减政'],
  '默守成规': ['墨守成规'],
  '墨守成规': ['默守成规'],
  '不径而走': ['不胫而走'],
  '不胫而走': ['不径而走'],
  '焕然一新': ['焕然一新'],
  '换然一新': ['焕然一新'],
  '别出新裁': ['别出心裁'],
  '别出心裁': ['别出新裁'],
  '因地制宜': ['因地制宜'],
  '因地治宜': ['因地制宜'],
  '鞠躬尽粹': ['鞠躬尽瘁'],
  '鞠躬尽瘁': ['鞠躬尽粹'],
  '焕然冰释': ['涣然冰释'],
  '涣然冰释': ['焕然冰释'],
  '风糜一时': ['风靡一时'],
  '风靡一时': ['风糜一时'],
  '张皇失措': ['张皇失措'],
  '张慌失措': ['张皇失措'],
  '信口开河': ['信口开河'],
  '信口开合': ['信口开河'],
  '仗义直言': ['仗义执言'],
  '仗义执言': ['仗义直言'],
  '独占鳌头': ['独占鳌头'],
  '独占鳖头': ['独占鳌头'],
  '按图索冀': ['按图索骥'],
  '按图索骥': ['按图索冀'],
  '搬门弄斧': ['班门弄斧'],
  '班门弄斧': ['搬门弄斧'],
  '一张一驰': ['一张一弛'],
  '一张一弛': ['一张一驰'],
  '不可思意': ['不可思议'],
  '不可思议': ['不可思意'],
  '如法泡制': ['如法炮制'],
  '如法炮制': ['如法泡制'],
  '白壁无瑕': ['白璧无瑕'],
  '白璧无瑕': ['白壁无瑕'],
};

// 自定义混淆集（用户可扩展）
let customConfusionDict: Record<string, string[]> = {};

/**
 * 设置自定义混淆集
 */
export function setCustomConfusion(dict: Record<string, string[]>): void {
  customConfusionDict = { ...dict };
}

/**
 * 添加自定义混淆项
 */
export function addCustomConfusion(wrong: string, correct: string): void {
  if (!customConfusionDict[wrong]) {
    customConfusionDict[wrong] = [];
  }
  if (!customConfusionDict[wrong].includes(correct)) {
    customConfusionDict[wrong].push(correct);
  }
}

/**
 * 检测文本中的错误
 */
export function detectErrors(text: string): DetectedError[] {
  const errors: DetectedError[] = [];
  
  // 合并所有词典
  const allDicts = [
    { dict: SOUND_SIMILAR_DICT, type: ErrorType.SOUND_SIMILAR },
    { dict: SHAPE_SIMILAR_DICT, type: ErrorType.SHAPE_SIMILAR },
    { dict: COMMON_ERROR_DICT, type: ErrorType.COMMON_ERROR },
    { dict: IDIOM_DICT, type: ErrorType.COMMON_ERROR },
    { dict: customConfusionDict, type: ErrorType.COMMON_ERROR },
  ];
  
  // 按词典优先级检测
  for (const { dict, type } of allDicts) {
    for (const [wrong, corrections] of Object.entries(dict)) {
      let startIndex = 0;
      while (true) {
        const index = text.indexOf(wrong, startIndex);
        if (index === -1) break;
        
        // 检查是否已被检测为错误
        const isOverlapping = errors.some(
          e => index < e.endPosition && index + wrong.length > e.position
        );
        
        if (!isOverlapping && corrections.length > 0) {
          errors.push({
            error: wrong,
            position: index,
            endPosition: index + wrong.length,
            type,
            suggestions: corrections,
            confidence: 0.9,
          });
        }
        
        startIndex = index + 1;
      }
    }
  }
  
  // 按位置排序
  errors.sort((a, b) => a.position - b.position);
  
  return errors;
}

/**
 * 纠正文本中的错误
 */
export function correctText(
  text: string,
  options: {
    confidenceThreshold?: number;
    maxCorrections?: number;
  } = {}
): CorrectionResult {
  const { confidenceThreshold = 0.5, maxCorrections = 10 } = options;
  
  const errors = detectErrors(text);
  const filteredErrors = errors
    .filter(e => e.confidence >= confidenceThreshold)
    .slice(0, maxCorrections);
  
  let correctedText = text;
  const corrections: CorrectionResult['errors'] = [];
  let offset = 0;
  
  for (const error of filteredErrors) {
    // 选择第一个建议
    const correction = error.suggestions[0];
    if (correction && correction !== error.error) {
      const position = error.position + offset;
      correctedText = 
        correctedText.slice(0, position) + 
        correction + 
        correctedText.slice(position + error.error.length);
      
      corrections.push({
        error: error.error,
        correction,
        position: error.position,
        type: error.type,
      });
      
      offset += correction.length - error.error.length;
    }
  }
  
  return {
    original: text,
    corrected: correctedText,
    errors: corrections,
  };
}

/**
 * 检查"的地得"用法
 */
export function checkDeDiDe(text: string): DetectedError[] {
  const errors: DetectedError[] = [];
  
  // 简化规则：
  // "的" - 用于修饰名词（...的名词）
  // "地" - 用于修饰动词（...地动词）
  // "得" - 用于补语（动词/形容词+得...）
  
  const patterns = [
    // 应该用"地"的情况
    { pattern: /(认真|仔细|努力|认真|悄悄|慢慢|渐渐|飞快|高兴|快乐|伤心|愤怒)(的)([跑走说唱笑哭闹飞游])/g, suggest: '地' },
    // 应该用"得"的情况
    { pattern: /(跑|走|说|唱|笑|哭|闹|飞|游|做|吃|喝)(的)(很|好|快|慢|漂亮|清楚|开心)/g, suggest: '得' },
    // 应该用"的"的情况
    { pattern: /(美丽|漂亮|聪明|善良|勤劳|勇敢|可爱)(地)(人|孩子|姑娘|小伙|东西)/g, suggest: '的' },
  ];
  
  for (const { pattern, suggest } of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const wrongChar = match[2];
      const position = match.index + match[1].length;
      
      if (wrongChar !== suggest) {
        errors.push({
          error: wrongChar,
          position,
          endPosition: position + 1,
          type: ErrorType.GRAMMAR,
          suggestions: [suggest],
          confidence: 0.8,
        });
      }
    }
  }
  
  return errors;
}

/**
 * 检查常见语法问题
 */
export function checkGrammar(text: string): DetectedError[] {
  const errors: DetectedError[] = [];
  
  // 重复词检查
  const repeatPatterns = [
    /的{2,}/g,
    /了{2,}/g,
    /着{2,}/g,
    /过{2,}/g,
    /很{2,}/g,
    /非{2,}常/g,
  ];
  
  for (const pattern of repeatPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      errors.push({
        error: match[0],
        position: match.index,
        endPosition: match.index + match[0].length,
        type: ErrorType.GRAMMAR,
        suggestions: [match[0][0]], // 只保留一个字
        confidence: 0.9,
      });
    }
  }
  
  // 常见搭配错误
  const collocationErrors = [
    { wrong: '大约...左右', pattern: /大约\d+左右/g, fix: (s: string) => s.replace('左右', '') },
    { wrong: '凯旋归来', pattern: /凯旋归来/g, fix: () => '凯旋' },
    { wrong: '人称...为', pattern: /人称([^\s]+)为/g, fix: (s: string) => s.replace('为', '') },
    { wrong: '涉及到', pattern: /涉及到/g, fix: () => '涉及' },
    { wrong: '涉及到', pattern: /涉及到/g, fix: () => '涉及' },
  ];
  
  for (const { wrong, pattern, fix } of collocationErrors) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const fixed = fix(match[0]);
      if (fixed !== match[0]) {
        errors.push({
          error: match[0],
          position: match.index,
          endPosition: match.index + match[0].length,
          type: ErrorType.GRAMMAR,
          suggestions: [fixed],
          confidence: 0.85,
        });
      }
    }
  }
  
  return errors;
}

/**
 * 综合文本检查
 */
export function fullTextCheck(text: string): {
  errors: DetectedError[];
  statistics: {
    totalErrors: number;
    byType: Record<ErrorType, number>;
    confidence: number;
  };
} {
  // 收集所有错误
  const allErrors = [
    ...detectErrors(text),
    ...checkDeDiDe(text),
    ...checkGrammar(text),
  ];
  
  // 去重
  const uniqueErrors: DetectedError[] = [];
  const seen = new Set<string>();
  
  for (const error of allErrors) {
    const key = `${error.position}-${error.error}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueErrors.push(error);
    }
  }
  
  // 按位置排序
  uniqueErrors.sort((a, b) => a.position - b.position);
  
  // 统计
  const byType: Record<ErrorType, number> = {
    [ErrorType.SOUND_SIMILAR]: 0,
    [ErrorType.SHAPE_SIMILAR]: 0,
    [ErrorType.GRAMMAR]: 0,
    [ErrorType.PROPER_NAME]: 0,
    [ErrorType.COMMON_ERROR]: 0,
  };
  
  for (const error of uniqueErrors) {
    byType[error.type]++;
  }
  
  const avgConfidence = uniqueErrors.length > 0
    ? uniqueErrors.reduce((sum, e) => sum + e.confidence, 0) / uniqueErrors.length
    : 1;
  
  return {
    errors: uniqueErrors,
    statistics: {
      totalErrors: uniqueErrors.length,
      byType,
      confidence: avgConfidence,
    },
  };
}

/**
 * 生成纠错报告
 */
export function generateCorrectionReport(
  original: string,
  corrected: string,
  errors: CorrectionResult['errors']
): string {
  if (errors.length === 0) {
    return '✅ 文本检查完成，未发现明显错误。';
  }
  
  let report = `📝 纠错报告\n`;
  report += `━━━━━━━━━━━━━━━━━━━━\n`;
  report += `共发现 ${errors.length} 处错误：\n\n`;
  
  errors.forEach((error, index) => {
    const typeLabel = {
      [ErrorType.SOUND_SIMILAR]: '音似',
      [ErrorType.SHAPE_SIMILAR]: '形似',
      [ErrorType.GRAMMAR]: '语法',
      [ErrorType.PROPER_NAME]: '专名',
      [ErrorType.COMMON_ERROR]: '常见',
    }[error.type];
    
    report += `${index + 1}. [${typeLabel}] "${error.error}" → "${error.correction}"\n`;
    report += `   位置：第 ${error.position + 1} 个字符\n`;
  });
  
  report += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  report += `纠正后文本：\n${corrected}`;
  
  return report;
}

export default {
  detectErrors,
  correctText,
  checkDeDiDe,
  checkGrammar,
  fullTextCheck,
  generateCorrectionReport,
  setCustomConfusion,
  addCustomConfusion,
  ErrorType,
};
