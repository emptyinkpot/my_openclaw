/**
 * ============================================================================
 * 增强润色 API
 * ============================================================================
 * 
 * 功能：将精选数据集成到润色流程中
 * - 同义词替换（高频词汇精准替代）
 * - AI特征词检测与替换（对抗AI检测）
 * - 学术规范转换（口语化→正式化）
 * - 低质量表达清理（冗余表达优化）
 * - 文言风格转换（现代→文学/古典）
 * 
 * 特点：增量式集成，不影响现有核心逻辑
 */

import { NextRequest, NextResponse } from "next/server";
import {
  SYNONYM_DATABASE,
  LOW_QUALITY_EXPRESSIONS,
  AI_GENERATION_SIGNATURES,
  ACADEMIC_WRITING_STANDARDS,
  CLASSICAL_STYLE_VOCABULARY,
} from "@/lib/opensource-resources";

// ============================================================================
// 类型定义
// ============================================================================

interface EnhanceRequest {
  text: string;
  options: {
    enableSynonym: boolean;      // 同义词替换
    enableAntiAI: boolean;       // AI检测对抗
    enableAcademic: boolean;     // 学术规范
    enableCleanLowQuality: boolean; // 清理低质量表达
    enableClassical: boolean;    // 文言风格
    classicalLevel: 'literary' | 'classical'; // 文言程度
    intensity: 'light' | 'medium' | 'heavy';  // 改写强度
  };
}

interface Replacement {
  original: string;
  replaced: string;
  reason: string;
  type: string;
}

interface EnhanceResponse {
  success: boolean;
  text: string;
  replacements: Replacement[];
  stats: {
    synonym: number;
    antiAI: number;
    academic: number;
    lowQuality: number;
    classical: number;
    total: number;
  };
}

// ============================================================================
// 增强处理器
// ============================================================================

