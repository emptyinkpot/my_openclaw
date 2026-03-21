/**
 * ============================================================================
 * 智能禁用词替换系统 - 比喻类型转换引擎
 * ============================================================================
 * 
 * 核心设计理念：
 * 1. 自动识别禁用词的比喻类型（商业/机械/手术/合同/剧本/棋局）
 * 2. 根据转换规则完全改变比喻类型（而非简单替换表述）
 * 3. 根据选择的风格（中国古典典籍/日式汉语/汉字构词法）生成替换词
 * 4. 支持LLM智能生成，确保替换词质量和风格一致性
 * 
 * @author Vibe Coding Expert
 * @version 2.1.0
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 替换风格类型 */
export type ReplacementStyle = 
  | 'classical_chinese'    // 中国古典典籍
  | 'character_morphology' // 汉字构词法
  | 'japanese_chinese'     // 日式汉语
  | 'mixed';               // 混合风格

/** 比喻类型 */
export type MetaphorType = 
  | 'commercial'    // 商业/公司比喻
  | 'mechanical'    // 机械/机器比喻
  | 'medical'       // 手术/医学比喻
  | 'contract'      // 合同/契约比喻
  | 'stage'         // 剧本/舞台比喻
  | 'chess'         // 棋局/博弈比喻
  | 'game'          // 游戏比喻
  | 'tech'          // 科技/代码比喻
  | 'modern_vocab'  // 现代商业词汇
  | 'ai_style'      // AI腔/廉价抒情
  | 'god_view'      // 上帝视角
  | 'subjective'    // 主观联想
  | 'lens'          // 镜头语言
  | 'format'        // 格式问题
  | 'parentheses'   // 括号滥用
  | 'other';        // 其他

/** 替换风格配置 */
export const REPLACEMENT_STYLES: Record<ReplacementStyle, {
  name: string;
  description: string;
  icon: string;
}> = {
  classical_chinese: {
    name: '中国古典典籍',
    description: '从《诗经》《论语》《史记》等典籍中选取古雅词汇',
    icon: '📚',
  },
  character_morphology: {
    name: '汉字构词法',
    description: '根据汉字形声、会意原理生造的词汇',
    icon: '✍️',
  },
  japanese_chinese: {
    name: '日式汉语',
    description: '借用日语中的汉语词汇',
    icon: '🗾',
  },
  mixed: {
    name: '混合风格',
    description: '综合运用多种风格',
    icon: '🔄',
  },
};

// ============================================================================
// 核心数据：比喻类型识别规则
// ============================================================================

