/**
 * 润色特征检测器
 * 动态感知润色网站的配置和规则
 */

export interface PolishFeatures {
  disableMarkdown: boolean;
  useJapanesePunctuation: boolean;
  disableParentheses: boolean;
  styleMode: 'classical' | 'modern' | 'mixed';
  perspectiveMode: 'first-person' | 'third-person-limited' | 'third-person-omniscient';
  _raw?: any;
}

export interface ValidationRules {
  forbiddenFormats: Array<{
    pattern: RegExp;
    type: string;
    severity: 'error' | 'warning';
  }>;
  convertFormats: Array<{
    pattern: RegExp;
    to: string;
    type: string;
    condition?: (match: string) => boolean;
  }>;
  allowedSymbols: string[];
}

export interface DetectorOptions {
  polishSiteUrl?: string;
  cacheTimeout?: number;
}

export class PolishFeatureDetector {
  private options: Required<DetectorOptions>;
  private cache: {
    features: PolishFeatures | null;
    timestamp: number;
  };
  
  private readonly defaultFeatures: PolishFeatures = {
    disableMarkdown: true,
    useJapanesePunctuation: true,
    disableParentheses: true,
    styleMode: 'classical',
    perspectiveMode: 'first-person',
  };
  
  private readonly featureMapping: Record<string, keyof PolishFeatures> = {
    '禁用Markdown语法': 'disableMarkdown',
    '禁用 Markdown': 'disableMarkdown',
    'Markdown': 'disableMarkdown',
    '日文标点': 'useJapanesePunctuation',
    '使用日文标点': 'useJapanesePunctuation',
    '禁用小括号': 'disableParentheses',
    '小括号': 'disableParentheses',
    '文言风格': 'styleMode',
    '白话': 'styleMode',
    '半文半白': 'styleMode',
    '第一人称沉浸': 'perspectiveMode',
    '有限上帝视角': 'perspectiveMode',
    '全知上帝视角': 'perspectiveMode',
  };
  
  constructor(options: DetectorOptions = {}) {
    this.options = {
      polishSiteUrl: options.polishSiteUrl || 'https://7d4jcknzqk.coze.site',
      cacheTimeout: options.cacheTimeout || 60000,
    };
    
    this.cache = {
      features: null,
      timestamp: 0,
    };
  }
  
  setFeatures(features: Partial<PolishFeatures>): PolishFeatures {
    const merged = { ...this.defaultFeatures, ...features };
    this.cache = {
      features: merged,
      timestamp: Date.now(),
    };
    return merged;
  }
  
  getFeatures(): PolishFeatures {
    if (this.cache.features && Date.now() - this.cache.timestamp < this.options.cacheTimeout) {
      return this.cache.features;
    }
    return { ...this.defaultFeatures };
  }
  
  detectFromContent(content: string): PolishFeatures {
    const rawFeatures: any = {
      _foundKeywords: [],
    };
    
    const keywords = [
      '禁用Markdown语法', '日文标点', '小括号',
      '文言风格', '白话', '半文半白',
      '第一人称沉浸', '有限上帝视角', '全知上帝视角',
    ];
    
    for (const keyword of keywords) {
      if (content.includes(keyword)) {
        rawFeatures._foundKeywords.push(keyword);
      }
    }
    
    const features = this.parseFeatures(rawFeatures);
    
    this.cache = {
      features,
      timestamp: Date.now(),
    };
    
    return features;
  }
  
  private parseFeatures(rawFeatures: any): PolishFeatures {
    const result: PolishFeatures = { ...this.defaultFeatures };
    
    if (rawFeatures._foundKeywords) {
      for (const keyword of rawFeatures._foundKeywords) {
        const mapped = this.featureMapping[keyword];
        if (mapped) {
          if (mapped === 'styleMode') {
            if (keyword.includes('文言')) result.styleMode = 'classical';
            else if (keyword.includes('白话')) result.styleMode = 'modern';
            else if (keyword.includes('半文半白')) result.styleMode = 'mixed';
          } else if (mapped === 'perspectiveMode') {
            if (keyword.includes('第一人称')) result.perspectiveMode = 'first-person';
            else if (keyword.includes('有限上帝')) result.perspectiveMode = 'third-person-limited';
            else if (keyword.includes('全知上帝')) result.perspectiveMode = 'third-person-omniscient';
          } else {
            (result as any)[mapped] = true;
          }
        }
      }
    }
    
    result._raw = rawFeatures;
    
    return result;
  }
  
  generateValidationRules(features: PolishFeatures): ValidationRules {
    const rules: ValidationRules = {
      forbiddenFormats: [],
      convertFormats: [],
      allowedSymbols: [],
    };
    
    if (features.disableMarkdown) {
      rules.forbiddenFormats.push(
        { pattern: /^#{1,6}\s+.+$/gm, type: 'markdown-header', severity: 'error' },
        { pattern: /\*\*[^*]+\*\*/g, type: 'markdown-bold', severity: 'warning' },
        { pattern: /\*[^*]+\*/g, type: 'markdown-italic', severity: 'warning' },
        { pattern: /^[-*+]\s+.+$/gm, type: 'markdown-list', severity: 'error' },
        { pattern: /^```[\s\S]*?```$/gm, type: 'markdown-code', severity: 'error' },
      );
    }
    
    if (features.useJapanesePunctuation) {
      rules.convertFormats.push(
        { pattern: /"([^"]+)"/g, to: '「$1」', type: 'chinese-quote' },
        { pattern: /"([^"]+)"/g, to: '「$1」', type: 'english-quote' },
        { pattern: /'([^']+)'/g, to: '「$1」', type: 'single-quote' },
      );
    }
    
    if (features.disableParentheses) {
      rules.convertFormats.push({
        pattern: /[（(]([^)）]+)[)）]/g,
        to: '「$1」',
        type: 'parentheses',
        condition: (m) => m.length > 5,
      });
    }
    
    return rules;
  }
  
  getFeatureDescription(features: PolishFeatures): string {
    const descriptions: string[] = [];
    
    if (features.disableMarkdown) descriptions.push('禁用Markdown');
    if (features.useJapanesePunctuation) descriptions.push('日文标点');
    if (features.disableParentheses) descriptions.push('禁用小括号');
    
    const styleMap: Record<string, string> = {
      classical: '文言风格',
      modern: '白话风格',
      mixed: '半文半白',
    };
    if (features.styleMode && styleMap[features.styleMode]) {
      descriptions.push(styleMap[features.styleMode]);
    }
    
    const perspectiveMap: Record<string, string> = {
      'first-person': '第一人称',
      'third-person-limited': '有限视角',
      'third-person-omniscient': '全知视角',
    };
    if (features.perspectiveMode && perspectiveMap[features.perspectiveMode]) {
      descriptions.push(perspectiveMap[features.perspectiveMode]);
    }
    
    return descriptions.join('、') || '默认配置';
  }
}
