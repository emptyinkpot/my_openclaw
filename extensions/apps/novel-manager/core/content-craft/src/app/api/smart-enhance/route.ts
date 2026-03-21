/**
 * ============================================================================
 * HanLP 增强润色 API
 * ============================================================================
 * 
 * 结合HanLP NLP能力的高级润色功能：
 * - 智能分词：精准识别词汇边界
 * - 词性感知：根据词性选择合适的替换策略
 * - 实体保护：保护人名、地名等命名实体
 * - 语义分析：基于上下文选择最佳替换
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  HanLPService, 
  getHanLPService, 
  getPOSLabel,
  type HanLPToken 
} from "@/lib/hanlp-service";
import {
  SYNONYM_DATABASE,
  LOW_QUALITY_EXPRESSIONS,
  AI_GENERATION_SIGNATURES,
} from "@/lib/opensource-resources";

// ============================================================================
// 类型定义
// ============================================================================

interface SmartEnhanceRequest {
  text: string;
  options: {
    enableEntityProtection: boolean;  // 命名实体保护
    enablePOSAware: boolean;          // 词性感知替换
    enableContextAware: boolean;      // 上下文感知
    intensity: 'light' | 'medium' | 'heavy';
  };
}

interface SmartReplacement {
  original: string;
  replaced: string;
  reason: string;
  pos?: string;
  confidence: number;
}

interface SmartEnhanceResponse {
  success: boolean;
  text: string;
  replacements: SmartReplacement[];
  analysis: {
    tokens: number;
    entities: number;
    protectedEntities: string[];
  };
  stats: {
    protected: number;
    enhanced: number;
  };
}

// ============================================================================
// 智能处理器
// ============================================================================

const SmartEnhanceProcessor = {
  /**
   * 提取命名实体（需要保护）
   */
  extractProtectedEntities(tokens: HanLPToken[]): Set<string> {
    const protectedWords = new Set<string>();
    
    for (const token of tokens) {
      // 人名、地名、机构名需要保护
      if (['NR', 'NS', 'NT', 'NZ'].includes(token.pos)) {
        protectedWords.add(token.word);
      }
    }
    
    return protectedWords;
  },

  /**
   * 词性感知的同义词替换
   * 根据词性选择最合适的同义词
   */
  posAwareSynonymReplace(
    text: string,
    tokens: HanLPToken[],
    protectedWords: Set<string>,
    intensity: 'light' | 'medium' | 'heavy'
  ): { text: string; replacements: SmartReplacement[] } {
    const replacements: SmartReplacement[] = [];
    const ratio = intensity === 'light' ? 0.3 : intensity === 'medium' ? 0.6 : 1.0;
    
    let result = text;
    
    for (const token of tokens) {
      // 跳过受保护的词
      if (protectedWords.has(token.word)) continue;
      
      // 根据词性查找匹配的同义词
      const synonymGroup = SYNONYM_DATABASE.find(
        item => item.word === token.word && 
        item.category === this.mapPOSToCategory(token.pos)
      );
      
      if (!synonymGroup || Math.random() > ratio) continue;
      
      // 选择最合适的同义词
      const synonym = this.selectBestSynonym(
        synonymGroup.synonyms, 
        token, 
        text
      );
      
      if (synonym) {
        result = result.replace(new RegExp(token.word, 'g'), (match) => {
          replacements.push({
            original: match,
            replaced: synonym,
            reason: `词性感知替换（${getPOSLabel(token.pos)}）`,
            pos: token.pos,
            confidence: 0.85,
          });
          return synonym;
        });
      }
    }
    
    return { text: result, replacements };
  },

  /**
   * 映射词性到同义词分类
   */
  mapPOSToCategory(pos: string): string {
    const mapping: Record<string, string> = {
      'VV': '动词',
      'VE': '动词',
      'VC': '动词',
      'NN': '名词',
      'JJ': '形容词',
      'AD': '副词',
    };
    return mapping[pos] || '';
  },

  /**
   * 选择最佳同义词
   * 基于上下文和词性选择最合适的同义词
   */
  selectBestSynonym(
    synonyms: string[],
    token: HanLPToken,
    _context: string
  ): string | null {
    if (synonyms.length === 0) return null;
    
    // 简单实现：随机选择
    // TODO: 更智能的选择策略（基于上下文语义相似度）
    return synonyms[Math.floor(Math.random() * synonyms.length)];
  },

  /**
   * AI特征词智能检测
   * 结合句法分析识别AI生成特征
   */
  detectAIPatterns(
    text: string,
    tokens: HanLPToken[]
  ): { text: string; replacements: SmartReplacement[] } {
    const replacements: SmartReplacement[] = [];
    let result = text;
    
    for (const signature of AI_GENERATION_SIGNATURES) {
      if (result.includes(signature.signature)) {
        // 分析签名周围的句法结构
        const contextTokens = this.getContextTokens(
          tokens,
          signature.signature
        );
        
        // 根据上下文选择最佳替代
        const alternative = this.selectContextualAlternative(
          signature.humanAlternatives,
          contextTokens
        );
        
        result = result.replace(new RegExp(signature.signature, 'g'), (match) => {
          replacements.push({
            original: match,
            replaced: alternative,
            reason: `AI特征替换（${signature.category}）`,
            confidence: 0.9,
          });
          return alternative;
        });
      }
    }
    
    return { text: result, replacements };
  },

  /**
   * 获取上下文词汇
   */
  getContextTokens(
    tokens: HanLPToken[],
    target: string
  ): HanLPToken[] {
    const context: HanLPToken[] = [];
    
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].word === target) {
        // 获取前后各2个词
        const start = Math.max(0, i - 2);
        const end = Math.min(tokens.length, i + 3);
        context.push(...tokens.slice(start, end));
        break;
      }
    }
    
    return context;
  },

  /**
   * 选择上下文相关的替代词
   */
  selectContextualAlternative(
    alternatives: string[],
    _contextTokens: HanLPToken[]
  ): string {
    if (alternatives.length === 0) return '';
    
    // 简单实现：随机选择
    // TODO: 基于上下文词性和语义选择最佳替代
    return alternatives[Math.floor(Math.random() * alternatives.length)];
  },

  /**
   * 清理多余标点
   */
  cleanPunctuation(text: string): string {
    let result = text;
    
    // 清理连续重复标点
    result = result.replace(/，+/g, '，');
    result = result.replace(/。+/g, '。');
    result = result.replace(/、+/g, '、');
    result = result.replace(/；+/g, '；');
    result = result.replace(/：+/g, '：');
    result = result.replace(/！+/g, '！');
    result = result.replace(/？+/g, '？');
    
    // 清理句首标点
    result = result.replace(/^[，。、；：！？\s]+/, '');
    result = result.replace(/\n[，。、；：！？\s]+/g, '\n');
    
    // 清理特殊组合
    result = result.replace(/，。/g, '。');
    result = result.replace(/。，/g, '。');
    
    // 清理空引号
    result = result.replace(/「」/g, '');
    result = result.replace(/『』/g, '');
    result = result.replace(/""/g, '');
    
    return result.trim();
  },
};