/** 比喻类型识别规则 */
const METAPHOR_TYPE_RULES: Record<MetaphorType, {
  keywords: string[];
  patterns: RegExp[];
  targetMetaphor: string;
  targetKeywords: string[];
}> = {
  commercial: {
    keywords: ['公司', '商业', '运营', '模式', '商业模式', '公司化', 'CEO', 'KPI', 'ROI'],
    patterns: [/公司/, /商业/, /运营/, /模式/, /像公司/, /公司式/],
    targetMetaphor: '水文/自然比喻',
    targetKeywords: ['江河', '浪潮', '奔流', '浩荡', '波澜'],
  },
  mechanical: {
    keywords: ['机器', '齿轮', '机械', '精密', '系统化', '机械化'],
    patterns: [/机器/, /齿轮/, /机械/, /像.*运转/, /精密运转/, /系统化/],
    targetMetaphor: '天文/自然比喻',
    targetKeywords: ['日月', '星辰', '乾坤', '造化', '四时'],
  },
  medical: {
    keywords: ['手术', '医生', '外科', '医学', '治疗', '切割', '精准打击'],
    patterns: [/手术/, /医生/, /外科/, /手术刀/, /医学比喻/],
    targetMetaphor: '严谨/审慎比喻',
    targetKeywords: ['审慎', '严谨', '周密', '细致', '缜密'],
  },
  contract: {
    keywords: ['合同', '契约', '约定', '协议'],
    patterns: [/合同/, /契约/, /一纸合同/, /合同式/],
    targetMetaphor: '缘分/命运比喻',
    targetKeywords: ['缘分', '命中注定', '天数'],
  },
  stage: {
    keywords: ['剧本', '舞台', '戏剧', '演员', '角色', '演出'],
    patterns: [/剧本/, /舞台/, /按剧本/, /人生如戏/, /政治舞台/],
    targetMetaphor: '历史/命运比喻',
    targetKeywords: ['命运', '天命', '历史', '天数'],
  },
  chess: {
    keywords: ['棋局', '棋子', '博弈', '落子', '下棋', '一盘棋'],
    patterns: [/棋局/, /棋子/, /博弈/, /落子/, /一盘棋/],
    targetMetaphor: '风云/自然比喻',
    targetKeywords: ['风云', '变幻', '乾坤', '龙争虎斗'],
  },
  game: {
    keywords: ['游戏', '玩家', '副本', '通关', '升级', 'NPC', '氪金', '打怪', '挂机'],
    patterns: [/游戏/, /玩家/, /副本/, /通关/, /升级/, /NPC/, /氪金/],
    targetMetaphor: '博弈/竞技比喻',
    targetKeywords: ['博弈', '竞技', '角力', '争锋'],
  },
  tech: {
    keywords: ['代码', '算法', '程序', 'APP', 'AI', '系统', '版本', '架构'],
    patterns: [/代码/, /算法/, /程序/, /APP/, /AI/, /系统/, /版本/, /架构/],
    targetMetaphor: '著述/典籍比喻',
    targetKeywords: ['著述', '典籍', '文章', '书卷'],
  },
  modern_vocab: {
    keywords: ['赋能', '落地', '闭环', '抓手', '沉淀', '链路', '矩阵', '颗粒度', '痛点', '赛道', '打法', '打造'],
    patterns: [/赋能/, /落地/, /闭环/, /抓手/, /沉淀/, /链路/, /矩阵/, /颗粒度/, /打造/],
    targetMetaphor: '古典表达',
    targetKeywords: ['裨益', '施行', '圆成', '症结'],
  },
  ai_style: {
    keywords: ['静默', '冷彻', '凛冽', '肃杀', '优雅地', '教科书式', 'YYDS', '绝绝子'],
    patterns: [/静默/, /冷彻/, /凛冽/, /肃杀/, /优雅地/, /教科书式/, /YYDS/, /绝绝子/],
    targetMetaphor: '典雅表达',
    targetKeywords: ['沉静', '清冷', '凛然'],
  },
  god_view: {
    keywords: ['后来我们知道', '这注定失败', '可笑的是', '历史证明', '命运早已注定'],
    patterns: [/后来我们知道/, /注定失败/, /可笑的是/, /历史证明/, /命运早已注定/],
    targetMetaphor: '当下视角',
    targetKeywords: ['当时', '彼时', '那时'],
  },
  subjective: {
    keywords: ['让我想起', '这不由得让人联想到', '不禁让人想到', '让人联想到'],
    patterns: [/让我想起/, /不由得让人联想/, /不禁让人想到/, /让人联想到/],
    targetMetaphor: '客观叙述',
    targetKeywords: ['此情此景', '此景'],
  },
  lens: {
    keywords: ['镜头缓缓推进', '画面一转', '镜头拉近', '镜头拉远', '特写', '远景', '蒙太奇'],
    patterns: [/镜头/, /画面/, /特写/, /远景/, /近景/, /蒙太奇/],
    targetMetaphor: '直接叙述',
    targetKeywords: ['但见', '只见', '却见'],
  },
  format: {
    keywords: ['分点', '分章节', '列表式', '条目式', '要点如下'],
    patterns: [/分点/, /分章节/, /列表式/, /条目式/, /要点如下/],
    targetMetaphor: '自然段落',
    targetKeywords: ['分述', '分卷', '逐条'],
  },
  parentheses: {
    keywords: ['（）', '()', '【】', '[]'],
    patterns: [/[\(（【\[]/, /[\)）】\]]/],
    targetMetaphor: '正文表达',
    targetKeywords: [''],
  },
  other: {
    keywords: [],
    patterns: [],
    targetMetaphor: '典雅表达',
    targetKeywords: [''],
  },
};

// ============================================================================
// 统一格式词汇库（禁用词→替换词）
// 格式：key 是 '禁用词→替换词1/替换词2'，value 是空字符串（占位）
// 实际使用时从 key 中解析
// ============================================================================

/** 中国古典典籍风格词汇库 */
const CLASSICAL_REPLACEMENTS: Record<string, string> = {};

