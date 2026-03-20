/**
 * ============================================================================
 * 禁用/反感词预设数据
 * ============================================================================
 * 基于用户提供的禁用词库整理
 */

/** 禁用词类型 */
export type BannedWordType = 'modern' | 'ai_style' | 'god_view' | 'subjective' | 'lens' | 'format' | 'cheap_metaphor' | 'parentheses';

/** 禁用词分类配置 */
export const BANNED_WORD_CATEGORIES: Record<BannedWordType, {
  name: string;
  description: string;
  color: string;
}> = {
  modern: {
    name: '现代网络/商业词汇',
    description: '现代商业、互联网、游戏术语，破坏历史氛围',
    color: 'bg-red-100 text-red-700 border-red-300',
  },
  ai_style: {
    name: 'AI腔/廉价抒情',
    description: 'AI生成文本常见腔调、空洞词汇、过度修辞',
    color: 'bg-orange-100 text-orange-700 border-orange-300',
  },
  god_view: {
    name: '上帝视角/后见之明',
    description: '预知未来、后见之明的叙述方式',
    color: 'bg-amber-100 text-amber-700 border-amber-300',
  },
  subjective: {
    name: '主观联想句式',
    description: '作者主观介入、强行联想的表达',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  },
  lens: {
    name: '叙事镜头语言',
    description: '影视化的镜头描述，不适合文字叙事',
    color: 'bg-lime-100 text-lime-700 border-lime-300',
  },
  format: {
    name: '行文格式问题',
    description: '破坏文学性的格式化表达',
    color: 'bg-green-100 text-green-700 border-green-300',
  },
  cheap_metaphor: {
    name: '廉价比喻',
    description: '粗俗、不合语境的比喻',
    color: 'bg-teal-100 text-teal-700 border-teal-300',
  },
  parentheses: {
    name: '括号滥用',
    description: '行文中使用括号进行旁白或补充',
    color: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  },
};

/** 禁用词项接口 */
export interface BannedWordItem {
  id: string;
  content: string;
  type: BannedWordType;
  category: string;
  reason: string;
  alternative?: string;
  createdAt: number;
}

/** 预设禁用词数据 */
export const PRESET_BANNED_WORDS: BannedWordItem[] = [
  // ========== 一、现代网络/商业/游戏词汇 ==========
  ...createBannedItems('modern', '现代商业词汇', [
    'CEO', '商业模式', '痛点', '赛道', '赋能', '落地', '打造', '玩家', '架构',
    '解决方案', '代码', '系统', '版本', '互联网思维', '降维打击',
    'KPI', 'ROI', '闭环', '抓手', '沉淀', '链路', '矩阵', '颗粒度',
    '底层逻辑', '顶层设计', '迭代', '复盘', '认知', '心智',
  ]),
  ...createBannedItems('modern', '游戏词汇', [
    '游戏', '副本', '通关', '氪金', '算法', 'APP', 'app',
    'NPC', '升级', '打怪', '刷图', '挂机',
  ]),
  
  // ========== 二、AI腔/廉价抒情/空洞词汇 ==========
  ...createBannedItems('ai_style', 'AI腔', [
    '静默', '冷彻', '凛冽', '肃杀', '优雅地', '教科书式', 'YYDS', '绝绝子',
    '滤镜', '历史滤镜', '时代滤镜', '滤镜下的', '自带滤镜',
  ]),
  ...createBannedItems('ai_style', '廉价抒情', [
    '冷酷', '精密', '精确', '手术刀式', '精准打击', '褶皱', '镜子',
    '提线木偶', '幽灵', '野兽', '野兽的瞳孔', '冰冷的机器',
    '医生', '医生般的', '医生视角', '外科手术般', '外科医生式',
  ]),
  
  // ========== 三、上帝视角/后见之明句式 ==========
  ...createBannedItems('god_view', '后见之明', [
    '后来我们知道', '这注定失败', '可笑的是', '历史证明', '具有讽刺意味的是',
    '命运早已注定', '历史将证明', '后人会记住',
  ]),
  
  // ========== 四、主观联想句式 ==========
  ...createBannedItems('subjective', '主观联想', [
    '让我想起', '这不由得让人联想到', '不禁让人想到', '让人联想到',
    '这让我想到', '不由得想起', '这让人想起',
  ]),
  
  // ========== 五、叙事镜头语言 ==========
  ...createBannedItems('lens', '镜头语言', [
    '镜头缓缓推进', '画面一转', '镜头拉近', '镜头拉远', '画面切换',
    '镜头转向', '特写', '远景', '近景', '蒙太奇',
  ]),
  
  // ========== 六、行文格式 ==========
  ...createBannedItems('format', '格式问题', [
    '分点', '分章节', '列表式', '条目式', '要点如下',
  ]),
  
  // ========== 七、廉价比喻 ==========
  ...createBannedItems('cheap_metaphor', '廉价比喻', [
    '像公司运营一样', '像写代码一样', '像机器一样运转', '像齿轮一样',
    '像一台机器', '如同精密仪器',
    '合同', '合同般', '合同式的', '一纸合同',
    '公司', '公司化', '公司式的', '像公司一样',
    '剧本', '按剧本走', '写好的剧本', '剧本已定',
    '舞台', '历史舞台', '政治舞台', '登上舞台',
    '棋局', '一盘棋', '棋子', '博弈',
  ]),
  
  // ========== 八、括号滥用 ==========
  ...createBannedItems('parentheses', '括号滥用', [
    '（）', '()', '【】', '[]',
  ], '行文中使用括号进行旁白或补充说明'),
];

