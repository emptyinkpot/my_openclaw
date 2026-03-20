/**
 * ============================================================================
 * 同义句式映射表
 * ============================================================================
 * 
 * 设计理念：
 * 1. 建立句式骨架到同义变体的映射
 * 2. 支持模糊匹配和语义等价识别
 * 3. 可扩展、可维护的数据结构
 * 
 * 使用场景：
 * - 句子逻辑禁用库的模糊识别
 * - "不仅...而且" 被禁用时，自动识别 "不但……而且"、"不单……也" 等
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 同义映射项 */
export interface SynonymMapping {
  /** 模式ID */
  id: string;
  /** 模式骨架（标准化形式） */
  skeleton: string;
  /** 同义变体列表 */
  variants: string[];
  /** 连接词对（用于检测） */
  connectorPairs: Array<{ first: string; second: string }>;
  /** 语义标签 */
  semanticTag: 'progressive' | 'contrast' | 'causal' | 'summary' | 'emphasis' | 'transition';
  /** 文言替换建议 */
  classicalReplacements: string[];
}

/** 连接词配置 */
export interface ConnectorConfig {
  /** 前连接词 */
  first: string[];
  /** 后连接词 */
  second: string[];
  /** 语义关系 */
  relation: string;
}

// ============================================================================
// 同义句式映射数据
// ============================================================================

/** 进递关系映射 */
export const PROGRESSIVE_MAPPINGS: SynonymMapping[] = [
  {
    id: 'not-only-but-also',
    skeleton: '不仅...而且',
    variants: ['不仅...而且', '不但...而且', '不单...而且', '不光...而且', '不只...而且'],
    connectorPairs: [
      { first: '不仅', second: '而且' },
      { first: '不但', second: '而且' },
      { first: '不单', second: '而且' },
      { first: '不光', second: '而且' },
      { first: '不只', second: '而且' },
      { first: '不仅', second: '还' },
      { first: '不但', second: '还' },
      { first: '不单', second: '也' },
      { first: '不光', second: '还' },
    ],
    semanticTag: 'progressive',
    classicalReplacements: ['既...又...', '非独...亦...', '不特...且...', '非止...抑亦...'],
  },
  {
    id: 'both-and',
    skeleton: '既...又...',
    variants: ['既...又...', '又...又...', '一边...一边...', '一方面...另一方面...'],
    connectorPairs: [
      { first: '既', second: '又' },
      { first: '又', second: '又' },
      { first: '一边', second: '一边' },
      { first: '一方面', second: '另一方面' },
    ],
    semanticTag: 'progressive',
    classicalReplacements: ['兼...并...', '且...且...', '既...复...'],
  },
];

/** 转折关系映射 */
export const CONTRAST_MAPPINGS: SynonymMapping[] = [
  {
    id: 'although-but',
    skeleton: '虽然...但是',
    variants: ['虽然...但是', '尽管...但是', '虽说...可是', '即使...也', '哪怕...也'],
    connectorPairs: [
      { first: '虽然', second: '但是' },
      { first: '尽管', second: '但是' },
      { first: '虽说', second: '可是' },
      { first: '即使', second: '也' },
      { first: '哪怕', second: '也' },
      { first: '固然', second: '但' },
    ],
    semanticTag: 'contrast',
    classicalReplacements: ['虽...然...', '纵...亦...', '即...犹...', '虽...而...'],
  },
  {
    id: 'but-however',
    skeleton: '然而',
    variants: ['然而', '可是', '不过', '却', '但', '可是', '却'],
    connectorPairs: [
      { first: '', second: '然而' },
      { first: '', second: '可是' },
      { first: '', second: '不过' },
    ],
    semanticTag: 'contrast',
    classicalReplacements: ['然', '顾', '惟', '抑', '然而', '反是'],
  },
];

/** 因果关系映射 */
export const CAUSAL_MAPPINGS: SynonymMapping[] = [
  {
    id: 'because-so',
    skeleton: '因为...所以',
    variants: ['因为...所以', '由于...因此', '因...故', '既然...那么'],
    connectorPairs: [
      { first: '因为', second: '所以' },
      { first: '由于', second: '因此' },
      { first: '因', second: '故' },
      { first: '既然', second: '那么' },
    ],
    semanticTag: 'causal',
    classicalReplacements: ['以...故...', '因...遂...', '由...乃...', '盖...是以...'],
  },
  {
    id: 'therefore',
    skeleton: '因此',
    variants: ['因此', '所以', '于是', '故而', '因而', '由此可见'],
    connectorPairs: [
      { first: '', second: '因此' },
      { first: '', second: '所以' },
      { first: '', second: '于是' },
    ],
    semanticTag: 'causal',
    classicalReplacements: ['故', '是以', '由是', '盖', '是以', '用是'],
  },
];

/** 总结关系映射 */
export const SUMMARY_MAPPINGS: SynonymMapping[] = [
  {
    id: 'in-summary',
    skeleton: '总而言之',
    variants: ['总而言之', '综上所述', '概而言之', '简言之', '要而言之', '一言以蔽之'],
    connectorPairs: [
      { first: '', second: '总而言之' },
      { first: '', second: '综上所述' },
      { first: '', second: '概而言之' },
    ],
    semanticTag: 'summary',
    classicalReplacements: ['要之', '总之', '统而言之', '综上观之', '大抵'],
  },
];