// 初始化词汇库
function initReplacements() {
  const classicalData = [
    // ========== 现代商业词汇 → 古典雅表达 ==========
    '赋能→裨益/助益/增益',
    '落地→施行/见行/践行',
    '闭环→圆成/完满/周全',
    '抓手→着力处/入手处/入手',
    '沉淀→积蕴/涵养/积淀',
    '链路→脉络/径路/途径',
    '矩阵→方阵/阵列/布阵',
    '颗粒度→精粗/细致/精微',
    '痛点→症结/关窍/要害',
    '赛道→途径/门径/路数',
    '打法→手段/方法/方略',
    '方法论→法度/法则/章法',
    '迭代→更替/推移/更化',
    '复盘→省察/回顾/反求',
    '认知→见识/识见/眼界',
    '心智→心志/心意/心念',
    '打造→缔造/营建/构建',
    '架构→构架/体制/体系',
    '版本→本子/版本/卷次',
    '底层逻辑→根本道理/本原/根基',
    '顶层设计→统筹规划/总体规划/全盘谋划',
    '商业模式→经营之道/营生之法/生财之道',
    '解决方案→应对之策/解难之方/破局之策',
    '用户→客/主顾/顾客',
    '客户→客/主顾/东家',
    '市场→市井/市面/商市',
    '产品→物/器物/货品',
    '品牌→字号/招牌/名号',
    '营销→经营/营运/经营',
    '推广→推行/宣扬/传播',
    'KPI→考课/考绩/绩效考核',
    'ROI→利得/收益/报偿',
    
    // ========== 科技/互联网词汇 → 著述/典籍表达 ==========
    '代码→代码/符码/文书',
    '算法→算法/算术/运数',
    '程序→程式/规程/章程',
    '系统→体系/系统/体制',
    '平台→台基/基址/基座',
    'APP→应用/器用/器物',
    'AI→智械/人工智能/智识',
    '互联网思维→通达之思/连通之念',
    '降维打击→以高制低/降阶攻伐',
    
    // ========== 游戏词汇 → 博弈/竞技表达 ==========
    '游戏→博弈/游艺/竞技',
    '玩家→弈者/参与者/角力者',
    '副本→副本/别本/副本',
    '通关→过关/过关斩将/通关',
    '升级→进阶/升格/晋升',
    '打怪→猎兽/斩妖/除怪',
    '刷图→巡游/游历/周游',
    '挂机→待机/守候/待时',
    'NPC→非人/偶人/木偶',
    '氪金→纳贡/输财/出资',
    
    // ========== 机械比喻 → 天文/自然比喻 ==========
    '像机器一样运转→如日月轮转/如造化运行',
    '像机器一样→如造化自然/如天地造化',
    '像齿轮一样→如星辰相衔/如星斗相连',
    '像一台机器→如天地造化/如自然之工',
    '如同精密仪器→如造物之工/如天工造物',
    '精密运转→四时有序/四时更替有序',
    '机械化→自然而然/顺其自然',
    '系统化→浑然天成/天成地就',
    
    // ========== 手术比喻 → 严谨/审慎比喻 ==========
    '手术刀式→精准有力/一针见血',
    '像手术刀一样→如利刃出鞘/如快刀斩乱麻',
    '像医生一样→如老吏断案/如行家里手',
    '医生般的→老练的/娴熟的',
    '外科手术般→大刀阔斧/雷厉风行',
    '精确切割→精准分离/细致划分',
    '精准打击→直击要害/精准命中',
    
    // ========== 商业/公司比喻 → 水文/自然比喻 ==========
    '像公司运营一样→如江河奔流不息/如浪潮涌动',
    '像公司一样→如洪流滚滚/如大江奔流',
    '公司化→自然演变/顺势而为',
    '公司运营→天道运行/自然运行',
    '商业模式→水之就下/顺势而就',
    
    // ========== 合同比喻 → 缘分/命运比喻 ==========
    '合同→约定/契约',
    '合同般→如缘分注定/如天数已定',
    '一纸合同→一纸天书/一纸定数',
    '合同式→缘分使然/缘分注定',
    '契约般→如命中注定/如天数已定',
    
    // ========== 剧本/舞台比喻 → 历史/命运比喻 ==========
    '剧本→命运之书/天数之书',
    '按剧本走→顺应天命/听天由命',
    '写好的剧本→命定之数/天数已定',
    '剧本已定→天数已定/命运已定',
    '舞台→天地之间/世间',
    '历史舞台→历史长河/历史洪流',
    '政治舞台→风云际会/风云变幻之地',
    '登上舞台→应运而生/顺势而起',
    '人生如戏→人生如寄/人生如梦',
    
    // ========== 棋局比喻 → 风云/自然比喻 ==========
    '棋局→风云变幻/乾坤之局',
    '一盘棋→天地一局/乾坤一局',
    '棋子→随波逐流/身不由己',
    '博弈→龙争虎斗/角逐争锋',
    '下棋→运筹帷幄/筹划布局',
    '落子→定夺乾坤/一锤定音',
    '被操控→身不由己/不由自主',
    '提线木偶→傀儡之身/受人摆布',
    
    // ========== AI腔/廉价抒情 → 典雅表达 ==========
    '静默→沉静/默然',
    '冷彻→清冷/冷清',
    '凛冽→凛然/凛凛',
    '肃杀→萧杀/肃穆',
    '优雅地→雅致地/典雅地',
    '教科书式→典范/典范式',
    'YYDS→千古绝唱/旷世',
    '绝绝子→绝佳/绝佳之作',
    '冷酷→冷峻/严峻',
    '精密→精微/细致',
    '滤镜→色彩/色调',
    '历史滤镜→历史色彩/时代印记',
    '时代滤镜→时代印记/时代色彩',
    
    // ========== 上帝视角 → 当下视角 ==========
    '后来我们知道→当时/彼时',
    '这注定失败→此事难成/此事不易',
    '可笑的是→令人叹息的是/令人感慨的是',
    '历史证明→史载/史书记载',
    '命运早已注定→天数已定/命定之数',
    '具有讽刺意味的是→令人唏嘘的是',
    '历史将证明→史书将载/后世将记',
    '后人会记住→后世将铭记',
    
    // ========== 主观联想 → 客观叙述 ==========
    '让我想起→此情此景/这一幕',
    '这不由得让人联想到→此情此景/这一幕',
    '不禁让人想到→此情此景令人想到',
    '让人联想到→此情此景/这一场景',
    '这让我想到→此情此景/这一幕',
    '不由得想起→此情此景想起',
    '这让人想起→此情此景/这一幕',
    
    // ========== 镜头语言 → 直接叙述 ==========
    '镜头缓缓推进→但见/只见',
    '画面一转→转瞬/须臾间',
    '镜头拉近→只见/但见',
    '镜头拉远→放眼望去/放眼四顾',
    '镜头转向→转而看向/转头望去',
    '特写→只见/但见',
    '远景→放眼望去/极目远眺',
    '近景→近看/近观',
    '蒙太奇→交替/更迭',
    '画面切换→转瞬/转眼间',
    
    // ========== 格式问题 → 自然段落 ==========
    '分点→分述/逐条',
    '分章节→分卷/分篇',
    '列表式→罗列式/条举',
    '条目式→逐条式/列举',
    '要点如下→主要如下/要点有',
  ];
  
  classicalData.forEach(entry => {
    const [key, value] = entry.split('→');
    if (key && value) {
      CLASSICAL_REPLACEMENTS[key.trim()] = value.trim();
    }
  });
}