/** 创建禁用词项 */
function createBannedItems(
  type: BannedWordType,
  category: string,
  words: string[],
  reason?: string
): BannedWordItem[] {
  const now = Date.now();
  const categoryConfig = BANNED_WORD_CATEGORIES[type];
  
  return words.map((word, index) => ({
    id: `banned-${type}-${now}-${index}`,
    content: word,
    type,
    category,
    reason: reason || categoryConfig.description,
    createdAt: now,
  }));
}

/** 获取禁用词统计 */
export function getBannedWordsStats() {
  const stats: Record<string, number> = {};
  PRESET_BANNED_WORDS.forEach(item => {
    stats[item.category] = (stats[item.category] || 0) + 1;
  });
  return stats;
}

/**
 * 自动检测禁用词类型
 * 根据词汇特征自动判断属于哪种禁用词类型
 */
export function autoDetectBannedWordType(word: string): BannedWordType {
  const w = word.toLowerCase().trim();
  
  // 1. 现代网络/商业词汇检测
  const modernPatterns = [
    // 英文商业术语
    /^(ceo|cfo|cto|coo|kpi|roi|okr|pm|hr|pr|bd|qa|ui|ux|app|api|sdk|ai|ml|vr|ar)$/i,
    // 互联网黑话
    /(赋能|落地|闭环|抓手|沉淀|链路|矩阵|颗粒度|底层逻辑|顶层设计|迭代|复盘|认知|心智|赛道|痛点|打法|方法论)/,
    // 商业词汇
    /(商业模式|解决方案|降维打击|互联网思维|用户画像|增长黑客|私域流量|公域流量)/,
    // 游戏词汇
    /^(游戏|副本|通关|氪金|npc|升级|打怪|刷图|挂机|玩家|刷本)$/,
    // 技术词汇
    /(代码|系统|版本|算法|架构|程序|模块|组件|接口|数据|平台)/,
  ];
  
  for (const pattern of modernPatterns) {
    if (pattern.test(w)) return 'modern';
  }
  
  // 2. AI腔/廉价抒情检测
  const aiStylePatterns = [
    /^(静默|冷彻|凛冽|肃杀|冷酷|精密|精确)$/,
    /(优雅地|教科书式|yyds|绝绝子)/,
    /(滤镜|历史滤镜|时代滤镜)/,
    /(提线木偶|幽灵|野兽|野兽的瞳孔)/,
    /(手术刀式|外科手术般|医生般的|冰冷的机器)/,
  ];
  
  for (const pattern of aiStylePatterns) {
    if (pattern.test(w)) return 'ai_style';
  }
  
  // 3. 上帝视角/后见之明检测
  const godViewPatterns = [
    /(后来我们知道|这注定失败|可笑的是|历史证明|具有讽刺意味的是)/,
    /(命运早已注定|历史将证明|后人会记住|早已注定)/,
    /(注定|必然|终究|终将)$/,
  ];
  
  for (const pattern of godViewPatterns) {
    if (pattern.test(w)) return 'god_view';
  }
  
  // 4. 主观联想句式检测
  const subjectivePatterns = [
    /(让我想起|这不由得让人联想到|不禁让人想到|让人联想到)/,
    /(这让我想到|不由得想起|这让人想起|联想到)/,
    /(不由得|不禁|忍不住)/,
  ];
  
  for (const pattern of subjectivePatterns) {
    if (pattern.test(w)) return 'subjective';
  }
  
  // 5. 叙事镜头语言检测
  const lensPatterns = [
    /(镜头|画面|特写|远景|近景|蒙太奇)/,
    /(缓缓推进|一转|拉近|拉远|切换|转向)/,
  ];
  
  for (const pattern of lensPatterns) {
    if (pattern.test(w)) return 'lens';
  }
  
  // 6. 行文格式问题检测
  const formatPatterns = [
    /(分点|分章节|列表式|条目式|要点如下)/,
    /^(一、|二、|三、|四、|五、|1\.|2\.|3\.|4\.|5\.)$/,
  ];
  
  for (const pattern of formatPatterns) {
    if (pattern.test(w)) return 'format';
  }
  
  // 7. 廉价比喻检测
  const cheapMetaphorPatterns = [
    /(像.*一样|如同|好比|仿佛)/,
    /(公司|合同|剧本|舞台|棋局|齿轮|机器)/,
    /(一台|一盘|一纸)/,
  ];
  
  for (const pattern of cheapMetaphorPatterns) {
    if (pattern.test(w)) return 'cheap_metaphor';
  }
  
  // 8. 括号滥用检测
  if (/^[\(\)（）【】\[\]]+$/.test(w)) return 'parentheses';
  
  // 默认返回现代词汇类型
  return 'modern';
}

/** 检查文本中是否包含禁用词 */
export function checkBannedWords(text: string): Array<{ word: string; type: BannedWordType; category: string }> {
  const found: Array<{ word: string; type: BannedWordType; category: string }> = [];
  
  PRESET_BANNED_WORDS.forEach(item => {
    if (text.includes(item.content)) {
      found.push({
        word: item.content,
        type: item.type,
        category: item.category,
      });
    }
  });
  
  return found;
}
