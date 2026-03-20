/**
 * ============================================================================
 * 字数统计 Hook
 * ============================================================================
 */

import { useMemo } from "react";

/**
 * 计算文本字数（排除空白字符）
 */
export function useWordCount(text: string): number {
  return useMemo(() => {
    if (!text) return 0;
    return text.replace(/\s/g, "").length;
  }, [text]);
}

/**
 * 计算文本详细统计
 */
export function useTextStats(text: string) {
  return useMemo(() => {
    if (!text) {
      return {
        chars: 0,
        charsNoSpace: 0,
        words: 0,
        lines: 0,
        paragraphs: 0,
      };
    }

    return {
      chars: text.length,
      charsNoSpace: text.replace(/\s/g, "").length,
      words: text.split(/\s+/).filter(Boolean).length,
      lines: text.split("\n").length,
      paragraphs: text.split(/\n\s*\n/).filter(Boolean).length,
    };
  }, [text]);
}