/** 日式汉语风格词汇库 */
const JAPANESE_REPLACEMENTS: Record<string, string> = {};

function initJapaneseReplacements() {
  const japaneseData = [
    '赋能→能力付与/付与',
    '落地→定着/落实',
    '闭环→循环/圆环',
    '抓手→取柄/手柄',
    '沉淀→蓄积/积累',
    '链路→连锁/连锁',
    '矩阵→行列/阵列',
    '迭代→反复/反复',
    '认知→认识/认识',
    '心智→气构/心构',
    '精准→精密/精密',
    '专业→专门/专门',
    '优化→最适化/最适化',
    '整合→统合/统合',
    '激活→活性化/活性化',
    '实现→实装/实装',
    '策划→企画/企画',
    '执行→遂行/遂行',
    '监控→监视/监视',
    '反馈→还元/还元',
    '像机器一样运转→自然稼働/自然运转',
    '像齿轮一样→连携/连动',
    '精密运转→精妙运転/精妙运转',
    '手术刀式→精密一撃/精密一击',
    '棋局→盘上宇宙/盘上宇宙',
    '舞台→光之舞台/光的舞台',
    '剧本→运命之书/命运之书',
    '合同→约定/约定',
    '公司→商号/商号',
  ];
  
  japaneseData.forEach(entry => {
    const [key, value] = entry.split('→');
    if (key && value) {
      JAPANESE_REPLACEMENTS[key.trim()] = value.trim();
    }
  });
}