const EnhanceProcessor = {
  /**
   * 同义词替换
   * 根据强度控制替换比例
   */
  applySynonyms(text: string, intensity: 'light' | 'medium' | 'heavy'): { text: string; replacements: Replacement[] } {
    const replacements: Replacement[] = [];
    let result = text;

    // 根据强度决定替换比例
    const ratio = intensity === 'light' ? 0.3 : intensity === 'medium' ? 0.6 : 1.0;

    // 按频率排序，优先替换高频词
    const sortedSynonyms = [...SYNONYM_DATABASE]
      .filter(item => item.frequency >= 4) // 只替换高频词
      .sort((a, b) => b.frequency - a.frequency);

    for (const item of sortedSynonyms) {
      // 根据强度决定是否替换这个词
      if (Math.random() > ratio) continue;

      const regex = new RegExp(item.word, 'g');
      const matches = text.match(regex);
      
      if (matches && matches.length > 0) {
        // 从同义词中随机选择一个
        const synonym = item.synonyms[Math.floor(Math.random() * item.synonyms.length)];
        
        result = result.replace(regex, (match) => {
          replacements.push({
            original: match,
            replaced: synonym,
            reason: `同义词替换（${item.category}）`,
            type: 'synonym',
          });
          return synonym;
        });
      }
    }

    return { text: result, replacements };
  },

  /**
   * AI特征词替换
   * 检测并替换AI生成文本的典型特征
   */
  applyAntiAI(text: string): { text: string; replacements: Replacement[] } {
    const replacements: Replacement[] = [];
    let result = text;

    for (const signature of AI_GENERATION_SIGNATURES) {
      if (result.includes(signature.signature)) {
        // 从人类替代方案中随机选择
        const humanAlt = signature.humanAlternatives[
          Math.floor(Math.random() * signature.humanAlternatives.length)
        ];
        
        result = result.replace(new RegExp(signature.signature, 'g'), (match) => {
          replacements.push({
            original: match,
            replaced: humanAlt,
            reason: `AI特征替换（${signature.category}）`,
            type: 'antiAI',
          });
          return humanAlt;
        });
      }
    }

    return { text: result, replacements };
  },

  /**
   * 学术规范转换
   * 将口语化表达转换为正式学术表达
   */
  applyAcademic(text: string): { text: string; replacements: Replacement[] } {
    const replacements: Replacement[] = [];
    let result = text;

    for (const standard of ACADEMIC_WRITING_STANDARDS) {
      const regex = new RegExp(standard.informal, 'g');
      
      if (result.match(regex)) {
        result = result.replace(regex, (match) => {
          replacements.push({
            original: match,
            replaced: standard.formal,
            reason: `学术规范（${standard.context}）`,
            type: 'academic',
          });
          return standard.formal;
        });
      }
    }

    return { text: result, replacements };
  },

  /**
   * 清理低质量表达
   * 移除或替换冗余表达
   */
  cleanLowQuality(text: string): { text: string; replacements: Replacement[] } {
    const replacements: Replacement[] = [];
    let result = text;

    // 按严重程度排序，优先处理高严重度
    const sortedExpressions = [...LOW_QUALITY_EXPRESSIONS]
      .sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.severity] - order[b.severity];
      });

    for (const expr of sortedExpressions) {
      if (result.includes(expr.expression)) {
        result = result.replace(new RegExp(expr.expression, 'g'), (match) => {
          // 解析improvement字段，提取实际替换内容
          let replacement = expr.improvement;
          
          // 如果包含"删除"，则删除（空字符串）
          if (replacement.includes('删除') || replacement.includes('直接')) {
            replacement = '';
          }
          // 如果是"改为'xxx'"模式，提取xxx
          else if (replacement.includes('改为')) {
            const match = replacement.match(/['"「」『』]([^'"「」『』]+)['"「」『』]/);
            if (match) {
              replacement = match[1];
            } else {
              // 尝试提取"改为"后面的内容
              const afterGaiwei = replacement.split('改为')[1]?.trim();
              if (afterGaiwei) {
                // 移除引号
                replacement = afterGaiwei.replace(/['"「」『』]/g, '');
              }
            }
          }
          // 如果是"根据上下文调整"，跳过
          else if (replacement.includes('根据上下文')) {
            return match;
          }
          
          replacements.push({
            original: match,
            replaced: replacement || '(已删除)',
            reason: `${expr.reason}（${expr.severity}）`,
            type: 'lowQuality',
          });
          return replacement;
        });
      }
    }

    return { text: result, replacements };
  },

  /**
   * 文言风格转换
   * 将现代词汇转换为文学/古典风格
   */
  applyClassical(
    text: string, 
    level: 'literary' | 'classical',
    intensity: 'light' | 'medium' | 'heavy'
  ): { text: string; replacements: Replacement[] } {
    const replacements: Replacement[] = [];
    let result = text;

    // 根据强度决定转换比例
    const ratio = intensity === 'light' ? 0.3 : intensity === 'medium' ? 0.5 : 0.7;

    for (const vocab of CLASSICAL_STYLE_VOCABULARY) {
      // 根据强度随机决定是否转换这个词
      if (Math.random() > ratio) continue;

      const target = level === 'literary' ? vocab.literary : vocab.classical;
      const regex = new RegExp(vocab.modern, 'g');
      
      if (result.match(regex)) {
        result = result.replace(regex, (match) => {
          replacements.push({
            original: match,
            replaced: target,
            reason: `文言风格（${vocab.context}，${level === 'literary' ? '文学' : '古典'}）`,
            type: 'classical',
          });
          return target;
        });
      }
    }

    return { text: result, replacements };
  },

  /**
   * 清理多余标点符号
   * 处理删除词语后留下的标点问题
   */
  cleanPunctuation(text: string): string {
    let result = text;

    // 1. 清理连续重复的标点符号
    result = result.replace(/，+/g, '，');      // 多个逗号 → 单个
    result = result.replace(/。+/g, '。');      // 多个句号 → 单个
    result = result.replace(/、+/g, '、');      // 多个顿号 → 单个
    result = result.replace(/；+/g, '；');      // 多个分号 → 单个
    result = result.replace(/：+/g, '：');      // 多个冒号 → 单个
    result = result.replace(/！+/g, '！');      // 多个感叹号 → 单个
    result = result.replace(/？+/g, '？');      // 多个问号 → 单个
    result = result.replace(/"/g, '"');        // 多个引号 → 单个
    result = result.replace(/"/g, '"');
    result = result.replace(/'/g, "'");
    result = result.replace(/'/g, "'");
    result = result.replace(/「+/g, '「');      // 日文引号
    result = result.replace(/」+/g, '」');
    result = result.replace(/『+/g, '『');
    result = result.replace(/』+/g, '』');

    // 2. 清理句首标点
    result = result.replace(/^[，。、；：！？\s]+/, '');

    // 3. 清理段落首标点（换行后的标点）
    result = result.replace(/\n[，。、；：！？\s]+/g, '\n');

    // 4. 清理标点之间的空格
    result = result.replace(/[，。、；：！？]\s+[，。、；：！？]/g, (match) => {
      // 保留后一个标点
      return match.trim().slice(-1);
    });

    // 5. 清理标点前的空格
    result = result.replace(/\s+([，。、；：！？」』"])/g, '$1');

    // 6. 清理标点后的多余空格（保留一个）
    result = result.replace(/([，。、；：！？「『"'])\s{2,}/g, '$1');

    // 7. 处理特殊情况：删除后变成"，。"这种情况
    result = result.replace(/，。/g, '。');
    result = result.replace(/。，/g, '。');

    // 8. 处理空引号
    result = result.replace(/「」/g, '');
    result = result.replace(/『』/g, '');
    result = result.replace(/""/g, '');
    result = result.replace(/''/g, '');

    // 9. 清理多余的空行（超过2个连续换行）
    result = result.replace(/\n{3,}/g, '\n\n');

    // 10. 清理行尾标点后的空格
    result = result.replace(/[，。、；：！？]\s+$/gm, (match) => match.trim());

    return result.trim();
  },

  /**
   * 清理多余空格
   */
  cleanSpaces(text: string): string {
    return text
      .replace(/[ \t]+/g, ' ')        // 多个空格/制表符 → 单个空格
      .replace(/^[ \t]+/gm, '')       // 清除行首空格
      .replace(/[ \t]+$/gm, '')       // 清除行尾空格
      .replace(/\n{3,}/g, '\n\n');    // 多个空行 → 最多两个
  },
};

// ============================================================================
// 主处理函数
// ============================================================================

async function enhanceText(request: EnhanceRequest): Promise<EnhanceResponse> {
  const { text, options } = request;
  
  let result = text;
  const allReplacements: Replacement[] = [];
  const stats = {
    synonym: 0,
    antiAI: 0,
    academic: 0,
    lowQuality: 0,
    classical: 0,
    total: 0,
  };

  // 1. 清理低质量表达（优先处理）
  if (options.enableCleanLowQuality) {
    const { text: newText, replacements } = EnhanceProcessor.cleanLowQuality(result);
    result = newText;
    allReplacements.push(...replacements);
    stats.lowQuality = replacements.length;
  }

  // 2. AI特征词替换
  if (options.enableAntiAI) {
    const { text: newText, replacements } = EnhanceProcessor.applyAntiAI(result);
    result = newText;
    allReplacements.push(...replacements);
    stats.antiAI = replacements.length;
  }

  // 3. 学术规范转换
  if (options.enableAcademic) {
    const { text: newText, replacements } = EnhanceProcessor.applyAcademic(result);
    result = newText;
    allReplacements.push(...replacements);
    stats.academic = replacements.length;
  }

  // 4. 同义词替换
  if (options.enableSynonym) {
    const { text: newText, replacements } = EnhanceProcessor.applySynonyms(
      result, 
      options.intensity
    );
    result = newText;
    allReplacements.push(...replacements);
    stats.synonym = replacements.length;
  }

  // 5. 文言风格转换（最后执行）
  if (options.enableClassical) {
    const { text: newText, replacements } = EnhanceProcessor.applyClassical(
      result,
      options.classicalLevel,
      options.intensity
    );
    result = newText;
    allReplacements.push(...replacements);
    stats.classical = replacements.length;
  }

  // 6. 清理多余的标点符号和空格（最后清理）
  result = EnhanceProcessor.cleanPunctuation(result);
  result = EnhanceProcessor.cleanSpaces(result);

  stats.total = allReplacements.length;

  return {
    success: true,
    text: result,
    replacements: allReplacements,
    stats,
  };
}

// ============================================================================
// API Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as EnhanceRequest;
    
    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json(
        { success: false, error: "缺少文本内容" },
        { status: 400 }
      );
    }

    // 默认选项
    const defaultOptions: EnhanceRequest['options'] = {
      enableSynonym: true,
      enableAntiAI: true,
      enableAcademic: false,
      enableCleanLowQuality: true,
      enableClassical: false,
      classicalLevel: 'literary',
      intensity: 'medium',
    };

    const result = await enhanceText({
      text: body.text,
      options: { ...defaultOptions, ...body.options },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Enhance API] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "增强处理失败" 
      },
      { status: 500 }
    );
  }
}
