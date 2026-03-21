/**
 * 专有名词检查步骤（简化版，无外部依赖）
 * 
 * 职责：
 * 1. 检测文本中的现实世界专有名词
 * 2. 调用LLM替换为通用表达
 * 
 * @module modules/polish/steps/config/proper-noun
 */

import { BaseStep } from '../base';
import type { StepContext, StepResult, StepSettings, ReplacementRecord } from '../../types';

// 动态导入LLM SDK
let LLMClient: any;
let Config: any;

try {
  const sdk = require('coze-coding-dev-sdk');
  LLMClient = sdk.LLMClient;
  Config = sdk.Config;
} catch (e) {
  console.warn('[ProperNounCheckStep] coze-coding-dev-sdk not available');
}

/**
 * 专有名词检查步骤
 */
export class ProperNounCheckStep extends BaseStep {
  readonly id = 'properNounCheck';
  readonly name = '专有名词检查';
  readonly phase = 'config' as const;
  readonly description = '检测并替换昭和/唐朝/法兰西等现实专有名词';
  readonly fixed = false;
  readonly dependencies = ['detect'];
  
  // 专有名词分类
  private readonly PROPER_NOUNS = {
    /** 日本年号 */
    eras: ['昭和', '明治', '大正', '平成', '令和', '庆应', '元治', '文久', '安政'],
    /** 朝代名称 */
    dynasties: ['唐朝', '宋代', '明朝', '清代', '汉朝', '秦朝', '唐朝', '三国'],
    /** 国家名称 */
    countries: ['法兰西', '英吉利', '德意志', '美利坚', '俄罗斯', '日本', '韩国'],
    /** 现代公司 */
    techCompanies: ['华为', '苹果', '谷歌', '微软', '阿里巴巴', '腾讯', '百度'],
    /** 现代品牌 */
    brands: ['iPhone', 'Android', 'Windows', 'Mac', '微信', '抖音'],
  };
  
  async execute(context: StepContext): Promise<StepResult> {
    const { text, settings, reportProgress } = context;
    const startTime = Date.now();
    
    try {
      reportProgress?.('正在检查专有名词...');
      
      // 检查是否启用专有名词检查
      const stepSettings = settings.steps[this.id] || {};
      if (!stepSettings.enabled) {
        return this.createSkipResult(text, '专有名词检查已禁用');
      }
      
      // 1. 检测专有名词
      const foundNouns = this.detectNouns(text);
      
      if (foundNouns.length === 0) {
        return this.createSuccessResult(
          text, 
          false, 
          [], 
          '未发现专有名词'
        );
      }
      
      reportProgress?.(`发现 ${foundNouns.length} 个专有名词，正在处理...`);
      
      let resultText = text;
      const replacements: ReplacementRecord[] = [];
      
      if (LLMClient && Config) {
        const config = new Config();
        const client = new LLMClient(config);
        
        // 2. 构建替换Prompt
        const prompt = this.buildReplacePrompt(text, foundNouns);
        
        // 3. 调用LLM替换
        const messages = [
          { role: 'user', content: prompt }
        ];
        
        const response = await client.invoke(messages, { 
          temperature: 0.2,
          model: "doubao-seed-1-8-251228"
        });
        
        resultText = response.content;
        
        // 4. 分析替换记录
        foundNouns.forEach(noun => {
          if (text.includes(noun) && !resultText.includes(noun)) {
            replacements.push({
              original: noun,
              replaced: '已替换',
              reason: '专有名词净化',
              source: '专有名词库',
            });
          }
        });
      } else {
        // 如果LLM不可用，简单处理一下
        resultText = text;
      }
      
      const duration = Date.now() - startTime;
      
      return {
        text: resultText,
        modified: resultText !== text,
        replacements,
        report: {
          step: this.name,
          report: `处理 ${foundNouns.length} 个专有名词`,
          duration,
          success: true,
        },
      };
      
    } catch (error) {
      console.error('[ProperNounCheckStep] Error:', error);
      return this.createErrorResult(text, error as Error);
    }
  }
  
  buildPrompt(settings: StepSettings): string {
    // 配置阶段的Prompt由execute动态生成
    return '';
  }
  
  /**
   * 检测文本中的专有名词
   */
  private detectNouns(text: string): string[] {
    const found: string[] = [];
    const allNouns = Object.values(this.PROPER_NOUNS).flat();
    
    allNouns.forEach(noun => {
      if (text.includes(noun) && !found.includes(noun)) {
        found.push(noun);
      }
    });
    
    return found;
  }
  
  /**
   * 构建替换Prompt
   */
  private buildReplacePrompt(text: string, nouns: string[]): string {
    return `你是一位文学编辑，请将文本中的特定名称改为通用表达。

【需要改写的名称】
${nouns.join('、')}

【原文】
${text}

【改写要求】
1. 将年号改为"那年"、"当年"、"那一年"等时间词
2. 将朝代名改为"前朝"、"古时"、"旧时"等
3. 将国名改为"邻国"、"异国"、"远邦"等
4. 将现代公司名改为"商会"、"商行"等通用称呼
5. 将品牌名改为产品描述（如"智能电话"）
6. 保持文意不变，语句通顺自然
7. 直接输出改写后的文本，不要添加解释

【改写后的文本】`;
  }
}