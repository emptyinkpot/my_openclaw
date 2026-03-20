"use strict";
/**
 * 文本处理工具函数
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.chineseToNumber = chineseToNumber;
exports.extractChapterNumber = extractChapterNumber;
exports.formatWordCount = formatWordCount;
/**
 * 中文数字转阿拉伯数字
 * 支持：零一二三四五六七八九十百千万亿
 *
 * @example
 * chineseToNumber('四十九') // 49
 * chineseToNumber('一百零五') // 105
 */
function chineseToNumber(chinese) {
    const chineseNums = {
        '零': 0, '一': 1, '二': 2, '三': 3, '四': 4,
        '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
        '十': 10, '百': 100, '千': 1000, '万': 10000, '亿': 100000000
    };
    let result = 0;
    let temp = 0;
    let lastUnit = 1;
    for (let i = 0; i < chinese.length; i++) {
        const char = chinese[i];
        const num = chineseNums[char];
        if (num === undefined)
            continue;
        if (num >= 10) {
            // 单位（十、百、千等）
            if (temp === 0)
                temp = 1;
            result += temp * num;
            temp = 0;
            lastUnit = num;
        }
        else {
            // 数字（0-9）
            temp = temp * 10 + num;
        }
    }
    result += temp;
    return result;
}
/**
 * 从文本中提取章节号（支持阿拉伯数字和中文数字）
 *
 * @example
 * extractChapterNumber('第49章') // 49
 * extractChapterNumber('第四十九章') // 49
 */
function extractChapterNumber(text) {
    // 尝试匹配阿拉伯数字：第49章
    const arabicMatch = text.match(/第\s*(\d+)\s*章/);
    if (arabicMatch) {
        return parseInt(arabicMatch[1], 10);
    }
    // 尝试匹配中文数字：第四十九章
    const chineseMatch = text.match(/第\s*([零一二三四五六七八九十百千万亿]+)\s*章/);
    if (chineseMatch) {
        return chineseToNumber(chineseMatch[1]);
    }
    return null;
}
/**
 * 格式化字数显示
 */
function formatWordCount(count) {
    if (count >= 10000) {
        return (count / 10000).toFixed(1) + '万';
    }
    return count.toLocaleString();
}
//# sourceMappingURL=text.js.map