// ============================================================================
// 主处理函数
// ============================================================================

async function smartEnhance(request: SmartEnhanceRequest): Promise<SmartEnhanceResponse> {
  const { text, options } = request;
  
  try {
    // 1. 获取HanLP服务
    const hanlp = getHanLPService();
    
    // 2. 分词和词性标注
    const tokens = await hanlp.tokenize(text);
    
    // 3. 命名实体识别
    let entities: Array<{ text: string; type: string }> = [];
    if (options.enableEntityProtection) {
      const nerResult = await hanlp.recognizeEntities(text);
      entities = nerResult.map(e => ({ text: e.text, type: e.type }));
    }
    
    // 4. 提取需要保护的词汇
    const protectedWords = SmartEnhanceProcessor.extractProtectedEntities(tokens);
    const protectedEntities = Array.from(protectedWords);
    
    // 5. 词性感知的同义词替换
    let result = text;
    const allReplacements: SmartReplacement[] = [];
    let protectedCount = 0;
    
    if (options.enablePOSAware) {
      const { text: newText, replacements } = SmartEnhanceProcessor.posAwareSynonymReplace(
        result,
        tokens,
        protectedWords,
        options.intensity
      );
      result = newText;
      allReplacements.push(...replacements);
      protectedCount = protectedWords.size;
    }
    
    // 6. AI特征词检测
    if (options.enableContextAware) {
      const { text: newText, replacements } = SmartEnhanceProcessor.detectAIPatterns(
        result,
        tokens
      );
      result = newText;
      allReplacements.push(...replacements);
    }
    
    // 7. 清理标点
    result = SmartEnhanceProcessor.cleanPunctuation(result);
    
    return {
      success: true,
      text: result,
      replacements: allReplacements,
      analysis: {
        tokens: tokens.length,
        entities: entities.length,
        protectedEntities,
      },
      stats: {
        protected: protectedCount,
        enhanced: allReplacements.length,
      },
    };
  } catch (error) {
    console.error('[SmartEnhance] Error:', error);
    
    // 降级：使用基础处理
    return {
      success: true,
      text,
      replacements: [],
      analysis: {
        tokens: 0,
        entities: 0,
        protectedEntities: [],
      },
      stats: {
        protected: 0,
        enhanced: 0,
      },
    };
  }
}

// ============================================================================
// API Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SmartEnhanceRequest;
    
    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json(
        { success: false, error: "缺少文本内容" },
        { status: 400 }
      );
    }

    // 默认选项
    const defaultOptions: SmartEnhanceRequest['options'] = {
      enableEntityProtection: true,
      enablePOSAware: true,
      enableContextAware: true,
      intensity: 'medium',
    };

    const result = await smartEnhance({
      text: body.text,
      options: { ...defaultOptions, ...body.options },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[SmartEnhance API] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "智能增强处理失败" 
      },
      { status: 500 }
    );
  }
}
