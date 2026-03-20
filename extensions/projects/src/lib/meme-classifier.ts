/**
 * ============================================================================
 * 梗分类器
 * ============================================================================
 */

import { Laugh, Smile, TrendingUp, Zap, Quote, BookOpen, HelpCircle, Swords, Lightbulb, Drama } from "lucide-react";
import type { MemeCategory } from '@/types';

/** 默认梗分类配置（带使用场景说明） */
export const DEFAULT_MEME_CATEGORIES: MemeCategory[] = [
  {
    id: "satire",
    name: "反讽",
    description: "通过正话反说、错位对比产生讽刺效果",
    usageScenario: "适合用于讽刺某种现象或人物，通过模仿原句风格套用到相反语境，形成强烈反差。如：用伟光正句式描述反派人物、用官方口吻调侃荒谬现象。",
    examples: [
      "那一夜，他思索良久。他想到了千千万万……难道他们牺牲一切就换来这样一个……吗？",
      "建议专家不要建议",
      "小镇做题家表示不服"
    ],
    createdAt: Date.now()
  },
  {
    id: "template",
    name: "模板套句",
    description: "结构固定的万能文案模板，可套用于各种场景",
    usageScenario: "适合需要快速生成固定风格文案的场景。通过替换关键词，将模板应用到不同人物、事件上。常用于反讽或幽默创作。",
    examples: [
      "那一夜，他思索良久。他想到了千千万万……难道他们……吗？他想到了……他们怎么办？他很不甘心，所以他做了一个决定。这件事哪怕……，即使……，他也不惧怕。",
      "我带你们……，现在我又要带你们……了！"
    ],
    createdAt: Date.now()
  },
  {
    id: "humor",
    name: "幽默",
    description: "轻松搞笑的表达，用于活跃气氛",
    usageScenario: "适合需要调节气氛、增添趣味性的场景。通过夸张、反差、谐音等手法制造笑点，让文章更生动有趣。",
    examples: [
      "笑死，根本不慌",
      "绷不住了",
      "这波操作绝了"
    ],
    createdAt: Date.now()
  },
  {
    id: "trending",
    name: "流行语",
    description: "当前热门的网络用语和表达",
    usageScenario: "适合需要贴近年轻读者、增加时代感的场景。流行语能让文章更接地气，但需注意时效性和使用场合。",
    examples: [
      "yyds（永远的神）",
      "绝绝子",
      "栓Q了"
    ],
    createdAt: Date.now()
  },
  {
    id: "classic",
    name: "经典台词",
    description: "影视作品中的经典对白和名场面",
    usageScenario: "适合需要借用经典作品情感色彩的场景。通过引用知名台词，唤起读者的集体记忆，增加共鸣。",
    examples: [
      "我不要你觉得，我要我觉得",
      "这瓜保熟吗",
      "还有谁！"
    ],
    createdAt: Date.now()
  },
  {
    id: "literature",
    name: "文学引用",
    description: "经典文学作品的引用和化用",
    usageScenario: "适合需要提升文章格调、增加文学色彩的场景。恰当的文学引用能让表达更有深度，但需避免生硬。",
    examples: [
      "正如鲁迅所言：……",
      "生活不止眼前的苟且，还有诗和远方"
    ],
    createdAt: Date.now()
  },
  {
    id: "history-meme",
    name: "历史梗",
    description: "与历史人物、事件相关的梗",
    usageScenario: "适合历史题材文章或需要借古讽今的场景。通过现代语境解构历史，产生趣味或讽刺效果。",
    examples: [
      "朕知道了",
      "臣妾做不到啊",
      "何不食肉糜"
    ],
    createdAt: Date.now()
  },
  {
    id: "other",
    name: "其他",
    description: "未分类的梗资源",
    usageScenario: "暂无明确分类的梗资源。",
    examples: [],
    createdAt: Date.now()
  }
];

