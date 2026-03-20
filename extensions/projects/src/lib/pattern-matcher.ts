/**
 * ============================================================================
 * 模糊模式匹配器
 * ============================================================================
 * 
 * 设计理念：
 * 1. 支持模糊识别句子逻辑禁用库中的变体
 * 2. 结合同义映射表进行语义等价匹配
 * 3. 支持正则表达式和自然语言模式
 * 4. 高效的匹配算法
 * 
 * 使用场景：
 * - "不仅...而且" 被禁用 → 自动识别 "不但……而且"、"不单……也"
 * - 支持用户自定义禁用模式的智能扩展
 */

import {
  ALL_SYNONYM_MAPPINGS,
  CONNECTOR_LOOKUP,
  type SynonymMapping,
} from './synonym-mappings';

// ============================================================================
// 类型定义
// ============================================================================

/** 匹配结果 */
export interface PatternMatch {
  /** 匹配到的文本 */
  matched: string;
  /** 在原文中的起始位置 */
  start: number;
  /** 在原文中的结束位置 */
  end: number;
  /** 对应的禁用模式ID */
  patternId: string;
  /** 置信度 (0-1) */
  confidence: number;
  /** 匹配类型 */
  matchType: 'exact' | 'variant' | 'semantic' | 'fuzzy';
  /** 相关的同义映射（如果有） */
  synonymMapping?: SynonymMapping;
}

/** 禁用模式配置 */
export interface BannedPattern {
  id: string;
  content: string;
  replacements: string[];
  reason: string;
}

/** 扩展后的禁用模式（包含识别到的变体） */
export interface ExpandedPattern extends BannedPattern {
  /** 识别到的变体 */
  detectedVariants: string[];
  /** 相关的同义映射 */
  relatedMappings: SynonymMapping[];
  /** 正则表达式（用于匹配） */
  regex?: RegExp;
}

// ============================================================================
// 核心匹配器
// ============================================================================

/**
 * 模糊模式匹配器类
 */
