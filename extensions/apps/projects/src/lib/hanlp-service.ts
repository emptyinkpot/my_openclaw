/**
 * ============================================================================
 * HanLP NLP 服务集成
 * ============================================================================
 * 
 * 功能：
 * - 中文分词（精准识别词汇边界）
 * - 词性标注（识别名词、动词、形容词等）
 * - 命名实体识别（识别人名、地名、机构名）
 * - 依存句法分析（分析句子结构）
 * - 语义角色标注（理解句子含义）
 * - 同义词推荐（获取更丰富的同义词）
 * 
 * 文档：https://hanlp.hankcs.com/docs/api.html
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 分词结果 */
export interface HanLPToken {
  word: string;          // 词汇
  pos: string;           // 词性标签
  offset: number;        // 在原文中的偏移量
  length: number;        // 词汇长度
}

/** 命名实体 */
export interface HanLPEntity {
  text: string;          // 实体文本
  type: string;          // 实体类型（NR人名/NS地名/NT机构名等）
  offset: number;        // 偏移量
  length: number;        // 长度
}

/** 依存关系 */
export interface HanLPDependency {
  governor: number;      // 依存词索引
  dependent: number;     // 被依存词索引
  relation: string;      // 关系类型
}

/** 句法分析结果 */
export interface HanLPParseResult {
  tokens: HanLPToken[];          // 分词结果
  entities: HanLPEntity[];       // 命名实体
  dependencies: HanLPDependency[]; // 依存关系
}

/** 同义词结果 */
export interface HanLPSynonym {
  word: string;
  synonyms: string[];
  score: number;  // 相似度分数
}

/** API配置 */
interface HanLPConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
}

// ============================================================================
// HanLP 服务类
// ============================================================================

export class HanLPService {
  private config: HanLPConfig;

  constructor(config?: Partial<HanLPConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || process.env.HANLP_API_URL || 'https://hanlp.hankcs.com/api',
      apiKey: config?.apiKey || process.env.HANLP_API_KEY,
      timeout: config?.timeout || 30000,
    };
  }

  /**
   * 通用请求方法
   */
  private async request<T>(endpoint: string, data: Record<string, unknown>): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HanLP API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 分词 + 词性标注
   * @param text 待分词文本
   * @returns 分词结果
   */
  async tokenize(text: string): Promise<HanLPToken[]> {
    try {
      const result = await this.request<{ tokens: Array<[string, string, number, number]> }>('/parse', {
        text,
        tasks: ['pos'],
      });

      return result.tokens.map(([word, pos, offset, length]) => ({
        word,
        pos,
        offset,
        length,
      }));
    } catch (error) {
      console.error('[HanLP] Tokenize failed:', error);
      // 降级：简单分词
      return this.fallbackTokenize(text);
    }
  }

  /**
   * 命名实体识别
   * @param text 待识别文本
   * @returns 命名实体列表
   */
  async recognizeEntities(text: string): Promise<HanLPEntity[]> {
    try {
      const result = await this.request<{ entities: Array<[string, string, number, number]> }>('/parse', {
        text,
        tasks: ['ner'],
      });

      return result.entities.map(([text, type, offset, length]) => ({
        text,
        type,
        offset,
        length,
      }));
    } catch (error) {
      console.error('[HanLP] NER failed:', error);
      return [];
    }
  }

  /**
   * 完整句法分析
   * @param text 待分析文本
   * @returns 句法分析结果
   */
  async parse(text: string): Promise<HanLPParseResult> {
    try {
      const result = await this.request<{
        tokens: Array<[string, string, number, number]>;
        entities: Array<[string, string, number, number]>;
        dependencies: Array<[number, number, string]>;
      }>('/parse', {
        text,
        tasks: ['pos', 'ner', 'dep'],
      });

      return {
        tokens: result.tokens.map(([word, pos, offset, length]) => ({
          word,
          pos,
          offset,
          length,
        })),
        entities: result.entities.map(([text, type, offset, length]) => ({
          text,
          type,
          offset,
          length,
        })),
        dependencies: result.dependencies.map(([governor, dependent, relation]) => ({
          governor,
          dependent,
          relation,
        })),
      };
    } catch (error) {
      console.error('[HanLP] Parse failed:', error);
      return {
        tokens: this.fallbackTokenize(text),
        entities: [],
        dependencies: [],
      };
    }
  }

  /**
   * 获取同义词
   * @param word 词汇
   * @returns 同义词列表
   */
  async getSynonyms(word: string): Promise<HanLPSynonym[]> {
    try {
      const result = await this.request<{ synonyms: Array<[string, number]> }>('/synonym', {
        word,
      });

      return result.synonyms.map(([synonym, score]) => ({
        word: synonym,
        synonyms: [synonym],
        score,
      }));
    } catch (error) {
      console.error('[HanLP] Synonym failed:', error);
      return [];
    }
  }

  /**
   * 简单分词降级方案
   * 当HanLP不可用时使用
   */
  private fallbackTokenize(text: string): HanLPToken[] {
    // 简单的中文字符分割
    const tokens: HanLPToken[] = [];
    let offset = 0;
    
    // 基于标点和空格分割
    const segments = text.split(/([，。！？、；：""''（）\s]+)/);
    
    for (const seg of segments) {
      if (!seg) continue;
      
      if (/^[，。！？、；：""''（）\s]+$/.test(seg)) {
        // 标点符号
        tokens.push({
          word: seg,
          pos: 'PU',  // 标点
          offset,
          length: seg.length,
        });
      } else if (seg.length > 0) {
        // 文本，假设为名词或动词
        tokens.push({
          word: seg,
          pos: seg.length <= 2 ? 'NN' : 'VV',  // 短词假设名词，长词假设动词
          offset,
          length: seg.length,
        });
      }
      
      offset += seg.length;
    }
    
    return tokens;
  }
}