/** 梗分类规则配置（用于自动识别） */
export const MEME_CATEGORY_RULES: Record<string, {
  name: string;
  icon: typeof Laugh;
  color: string;
  keywords: string[];
  patterns: RegExp[];
}> = {
  // 反讽类
  satire: {
    name: "反讽",
    icon: Swords,
    color: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300",
    keywords: ["就这", "不会吧", "建议专家", "小镇做题家", "摆烂", "躺平", "内卷", "卷王", "卷死", "笑死", "绷不住", "急了", "破防", "真的假的", "你也配", "我直呼"],
    patterns: [
      /就这[？?啊呀]?$/,
      /不会吧[，,。！!？?]/,
      /我[直只]呼/,
      /你[也己]配/,
      /急[了啦]/,
      /破防[了啦]/,
      /笑死[，,。！!]?/,
      /绷不[住主]/,
      /那一夜.*思索良久/,
    ],
  },

  // 模板套句类
  template: {
    name: "模板套句",
    icon: Lightbulb,
    color: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300",
    keywords: ["那一夜", "思索良久", "想到了", "难道", "怎么办", "不甘心", "做了一个决定"],
    patterns: [
      /那一夜.*思索良久/,
      /想到了千千万万/,
      /他很不甘心.*做了一个决定/,
      /我带你们.*现在我又要带你们/,
    ],
  },

  // 幽默类
  humor: {
    name: "幽默",
    icon: Smile,
    color: "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300",
    keywords: ["哈哈", "笑", "哈哈哈", "笑死", "绝了", "牛逼", "牛逼克拉斯", "厉害", "牛逼哄哄", "牛逼plus", "笑嘻了", "笑拉了", "搞笑", "段子", "包袱"],
    patterns: [
      /哈{3,}/,
      /笑[死拉嘻]/,
      /绝了/,
      /牛逼/,
      /牛[波逼]/,
    ],
  },

  // 流行语类
  trending: {
    name: "流行语",
    icon: TrendingUp,
    color: "bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-900/30 dark:text-pink-300",
    keywords: ["yyds", "绝绝子", "无语子", "裂开", "社死", "emo", "破大防", "纯纯", "就是说", "咱就是说", "家人们", "集美们", "u1s1", "有一说一", "真的会谢", "栓Q", "听我说谢谢你", "芭比Q", "摆烂", "躺平"],
    patterns: [
      /yyds/i,
      /绝绝子/,
      /无语子/,
      /裂开/,
      /社死/,
      /emo/i,
      /破[大]防/,
      /纯纯/,
      /就是说/,
      /u1s1/i,
      /栓Q/i,
      /芭比Q/i,
    ],
  },

  // 经典台词类
  classic: {
    name: "经典台词",
    icon: Quote,
    color: "bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-300",
    keywords: ["我不要你觉得", "我要我觉得", "听我的", "雨女无瓜", "好嗨哟", "人生巅峰", "真香定律", "还有谁", "我要打十个", "这就触及到我的知识盲区了", "这瓜保熟吗", "你这瓜保熟吗", "我要我觉得，不要你觉得"],
    patterns: [
      /我不要你觉得/,
      /我要我觉得/,
      /听我的/,
      /雨女无瓜/,
      /好嗨哟/,
      /人生巅峰/,
      /真香定律/,
      /还有谁/,
      /我要打十个/,
      /知识盲区/,
      /瓜保熟/,
    ],
  },

  // 文学引用类
  literature: {
    name: "文学引用",
    icon: BookOpen,
    color: "bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900/30 dark:text-teal-300",
    keywords: ["正如", "鲁迅说", "村上春树", "村上说", "张爱玲", "王小波", "钱钟书", "围城", "百年孤独", "马尔克斯", "人间失格", "太宰治", "人间不值得", "生活不止眼前的苟且", "诗和远方", "面朝大海", "春暖花开"],
    patterns: [
      /正如.*所言/,
      /鲁迅说/,
      /村上[春树]*/,
      /张爱玲/,
      /王小波/,
      /钱钟书/,
      /围城/,
      /百年孤独/,
      /马尔克斯/,
      /人间失格/,
      /太宰治/,
      /人间不值得/,
      /诗和远方/,
      /面朝大海/,
      /春暖花开/,
    ],
  },

  // 历史梗类
  "history-meme": {
    name: "历史梗",
    icon: Drama,
    color: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300",
    keywords: ["朕", "臣妾", "爱卿", "何不食肉糜", "朕知道了", "臣妾做不到", "陛下", "皇上", "圣上"],
    patterns: [
      /朕[知道说]/,
      /臣妾[做不到]/,
      /何不食肉糜/,
      /朕.*了/,
    ],
  },
};

/** 自动识别梗分类 */
export function autoDetectMemeCategory(content: string): string {
  const lowerContent = content.toLowerCase();
  
  for (const [categoryId, config] of Object.entries(MEME_CATEGORY_RULES)) {
    // 检查关键词
    for (const keyword of config.keywords) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        return config.name;
      }
    }
    // 检查正则模式
    for (const pattern of config.patterns) {
      if (pattern.test(content)) {
        return config.name;
      }
    }
  }
  
  return "其他";
}

/** 获取梗分类图标 */
export function getMemeCategoryIcon(category: string): typeof Laugh {
  const config = Object.values(MEME_CATEGORY_RULES).find(c => c.name === category);
  return config?.icon || HelpCircle;
}

/** 获取梗分类颜色 */
export function getMemeCategoryColor(category: string): string {
  const config = Object.values(MEME_CATEGORY_RULES).find(c => c.name === category);
  return config?.color || "bg-slate-100 text-slate-700 border-slate-300";
}

/** 根据分类名称获取分类ID */
export function getMemeCategoryIdByName(name: string): string {
  const entry = Object.entries(MEME_CATEGORY_RULES).find(([_, config]) => config.name === name);
  return entry ? entry[0] : "other";
}

/** ============================================================================
 * 用户自定义分类管理
 * ============================================================================
 */

const STORAGE_KEY = "meme-categories";

/** 获取梗分类列表（优先从localStorage读取用户自定义分类） */
export function getMemeCategories(): MemeCategory[] {
  // 服务端渲染时返回默认分类
  if (typeof window === 'undefined') {
    return DEFAULT_MEME_CATEGORIES;
  }
  
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as MemeCategory[];
      // 确保至少有默认分类
      if (parsed && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // 解析失败时返回默认分类
    }
  }
  return DEFAULT_MEME_CATEGORIES;
}

/** 保存梗分类列表 */
export function saveMemeCategories(categories: MemeCategory[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
}

/** 获取分类选项列表（用于下拉选择） */
export function getCategoryOptions(): { value: string; label: string }[] {
  const categories = getMemeCategories();
  return categories.map(c => ({
    value: c.name,
    label: c.name
  }));
}