export const PatternMatcher = {
  /**
   * 扩展禁用模式，添加语义等价变体
   */
  expandPattern(pattern: BannedPattern): ExpandedPattern {
    const content = pattern.content;
    const detectedVariants: string[] = [content];
    const relatedMappings: SynonymMapping[] = [];
    
    // 1. 检查是否有同义映射
    const normalizedContent = content.replace(/[.。…、，,！!？?\s]/g, '');
    
    for (const mapping of ALL_SYNONYM_MAPPINGS) {
      // 检查是否匹配某个变体
      for (const variant of mapping.variants) {
        const normalizedVariant = variant.replace(/[.。…、，,！!？?\s]/g, '');
        
        if (normalizedContent.includes(normalizedVariant) || normalizedVariant.includes(normalizedContent)) {
          // 添加所有同义变体
          mapping.variants.forEach(v => {
            if (!detectedVariants.includes(v)) {
              detectedVariants.push(v);
            }
          });
          
          // 添加文言替换建议
          mapping.classicalReplacements.forEach(r => {
            if (!pattern.replacements.includes(r)) {
              // 动态添加文言替换建议
            }
          });
          
          if (!relatedMappings.includes(mapping)) {
            relatedMappings.push(mapping);
          }
          break;
        }
      }
    }
    
    // 2. 检查连接词
    CONNECTOR_LOOKUP.forEach((mappings, connector) => {
      if (content.includes(connector)) {
        mappings.forEach(mapping => {
          if (!relatedMappings.includes(mapping)) {
            relatedMappings.push(mapping);
            // 添加变体
            mapping.variants.forEach(v => {
              if (!detectedVariants.includes(v)) {
                detectedVariants.push(v);
              }
            });
          }
        });
      }
    });
    
    // 3. 生成正则表达式
    const regex = buildPatternRegex(detectedVariants);
    
    return {
      ...pattern,
      detectedVariants,
      relatedMappings,
      regex,
    };
  },

  /**
   * 在文本中查找所有匹配
   */
  findMatches(text: string, patterns: BannedPattern[]): PatternMatch[] {
    const matches: PatternMatch[] = [];
    const expandedPatterns = patterns.map(p => this.expandPattern(p));
    
    for (const pattern of expandedPatterns) {
      // 精确匹配
      const exactMatches = this.findExactMatches(text, pattern);
      matches.push(...exactMatches);
      
      // 变体匹配
      const variantMatches = this.findVariantMatches(text, pattern);
      matches.push(...variantMatches);
      
      // 模糊匹配（使用正则）
      if (pattern.regex) {
        const fuzzyMatches = this.findFuzzyMatches(text, pattern);
        matches.push(...fuzzyMatches);
      }
    }
    
    // 去重并按位置排序
    return deduplicateMatches(matches);
  },

  /**
   * 精确匹配
   */
  findExactMatches(text: string, pattern: ExpandedPattern): PatternMatch[] {
    const matches: PatternMatch[] = [];
    let start = 0;
    
    while (true) {
      const index = text.indexOf(pattern.content, start);
      if (index === -1) break;
      
      matches.push({
        matched: pattern.content,
        start: index,
        end: index + pattern.content.length,
        patternId: pattern.id,
        confidence: 1.0,
        matchType: 'exact',
      });
      
      start = index + 1;
    }
    
    return matches;
  },

  /**
   * 变体匹配
   */
  findVariantMatches(text: string, pattern: ExpandedPattern): PatternMatch[] {
    const matches: PatternMatch[] = [];
    
    for (const variant of pattern.detectedVariants) {
      if (variant === pattern.content) continue; // 跳过精确匹配
      
      let start = 0;
      while (true) {
        const index = text.indexOf(variant, start);
        if (index === -1) break;
        
        // 检查是否已被精确匹配覆盖
        const isCovered = matches.some(m => 
          m.matchType === 'exact' && 
          m.start <= index && 
          m.end >= index + variant.length
        );
        
        if (!isCovered) {
          matches.push({
            matched: variant,
            start: index,
            end: index + variant.length,
            patternId: pattern.id,
            confidence: 0.85,
            matchType: 'variant',
            synonymMapping: pattern.relatedMappings.find(m => m.variants.includes(variant)),
          });
        }
        
        start = index + 1;
      }
    }
    
    return matches;
  },

  /**
   * 模糊匹配（使用正则）
   */
  findFuzzyMatches(text: string, pattern: ExpandedPattern): PatternMatch[] {
    const matches: PatternMatch[] = [];
    
    if (!pattern.regex) return matches;
    
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags + 'g');
    let match: RegExpExecArray | null;
    
    while ((match = regex.exec(text)) !== null) {
      // 检查是否已被其他匹配覆盖
      const isCovered = matches.some(m => 
        m.start <= match!.index && m.end >= match!.index + match![0].length
      );
      
      if (!isCovered) {
        matches.push({
          matched: match[0],
          start: match.index,
          end: match.index + match[0].length,
          patternId: pattern.id,
          confidence: 0.7,
          matchType: 'fuzzy',
        });
      }
    }
    
    return matches;
  },

  /**
   * 智能检测文本中的所有问题句式
   */
  detectProblematicPatterns(text: string, patterns: BannedPattern[]): {
    matches: PatternMatch[];
    summary: { total: number; byType: Record<string, number> };
  } {
    const matches = this.findMatches(text, patterns);
    
    const byType: Record<string, number> = {};
    matches.forEach(m => {
      byType[m.matchType] = (byType[m.matchType] || 0) + 1;
    });
    
    return {
      matches,
      summary: {
        total: matches.length,
        byType,
      },
    };
  },
};

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 构建模式正则表达式
 */
function buildPatternRegex(variants: string[]): RegExp | undefined {
  if (variants.length === 0) return undefined;
  
  // 将变体转换为正则表达式
  const patterns = variants.map(v => {
    // 处理省略号和通配符
    return v
      .replace(/[.。…]+/g, '.*?')  // 省略号 → 任意字符（非贪婪）
      .replace(/[?？]/g, '.')       // 问号 → 任意单字符
      .replace(/[*＊]/g, '.*?')     // 星号 → 任意字符（非贪婪）
      .replace(/[()\[\]{}]/g, '\\$&'); // 转义特殊字符
  });
  
  // 组合成一个正则表达式
  const combined = patterns.join('|');
  
  try {
    return new RegExp(combined, 'g');
  } catch {
    return undefined;
  }
}

/**
 * 去重匹配结果
 */