// ============================================================================
// 便捷方法
// ============================================================================

/** 默认实例 */
let defaultInstance: HanLPService | null = null;

export function getHanLPService(): HanLPService {
  if (!defaultInstance) {
    defaultInstance = new HanLPService();
  }
  return defaultInstance;
}

/**
 * 快速分词
 */
export async function tokenize(text: string): Promise<HanLPToken[]> {
  return getHanLPService().tokenize(text);
}

/**
 * 快速命名实体识别
 */
export async function recognizeEntities(text: string): Promise<HanLPEntity[]> {
  return getHanLPService().recognizeEntities(text);
}

/**
 * 快速获取同义词
 */
export async function getSynonyms(word: string): Promise<HanLPSynonym[]> {
  return getHanLPService().getSynonyms(word);
}

// ============================================================================
// 词性标签映射（中文）
// ============================================================================

export const POS_LABELS: Record<string, string> = {
  // 名词
  'NN': '普通名词',
  'NR': '人名',
  'NS': '地名',
  'NT': '机构名',
  'NZ': '其他专名',
  
  // 动词
  'VV': '普通动词',
  'VC': '系动词',
  'VE': '存在动词',
  'VX': '助动词',
  
  // 形容词
  'JJ': '形容词',
  
  // 副词
  'AD': '副词',
  
  // 代词
  'PN': '代词',
  
  // 数词
  'CD': '基数词',
  'OD': '序数词',
  
  // 量词
  'M': '量词',
  
  // 介词
  'P': '介词',
  
  // 连词
  'CC': '连词',
  'CS': '从属连词',
  
  // 助词
  'DEC': '的/之',
  'DEG': '的/之',
  'DER': '得',
  'DEV': '地',
  'SP': '句末助词',
  
  // 标点
  'PU': '标点',
  
  // 其他
  'IJ': '感叹词',
  'ON': '拟声词',
  'LC': '方位词',
  'DT': '限定词',
};

/**
 * 获取词性标签的中文描述
 */
export function getPOSLabel(pos: string): string {
  return POS_LABELS[pos] || pos;
}