/** 汉字构词法风格词汇库 */
const ETYMOLOGY_REPLACEMENTS: Record<string, string> = {};

function initEtymologyReplacements() {
  const etymologyData = [
    '赋能→裨益/助益',
    '落地→践履/践行',
    '闭环→圆成/周圆',
    '抓手→着力处/入手处',
    '沉淀→涵泳/涵养',
    '链路→脉络/脉络',
    '矩阵→方阵/方阵',
    '颗粒度→精粗/精粗',
    '痛点→症结/症结',
    '赛道→径路/径路',
    '像机器一样运转→如造化运行/造化运行',
    '像齿轮一样→如星斗相连/星斗相连',
    '精密运转→四时更替有序/四时更替',
    '手术刀式→雷霆之势/雷霆之势',
    '棋局→乾坤之局/乾坤之局',
    '棋子→随波之萍/随波之萍',
    '舞台→天地之间/天地之间',
    '剧本→命数之书/命数之书',
    '合同→约定/约定',
    '公司→商号/商号',
    '商业模式→营生之道/营生之道',
    '解决方案→解难之策/解难之策',
    '底层逻辑→根本道理/根本道理',
    '顶层设计→统筹方略/统筹方略',
  ];
  
  etymologyData.forEach(entry => {
    const [key, value] = entry.split('→');
    if (key && value) {
      ETYMOLOGY_REPLACEMENTS[key.trim()] = value.trim();
    }
  });
}

// 初始化所有词汇库
initReplacements();
initJapaneseReplacements();
initEtymologyReplacements();

// ============================================================================
// 核心功能：比喻类型识别器
// ============================================================================

/**
 * 智能识别词汇的比喻类型
 * @param word 待识别的词汇
 * @returns 比喻类型
 */
export function identifyMetaphorType(word: string): MetaphorType {
  // 按优先级顺序检查
  const priorityOrder: MetaphorType[] = [
    'commercial', 'mechanical', 'medical', 'contract', 
    'stage', 'chess', 'game', 'tech',
    'ai_style', 'god_view', 'subjective', 'lens',
    'format', 'parentheses', 'modern_vocab'
  ];
  
  for (const type of priorityOrder) {
    const rules = METAPHOR_TYPE_RULES[type];
    
    // 检查关键词匹配
    for (const keyword of rules.keywords) {
      if (word.includes(keyword)) {
        return type;
      }
    }
    
    // 检查正则模式匹配
    for (const pattern of rules.patterns) {
      if (pattern.test(word)) {
        return type;
      }
    }
  }
  
  return 'other';
}

/**
 * 获取比喻类型转换信息
 * @param type 比喻类型
 * @returns 转换信息
 */
export function getMetaphorConversion(type: MetaphorType): {
  sourceType: string;
  targetType: string;
  targetKeywords: string[];
} {
  const rules = METAPHOR_TYPE_RULES[type];
  return {
    sourceType: type,
    targetType: rules.targetMetaphor,
    targetKeywords: rules.targetKeywords,
  };
}

// ============================================================================
// 核心功能：替换词生成器
// ============================================================================

/**
 * 从词汇库中查找替换词
 * 词汇库格式：key = 禁用词，value = 替换词1/替换词2
 */
function findReplacementFromVocabularies(
  word: string,
  style: ReplacementStyle
): string | null {
  // 根据风格选择词汇库
  const replacements = {
    classical_chinese: CLASSICAL_REPLACEMENTS,
    japanese_chinese: JAPANESE_REPLACEMENTS,
    character_morphology: ETYMOLOGY_REPLACEMENTS,
    mixed: { ...CLASSICAL_REPLACEMENTS, ...JAPANESE_REPLACEMENTS, ...ETYMOLOGY_REPLACEMENTS },
  };
  
  const vocab = replacements[style];
  
  // 直接查找
  const result = vocab[word.trim()];
  if (result) {
    return result;
  }
  
  return null;
}

/**
 * 使用 LLM 智能生成替换词
 */