function deduplicateMatches(matches: PatternMatch[]): PatternMatch[] {
  // 按起始位置和置信度排序
  const sorted = [...matches].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return b.confidence - a.confidence;
  });
  
  const result: PatternMatch[] = [];
  
  for (const match of sorted) {
    // 检查是否与已有结果重叠
    const overlaps = result.some(m => 
      (match.start >= m.start && match.start < m.end) ||
      (match.end > m.start && match.end <= m.end) ||
      (match.start <= m.start && match.end >= m.end)
    );
    
    if (!overlaps) {
      result.push(match);
    }
  }
  
  return result;
}

// ============================================================================
// 连接词智能识别
// ============================================================================

/**
 * 识别文本中的连接词对
 */
export function detectConnectorPairs(text: string): Array<{
  first: string;
  second: string;
  mapping: SynonymMapping;
  position: { firstStart: number; secondStart: number };
}> {
  const results: Array<{
    first: string;
    second: string;
    mapping: SynonymMapping;
    position: { firstStart: number; secondStart: number };
  }> = [];
  
  for (const mapping of ALL_SYNONYM_MAPPINGS) {
    for (const pair of mapping.connectorPairs) {
      if (!pair.first || !pair.second) continue;
      
      let firstStart = 0;
      while (true) {
        const firstIndex = text.indexOf(pair.first, firstStart);
        if (firstIndex === -1) break;
        
        // 在第一个连接词之后查找第二个
        const secondStart = firstIndex + pair.first.length;
        const secondIndex = text.indexOf(pair.second, secondStart);
        
        if (secondIndex !== -1) {
          // 检查两个连接词之间的距离是否合理（不超过100字符）
          if (secondIndex - firstIndex <= 100) {
            results.push({
              first: pair.first,
              second: pair.second,
              mapping,
              position: {
                firstStart: firstIndex,
                secondStart: secondIndex,
              },
            });
          }
        }
        
        firstStart = firstIndex + 1;
      }
    }
  }
  
  return results;
}

/**
 * 检查禁用模式是否应该匹配文本中的特定片段
 */
export function shouldMatchAsVariant(
  bannedContent: string,
  textFragment: string
): { shouldMatch: boolean; confidence: number; reason: string } {
  // 标准化比较
  const normalize = (s: string) => s.replace(/[.。…、，,！!？?\s]/g, '').toLowerCase();
  const normalizedBanned = normalize(bannedContent);
  const normalizedFragment = normalize(textFragment);
  
  // 完全相同
  if (normalizedBanned === normalizedFragment) {
    return { shouldMatch: true, confidence: 1.0, reason: '完全匹配' };
  }
  
  // 检查同义映射
  for (const mapping of ALL_SYNONYM_MAPPINGS) {
    const bannedInMapping = mapping.variants.some(v => 
      normalizedBanned.includes(normalize(v)) || normalize(v).includes(normalizedBanned)
    );
    const fragmentInMapping = mapping.variants.some(v => 
      normalizedFragment.includes(normalize(v)) || normalize(v).includes(normalizedFragment)
    );
    
    if (bannedInMapping && fragmentInMapping) {
      return {
        shouldMatch: true,
        confidence: 0.85,
        reason: `语义等价（同属 "${mapping.skeleton}" 变体）`,
      };
    }
  }
  
  // 检查连接词相似性
  const bannedConnectors = extractConnectors(bannedContent);
  const fragmentConnectors = extractConnectors(textFragment);
  
  if (bannedConnectors.length > 0 && fragmentConnectors.length > 0) {
    const sharedConnectors = bannedConnectors.filter(c => fragmentConnectors.includes(c));
    if (sharedConnectors.length > 0) {
      return {
        shouldMatch: true,
        confidence: 0.7,
        reason: `共享连接词: ${sharedConnectors.join(', ')}`,
      };
    }
  }
  
  return { shouldMatch: false, confidence: 0, reason: '不匹配' };
}

/**
 * 提取文本中的连接词
 */
function extractConnectors(text: string): string[] {
  const connectors: string[] = [];
  
  for (const mapping of ALL_SYNONYM_MAPPINGS) {
    for (const pair of mapping.connectorPairs) {
      if (pair.first && text.includes(pair.first)) {
        connectors.push(pair.first);
      }
      if (pair.second && text.includes(pair.second)) {
        connectors.push(pair.second);
      }
    }
  }
  
  return [...new Set(connectors)];
}