/** 强调关系映射 */
export const EMPHASIS_MAPPINGS: SynonymMapping[] = [
  {
    id: 'undeniably',
    skeleton: '不可否认',
    variants: ['不可否认', '毋庸置疑', '毫无疑问', '不容置疑', '确实', '诚然'],
    connectorPairs: [
      { first: '', second: '不可否认' },
      { first: '', second: '毋庸置疑' },
      { first: '', second: '毫无疑问' },
    ],
    semanticTag: 'emphasis',
    classicalReplacements: ['诚', '实', '确', '信', '洵', '良'],
  },
  {
    id: 'must-mention',
    skeleton: '值得注意的是',
    variants: ['值得注意的是', '需要指出的是', '不得不提的是', '值得关注的是', '尤须注意的是'],
    connectorPairs: [
      { first: '', second: '值得注意的是' },
      { first: '', second: '需要指出的是' },
      { first: '', second: '不得不提的是' },
    ],
    semanticTag: 'emphasis',
    classicalReplacements: ['尤宜注意者', '所当留意者', '不可不察者', '须着眼者'],
  },
];

/** 过渡关系映射 */
export const TRANSITION_MAPPINGS: SynonymMapping[] = [
  {
    id: 'in-other-words',
    skeleton: '换句话说',
    variants: ['换句话说', '换言之', '也就是说', '即', '简单来说', '具体而言'],
    connectorPairs: [
      { first: '', second: '换句话说' },
      { first: '', second: '换言之' },
      { first: '', second: '也就是说' },
    ],
    semanticTag: 'transition',
    classicalReplacements: ['易言之', '质言之', '换言之', '即', '盖'],
  },
  {
    id: 'for-example',
    skeleton: '例如',
    variants: ['例如', '比如', '譬如', '诸如', '以...为例', '举个例子'],
    connectorPairs: [
      { first: '', second: '例如' },
      { first: '', second: '比如' },
      { first: '', second: '譬如' },
    ],
    semanticTag: 'transition',
    classicalReplacements: ['如', '若', '譬如', '比方', '设若'],
  },
];

// ============================================================================
// 汇总导出
// ============================================================================

/** 所有同义映射 */
export const ALL_SYNONYM_MAPPINGS: SynonymMapping[] = [
  ...PROGRESSIVE_MAPPINGS,
  ...CONTRAST_MAPPINGS,
  ...CAUSAL_MAPPINGS,
  ...SUMMARY_MAPPINGS,
  ...EMPHASIS_MAPPINGS,
  ...TRANSITION_MAPPINGS,
];

/** 按语义标签分组 */
export const MAPPINGS_BY_TAG = {
  progressive: PROGRESSIVE_MAPPINGS,
  contrast: CONTRAST_MAPPINGS,
  causal: CAUSAL_MAPPINGS,
  summary: SUMMARY_MAPPINGS,
  emphasis: EMPHASIS_MAPPINGS,
  transition: TRANSITION_MAPPINGS,
} as const;

/** 连接词快速查找表 */
export const CONNECTOR_LOOKUP: Map<string, SynonymMapping[]> = (() => {
  const map = new Map<string, SynonymMapping[]>();
  
  ALL_SYNONYM_MAPPINGS.forEach(mapping => {
    // 为每个连接词建立索引
    mapping.connectorPairs.forEach(pair => {
      if (pair.first) {
        const existing = map.get(pair.first) || [];
        if (!existing.includes(mapping)) {
          map.set(pair.first, [...existing, mapping]);
        }
      }
      if (pair.second) {
        const existing = map.get(pair.second) || [];
        if (!existing.includes(mapping)) {
          map.set(pair.second, [...existing, mapping]);
        }
      }
    });
    
    // 也为变体建立索引
    mapping.variants.forEach(variant => {
      const key = variant.replace(/[.。…、]/g, '');
      const existing = map.get(key) || [];
      if (!existing.includes(mapping)) {
        map.set(key, [...existing, mapping]);
      }
    });
  });
  
  return map;
})();

/** 根据文本片段查找可能的同义映射 */
export function findRelatedMappings(text: string): SynonymMapping[] {
  const results: SynonymMapping[] = [];
  const seen = new Set<string>();
  
  // 检查连接词
  CONNECTOR_LOOKUP.forEach((mappings, connector) => {
    if (text.includes(connector)) {
      mappings.forEach(mapping => {
        if (!seen.has(mapping.id)) {
          seen.add(mapping.id);
          results.push(mapping);
        }
      });
    }
  });
  
  return results;
}

/** 检查两个句式是否语义等价 */
export function areSemanticallyEquivalent(pattern1: string, pattern2: string): boolean {
  // 标准化处理
  const normalize = (s: string) => s.replace(/[.。…、，,！!？?\s]/g, '').toLowerCase();
  const n1 = normalize(pattern1);
  const n2 = normalize(pattern2);
  
  // 完全相同
  if (n1 === n2) return true;
  
  // 查找映射
  for (const mapping of ALL_SYNONYM_MAPPINGS) {
    const normalizedVariants = mapping.variants.map(normalize);
    const has1 = normalizedVariants.some(v => n1.includes(v) || v.includes(n1));
    const has2 = normalizedVariants.some(v => n2.includes(v) || v.includes(n2));
    
    if (has1 && has2) return true;
  }
  
  return false;
}

/** 获取句式的文言替换建议 */
export function getClassicalReplacements(pattern: string): string[] {
  const normalized = pattern.replace(/[.。…、，,！!？?\s]/g, '');
  
  for (const mapping of ALL_SYNONYM_MAPPINGS) {
    for (const variant of mapping.variants) {
      const normalizedVariant = variant.replace(/[.。…、，,！!？?\s]/g, '');
      if (normalized.includes(normalizedVariant) || normalizedVariant.includes(normalized)) {
        return mapping.classicalReplacements;
      }
    }
  }
  
  return [];
}
