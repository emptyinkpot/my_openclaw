/**
 * ============================================================================
 * 文本检查工具（词汇使用检查、禁用词检查）
 * ============================================================================
 */

/**
 * 提取资源项中的内容
 */
export function extractContents(items: any[] | undefined): string[] {
  if (!items || items.length === 0) return [];
  return items
    .map((item) => (typeof item === "string" ? item : item?.content))
    .filter(Boolean);
}

/**
 * 检查词汇使用情况
 */
export function checkVocabularyUsage(
  text: string,
  vocabulary: string[]
): { used: string[]; unused: string[]; rate: number } {
  const used: string[] = [];
  const unused: string[] = [];

  for (const word of vocabulary) {
    if (word && text.includes(word)) {
      used.push(word);
    } else if (word) {
      unused.push(word);
    }
  }

  const rate = vocabulary.length > 0 ? (used.length / vocabulary.length) * 100 : 0;
  return { used, unused, rate };
}

/**
 * 检查禁用词残留
 */
export function checkBannedWords(text: string, bannedWords: string[]): string[] {
  const found: string[] = [];
  const textLower = text.toLowerCase();

  for (const word of bannedWords) {
    if (word && textLower.includes(word.toLowerCase())) {
      found.push(word);
    }
  }

  return found;
}

/**
 * 随机抽样
 */
export function sampleItems<T>(items: T[], count: number): T[] {
  if (items.length <= count) return [...items];
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
