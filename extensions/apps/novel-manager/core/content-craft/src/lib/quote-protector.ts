/**
 * ============================================================================
 * 引用内容保护器
 * ============================================================================
 * 
 * 功能：在文本处理前保护引用内容（引号、书名号等），处理完成后恢复
 * 改进：防止原文中已有占位符格式被误识别
 */

export type QuoteMap = Map<string, string>;

export const QuoteProtector = {
  /** 保护引用内容，返回占位符文本和映射表 */
  protect(text: string): { text: string; map: QuoteMap } {
    const map = new Map<string, string>();
    let counter = 0;
    
    // 先检测原文中是否已有类似占位符的格式，如有则先转义
    // 转义格式：【Q数字】 -> 【ORIGIN_Q数字】
    let processedText = text.replace(/【Q(\d+)】/g, '【ORIGIN_Q$1】');
    
    const replace = (match: string): string => {
      const placeholder = `【Q${counter++}】`;
      map.set(placeholder, match);
      return placeholder;
    };

    // 按顺序保护各类引用
    processedText = processedText
      // 书名号
      .replace(/《[^》]+》/g, replace)
      // 双引号
      .replace(/"[^"]+"/g, replace)
      .replace(/"[^"]+"/g, replace)
      // 直角引号
      .replace(/「[^」]+」/g, replace)
      .replace(/『[^』]+』/g, replace);

    console.log(`[QuoteProtector] 保护了 ${map.size} 个引用内容`);
    
    return { text: processedText, map };
  },

  /** 恢复引用内容 */
  restore(text: string | undefined | null, map: QuoteMap): string {
    // 防御性处理：如果文本为空，返回空字符串
    if (!text || typeof text !== 'string') {
      return "";
    }
    
    let result = text;
    
    // 只恢复map中存在的占位符，精确匹配
    map.forEach((original, placeholder) => {
      // 转义特殊字符用于正则
      const escaped = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(escaped, "g"), original);
    });
    
    // 处理变体格式：LLM 可能将【Q0】变成 [Q0]、(Q0)、Q0 等
    map.forEach((original, placeholder) => {
      const num = placeholder.match(/\d+/)?.[0] || "0";
      const variants = [
        `[Q${num}]`,      // 英文方括号
        `（Q${num}）`,    // 中文圆括号
        `(Q${num})`,      // 英文圆括号
        `Q${num}`,        // 无括号
        `【 Q${num} 】`,  // 带空格
        `[ Q${num} ]`,    // 英文方括号带空格
      ];
      
      variants.forEach(variant => {
        if (result.includes(variant)) {
          console.log(`[QuoteProtector] 发现变体格式: ${variant} -> ${original}`);
          result = result.split(variant).join(original);
        }
      });
    });
    
    return result;
  },

  /** 恢复原文中已有的占位符格式 */
  restoreOriginalPlaceholders(text: string | undefined | null): string {
    // 防御性处理：如果文本为空，返回空字符串
    if (!text || typeof text !== 'string') {
      return "";
    }
    // 【ORIGIN_Q数字】 -> 【Q数字】
    return text.replace(/【ORIGIN_Q(\d+)】/g, '【Q$1】');
  },

  /** 检查文本中是否有引用内容 */
  hasQuotes(text: string): boolean {
    return /《[^》]+》|"[^"]+"|"[^"]+"|「[^」]+」|『[^』]+』/.test(text);
  },
  
  /** 检查是否有未恢复的占位符（用于调试） */
  findUnrestoredPlaceholders(text: string, map: QuoteMap): string[] {
    const found: string[] = [];
    // 只检查map中的占位符
    map.forEach((_, placeholder) => {
      if (text.includes(placeholder)) {
        found.push(placeholder);
      }
    });
    
    // 也检查变体格式
    map.forEach((_, placeholder) => {
      const num = placeholder.match(/\d+/)?.[0] || "0";
      const variants = [`[Q${num}]`, `（Q${num}）`, `(Q${num})`, `Q${num}`];
      variants.forEach(variant => {
        if (text.includes(variant) && !found.includes(variant)) {
          found.push(variant);
        }
      });
    });
    
    return found;
  },
  
  /** 检查输出是否被截断（根据占位符恢复率） */
  checkOutputTruncation(text: string, map: QuoteMap): { 
    isTruncated: boolean; 
    restoredCount: number; 
    totalCount: number;
    missingPlaceholders: string[];
  } {
    let restoredCount = 0;
    const missingPlaceholders: string[] = [];
    
    map.forEach((_, placeholder) => {
      const num = placeholder.match(/\d+/)?.[0] || "0";
      // 检查是否已恢复（原文存在）
      const hasOriginal = Array.from(map.values()).some(v => text.includes(v));
      // 检查是否有占位符或其变体
      const hasPlaceholder = text.includes(placeholder);
      const hasVariant = [`[Q${num}]`, `（Q${num}）`, `(Q${num})`, `Q${num}`].some(v => text.includes(v));
      
      if (hasOriginal || !hasPlaceholder && !hasVariant) {
        restoredCount++;
      } else {
        missingPlaceholders.push(placeholder);
      }
    });
    
    const totalCount = map.size;
    const isTruncated = totalCount > 0 && restoredCount < totalCount * 0.8; // 恢复率低于80%视为截断
    
    if (isTruncated) {
      console.warn(`[QuoteProtector] 警告：输出可能被截断，恢复率 ${restoredCount}/${totalCount}`);
    }
    
    return { isTruncated, restoredCount, totalCount, missingPlaceholders };
  },
};