export async function generateReplacementsWithLLM(
  word: string,
  style: ReplacementStyle,
  metaphorType?: MetaphorType
): Promise<string[]> {
  const type = metaphorType || identifyMetaphorType(word);
  const conversion = getMetaphorConversion(type);
  
  const styleDescriptions: Record<ReplacementStyle, string> = {
    classical_chinese: '中国古典典籍风格，如《诗经》《论语》《史记》中的表达，典雅古朴',
    japanese_chinese: '日式汉语风格，使用日语中的汉语词汇，如"付与"、"活性化"、"遂行"',
    character_morphology: '汉字构词法风格，根据汉字形声、会意原理生造词汇',
    mixed: '混合风格，可综合运用多种风格',
  };
  
  const prompt = `你是一位精通中国古典文学和修辞学的专家。请为以下禁用词生成${styleDescriptions[style]}的替换词。

【禁用词】${word}

【识别的比喻类型】${type}
【必须转换为目标比喻类型】${conversion.targetType}
【目标比喻类型的关键词参考】${conversion.targetKeywords.join('、')}

【核心要求】
1. 替换词必须完全改变比喻类型，不能只是换个类似表达
2. 例如："像机器一样运转"不能替换为"如机器运转"，而应替换为"如日月轮转"
3. 替换词必须符合${styleDescriptions[style]}
4. 提供3个备选替换词，用/分隔

【输出格式】
只输出替换词，格式：替换词1/替换词2/替换词3
不要输出任何解释或分析。`;

  try {
    const response = await fetch('/api/banned-words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generate_with_llm',
        word,
        style,
        metaphorType: type,
      }),
    });
    
    if (!response.ok) {
      console.error('LLM generation failed:', response.statusText);
      return [];
    }
    
    const data = await response.json();
    return data.replacements || [];
  } catch (error) {
    console.error('Error generating replacements with LLM:', error);
    return [];
  }
}

/**
 * 为禁用词生成替换词（主入口）- 同步版本
 * 仅从本地词库查找
 * @param word 禁用词
 * @param style 替换风格
 * @returns 替换词数组
 */
export function generateReplacementsSync(
  word: string,
  style: ReplacementStyle = 'classical_chinese'
): string[] {
  const replacement = findReplacementFromVocabularies(word, style);
  if (!replacement) {
    // 如果没找到，返回目标比喻类型的关键词作为备选
    const type = identifyMetaphorType(word);
    const conversion = getMetaphorConversion(type);
    if (conversion.targetKeywords.length > 0 && conversion.targetKeywords[0]) {
      return [conversion.targetKeywords[0]];
    }
    return [];
  }
  
  // 解析替换词（格式：替换词1/替换词2）
  return replacement.split('/').map(s => s.trim()).filter(s => s);
}

/**
 * 为禁用词生成替换词（异步版本）- 支持 LLM
 */
export async function generateReplacements(
  word: string,
  style: ReplacementStyle = 'classical_chinese'
): Promise<string[]> {
  // 先从本地词库查找
  const localReplacements = generateReplacementsSync(word, style);
  if (localReplacements.length > 0) {
    return localReplacements;
  }
  
  // 使用 LLM 生成
  return generateReplacementsWithLLM(word, style);
}

// ============================================================================
// 批量处理功能
// ============================================================================

/**
 * 批量为禁用词生成替换词
 */
export async function batchGenerateReplacements(
  bannedWords: Array<{ content: string; type?: string; reason?: string }>,
  style: ReplacementStyle = 'classical_chinese'
): Promise<Array<{ content: string; alternative: string; type?: string; reason?: string; metaphorType?: MetaphorType }>> {
  const results = [];
  
  for (const item of bannedWords) {
    const metaphorType = identifyMetaphorType(item.content);
    const replacements = generateReplacementsSync(item.content, style);
    
    results.push({
      ...item,
      alternative: replacements[0] || '',
      metaphorType,
    });
  }
  
  return results;
}

/**
 * 自动补充禁用词的替换词（同步版本，仅本地词库）
 */
export function autoSupplementAlternatives(
  word: string,
  style: ReplacementStyle = 'classical_chinese'
): string {
  const replacements = generateReplacementsSync(word, style);
  return replacements[0] || '';
}

// ============================================================================
// 导出
// ============================================================================

export { 
  CLASSICAL_REPLACEMENTS, 
  JAPANESE_REPLACEMENTS, 
  ETYMOLOGY_REPLACEMENTS,
  METAPHOR_TYPE_RULES,
};
