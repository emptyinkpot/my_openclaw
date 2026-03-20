/**
 * ============================================================================
 * 文本处理工具（重构版）
 * ============================================================================
 * 
 * 模块化设计：
 * - 每个处理功能独立为私有方法
 * - postProcess 作为统一入口，按顺序调用各处理模块
 * - 配置驱动的处理流程
 */

import type { PunctuationSettings } from '@/types';

/** 后处理选项 */
export interface PostProcessOptions {
  enableBreathing?: boolean;
  punctuation?: PunctuationSettings;
}

/** Markdown 清理规则 */
const MARKDOWN_RULES: Array<{
  pattern: RegExp;
  replacement: string;
  description: string;
}> = [
  // 标题：# 标题 → 标题
  { pattern: /^#{1,6}\s+/gm, replacement: "", description: "标题标记" },
  // 加粗：**文本** 或 __文本__ → 文本
  { pattern: /\*\*([^*]+)\*\*/g, replacement: "$1", description: "加粗标记" },
  { pattern: /__([^_]+)__/g, replacement: "$1", description: "加粗标记" },
  // 斜体：*文本* 或 _文本_ → 文本（注意不要匹配到合法的下划线）
  { pattern: /(?<!\w)\*([^*\n]+)\*(?!\w)/g, replacement: "$1", description: "斜体标记" },
  // 删除线：~~文本~~ → 文本
  { pattern: /~~([^~]+)~~/g, replacement: "$1", description: "删除线标记" },
  // 代码块：```代码``` → 代码
  { pattern: /```\w*\n?/g, replacement: "", description: "代码块标记" },
  // 行内代码：`代码` → 代码
  { pattern: /`([^`]+)`/g, replacement: "$1", description: "行内代码标记" },
  // 链接：[文本](链接) → 文本
  { pattern: /\[([^\]]+)\]\([^)]+\)/g, replacement: "$1", description: "链接标记" },
  // 图片：![alt](url) → [图片]
  { pattern: /!\[([^\]]*)\]\([^)]+\)/g, replacement: "", description: "图片标记" },
  // 引用块：> 文本 → 文本
  { pattern: /^>\s+/gm, replacement: "", description: "引用标记" },
  // 列表标记：- 文本 或 * 文本 或 1. 文本 → 文本
  { pattern: /^[\-\*]\s+/gm, replacement: "", description: "列表标记" },
  { pattern: /^\d+\.\s+/gm, replacement: "", description: "有序列表标记" },
  // 分隔线：--- 或 *** 或 ___ → 空行
  { pattern: /^[-*_]{3,}$/gm, replacement: "", description: "分隔线" },
  // 脚注：[^n] 或 [^n]: content
  { pattern: /\[\^[^\]]+\]/g, replacement: "", description: "脚注标记" },
  // 表格分隔：|---|---| → 空行
  { pattern: /^\|[-:\s|]+\|$/gm, replacement: "", description: "表格分隔行" },
  // 表格边框：| 文本 | → 文本
  { pattern: /^\|(.+)\|$/gm, replacement: "$1", description: "表格边框" },
  // 转义字符：\* → *
  { pattern: /\\([\\`*_{}[\]()#+\-.!])/g, replacement: "$1", description: "转义字符" },
];

export const TextProcessor = {
  // =========================================================================
  // 公共方法
  // =========================================================================

  /**
   * 后处理：统一入口
   * 按顺序执行：JSON清理 → 标点处理 → Markdown清理 → 格式优化 → 呼吸感分段
   */
  postProcess(text: string | undefined | null, options?: PostProcessOptions): string {
    // 防御性处理：如果文本为空，返回空字符串
    if (!text || typeof text !== 'string') {
      return "";
    }
    
    const { enableBreathing, punctuation } = options || {};
    let result = text;

    // 阶段0：清理 JSON 元数据（最强力清理）
    result = this._cleanJSONMetadata(result);

    // 阶段1：标点符号处理
    result = this._processPunctuation(result, punctuation);

    // 阶段2：Markdown 清理（如果启用）
    if (punctuation?.banMarkdown) {
      result = this._cleanMarkdown(result);
    }

    // 阶段3：格式优化
    result = this._normalizeFormat(result);

    // 阶段4：呼吸感分段（如果启用）
    if (enableBreathing) {
      result = this.breathingSegment(result);
    }

    return result;
  },

  // =========================================================================
  // 私有方法：各处理模块
  // =========================================================================

  /**
   * 清理 JSON 元数据（最强力清理）
   * 移除所有可能的 JSON 格式，包括英文引号和中文引号
   */
  _cleanJSONMetadata(text: string): string {
    let result = text;
    
    // 1. 移除开头的 JSON 对象（英文引号）
    result = result.replace(/^\s*\{[^{}]*\}\s*/m, '');
    
    // 2. 移除开头的 JSON 对象（中文引号「」）
    result = result.replace(/^\s*\{[^{}]*\}\s*/m, '');
    
    // 3. 移除包含 perspective/era/faction 的 JSON 行
    result = result.replace(/^\s*\{["「]?perspective["」]?[^}]*\}\s*$/gm, '');
    
    // 4. 移除任何以 { 开头、} 结尾的单行内容
    result = result.replace(/^\s*\{[^\n]*\}\s*$/gm, '');
    
    // 5. 移除多行 JSON（从 { 到 }，可能跨行）
    result = result.replace(/\{[\s\S]*?「perspective」[\s\S]*?\}/g, '');
    result = result.replace(/\{[\s\S]*?"perspective"[\s\S]*?\}/g, '');
    
    // 6. 清理开头可能残留的空白行
    result = result.replace(/^\s+/, '');
    
    return result;
  },

  /**
   * 标点符号处理
   */
  _processPunctuation(text: string, punctuation?: PunctuationSettings): string {
    if (!punctuation) return text;
    
    let result = text;

    // 禁用破折号
    if (punctuation.banDash) {
      result = result.replace(/——/g, "，").replace(/—/g, "，").replace(/──/g, "，");
    }
    
    // 禁用冒号
    if (punctuation.banColon) {
      result = result.replace(/：/g, "，");
    }
    
    // 禁用括号
    if (punctuation.banParentheses) {
      result = result.replace(/[（(]([^）)]+)[）)]/g, "$1");
    }
    
    // 日文引号替换
    if (punctuation.useJapaneseQuotes) {
      result = this._convertToJapaneseQuotes(result);
    }
    
    // 日文书名号替换
    if (punctuation.useJapaneseBookMarks) {
      result = result.replace(/《([^》]+)》/g, "『$1』");
    }

    return result;
  },

  /**
   * 中文引号转日文引号
   */
  _convertToJapaneseQuotes(text: string): string {
    let inQuote = false;
    let chars = text.split('');
    
    for (let i = 0; i < chars.length; i++) {
      // 处理标准双引号
      if (chars[i] === '"') {
        chars[i] = inQuote ? '」' : '「';
        inQuote = !inQuote;
      }
      // 处理中文引号变体（左引号）
      if (chars[i] === '"' || chars[i] === '"' || chars[i] === '"') {
        chars[i] = '「';
        inQuote = true;
      }
      // 处理中文引号变体（右引号）
      if (chars[i] === '"' || chars[i] === '"' || chars[i] === '"') {
        chars[i] = '」';
        inQuote = false;
      }
    }
    
    return chars.join('');
  },

  /**
   * Markdown 语法清理
   * 清理所有常见的 Markdown 格式标记
   */
  _cleanMarkdown(text: string): string {
    let result = text;
    
    for (const rule of MARKDOWN_RULES) {
      result = result.replace(rule.pattern, rule.replacement);
    }
    
    // 清理多余的空行（超过2个连续空行）
    result = result.replace(/\n{3,}/g, "\n\n");
    
    return result;
  },

  /**
   * 格式规范化
   * 清理多余标点和空白
   */
  _normalizeFormat(text: string): string {
    return text
      .replace(/，，+/g, "，")
      .replace(/。。+/g, "。")
      .replace(/[ \t]+/g, "")
      .replace(/\n{3,}/g, "\n\n");
  },

  // =========================================================================
  // 公共工具方法
  // =========================================================================

  /** 呼吸感分段：按语义和长度智能分段 */
  breathingSegment(text: string): string {
    const sentences = text.split(/([。！？])/g).filter(Boolean);
    const segments: string[] = [];
    let currentSegment = "";
    const TARGET_LENGTH = 80;
    const MAX_LENGTH = 120;

    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i] + (sentences[i + 1] || "");
      currentSegment += sentence;

      const shouldBreak =
        currentSegment.length >= TARGET_LENGTH ||
        currentSegment.length >= MAX_LENGTH ||
        (currentSegment.length >= 40 && /[^，。！？、][。！？]$/.test(sentence));

      if (shouldBreak && currentSegment.trim()) {
        segments.push(currentSegment.trim());
        currentSegment = "";
      }
    }

    if (currentSegment.trim()) {
      segments.push(currentSegment.trim());
    }

    return segments.join("\n\n");
  },

  /** 解析 LLM 返回的识别结果 */
  parseDetectionResult(content: string | undefined | null): {
    detectedContext: { perspective?: string; era?: string; faction?: string };
    text: string;
  } {
    // 防御性处理：如果内容为空，返回默认值
    if (!content || typeof content !== 'string') {
      return { 
        detectedContext: { perspective: "未识别", era: "未识别", faction: "未识别" }, 
        text: "" 
      };
    }
    
    // 直接清理文本中的 JSON 元数据
    const text = this._cleanJSONMetadata(content);
    
    // 不再解析 JSON，直接返回清理后的文本
    return { 
      detectedContext: { perspective: "未识别", era: "未识别", faction: "未识别" }, 
      text 
    };
  },

  /** 统计字数 */
  countChars(text: string): number {
    return text.replace(/\s/g, "").length;
  },

  /** 截断文本（带省略号） */
  truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + "...";
  },

  /** 识别专有名词（机构名等） */
  identifyProperNouns(text: string): string[] {
    const nouns: string[] = [];
    
    // 量词前缀
    const quantifiers = ['一家', '这家', '那家', '某家', '各家', '哪家'];
    
    // 后缀列表
    const suffixes = ['公司', '集团', '大学', '医院', '研究所', '学院', '银行'];
    
    // 遍历文本，寻找机构名
    suffixes.forEach(suffix => {
      let idx = text.indexOf(suffix);
      while (idx !== -1) {
        // 向前查找机构名的起始位置（最多4个字符）
        let start = idx - 1;
        let charCount = 0;
        while (start >= 0 && charCount < 4) {
          const char = text[start];
          if (!char.match(/[\u4e00-\u9fa5]/)) break;
          start--;
          charCount++;
        }
        start++; // 调整到正确的起始位置
        
        // 获取完整的匹配（可能包含量词）
        const fullMatch = text.slice(start, idx + suffix.length);
        
        // 去除量词，获取真正的机构名
        let orgName = fullMatch;
        for (const q of quantifiers) {
          if (fullMatch.startsWith(q)) {
            orgName = fullMatch.slice(q.length);
            break;
          }
        }
        
        // 如果机构名长度合理（至少2个字+后缀），则是专有名词
        if (orgName.length >= 3 && orgName.length <= 6 && !nouns.includes(orgName)) {
          nouns.push(orgName);
        }
        
        idx = text.indexOf(suffix, idx + 1);
      }
    });
    
    return nouns;
  },

  /** 生成专有名词保护指令 */
  generateProperNounProtection(nouns: string[]): string {
    if (nouns.length === 0) return "";
    
    return `⛔ 【必须保护的专有名词】
以下专有名词在润色过程中必须保持原样，不得修改：
${nouns.map(n => `- ${n}`).join('\n')}
请确保这些名词在输出中保持完全一致。`;
  },

  /** 检查文本是否包含 Markdown 语法 */
  hasMarkdown(text: string): boolean {
    // 简单检测常见的 Markdown 标记
    const markdownPatterns = [
      /^#{1,6}\s+/m,           // 标题
      /\*\*[^*]+\*\*/,         // 加粗
      /__[^_]+__/,             // 加粗
      /~~[^~]+~~/,             // 删除线
      /`[^`]+`/,               // 行内代码
      /\[[^\]]+\]\([^)]+\)/,   // 链接
      /^>\s+/m,                // 引用
      /^[-*]\s+/m,             // 无序列表
    ];
    
    return markdownPatterns.some(pattern => pattern.test(text));
  },
};
