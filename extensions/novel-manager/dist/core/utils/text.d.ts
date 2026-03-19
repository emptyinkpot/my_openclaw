/**
 * 文本处理工具函数
 */
/**
 * 中文数字转阿拉伯数字
 * 支持：零一二三四五六七八九十百千万亿
 *
 * @example
 * chineseToNumber('四十九') // 49
 * chineseToNumber('一百零五') // 105
 */
export declare function chineseToNumber(chinese: string): number;
/**
 * 从文本中提取章节号（支持阿拉伯数字和中文数字）
 *
 * @example
 * extractChapterNumber('第49章') // 49
 * extractChapterNumber('第四十九章') // 49
 */
export declare function extractChapterNumber(text: string): number | null;
/**
 * 格式化字数显示
 */
export declare function formatWordCount(count: number): string;
//# sourceMappingURL=text.d.ts.map