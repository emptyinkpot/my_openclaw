"use strict";
/**
 * 审稿模块 - 审稿规则
 * 所有审稿规则集中管理，高内聚低耦合
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkChapterTitle = checkChapterTitle;
exports.checkNoTitlesInContent = checkNoTitlesInContent;
exports.checkNoMarkdown = checkNoMarkdown;
exports.checkJapaneseHalfWidth = checkJapaneseHalfWidth;
exports.checkNoGarbage = checkNoGarbage;
exports.autoFixRemoveTitles = autoFixRemoveTitles;
exports.autoFixMarkdown = autoFixMarkdown;
exports.autoFixGarbage = autoFixGarbage;
exports.autoFixFullWidthSymbols = autoFixFullWidthSymbols;
exports.autoFixAll = autoFixAll;
exports.runAllAuditRules = runAllAuditRules;
/**
 * 规则1：章节必须有副标题（"第x章 副标题"格式）
 */
function checkChapterTitle(title) {
    const issues = [];
    if (!title) {
        issues.push({
            type: 'content',
            message: '章节标题不能为空',
            severity: 'error',
        });
        return issues;
    }
    const subtitlePattern = /^第[0-9]+章\s+.+$/;
    if (!subtitlePattern.test(title)) {
        issues.push({
            type: 'format',
            message: '章节标题格式错误，必须是"第x章 副标题"的形式',
            severity: 'error',
        });
    }
    return issues;
}
/**
 * 规则2：正文中不能有标题
 */
function checkNoTitlesInContent(content) {
    const issues = [];
    const titlePattern = /^#{1,6}\s+.+$/gm;
    const titleMatches = content.match(titlePattern);
    if (titleMatches && titleMatches.length > 0) {
        issues.push({
            type: 'format',
            message: `正文中发现 ${titleMatches.length} 个标题，不允许有标题`,
            severity: 'error',
        });
    }
    return issues;
}
/**
 * 规则3：正文中不能有Markdown语法
 */
function checkNoMarkdown(content) {
    const issues = [];
    const markdownPatterns = [
        /\*\*.+?\*\*/g, // 粗体
        /_.+?_/g, // 斜体
        /\[.+?\]\(.+?\)/g, // 链接
        /`{1,3}.+?`{1,3}/g, // 代码
    ];
    let markdownCount = 0;
    markdownPatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches)
            markdownCount += matches.length;
    });
    if (markdownCount > 0) {
        issues.push({
            type: 'format',
            message: `正文中发现 ${markdownCount} 处Markdown语法，不允许使用Markdown`,
            severity: 'error',
        });
    }
    return issues;
}
/**
 * 规则4：正文中使用日文半角符号
 */
function checkJapaneseHalfWidth(content) {
    const issues = [];
    const fullWidthPattern = /[、。，；：！？「」『』【】〔〕〖〗〘〙〚〛]/g;
    const fullWidthMatches = content.match(fullWidthPattern);
    if (fullWidthMatches && fullWidthMatches.length > 0) {
        issues.push({
            type: 'format',
            message: `正文中发现 ${fullWidthMatches.length} 个全角符号，必须使用日文半角符号`,
            severity: 'warning',
        });
    }
    return issues;
}
/**
 * 规则5：正文中不允许有无意义字母数字单词和垃圾字符
 */
function checkNoGarbage(content) {
    const issues = [];
    // 检查无意义字母数字单词
    const garbageWordPattern = /\b[a-zA-Z0-9]{10,}\b/g;
    const garbageWordMatches = content.match(garbageWordPattern);
    if (garbageWordMatches && garbageWordMatches.length > 0) {
        issues.push({
            type: 'content',
            message: `正文中发现 ${garbageWordMatches.length} 个无意义字母数字单词`,
            severity: 'error',
        });
    }
    // 检查垃圾字符
    const garbageCharPattern = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
    const garbageCharMatches = content.match(garbageCharPattern);
    if (garbageCharMatches && garbageCharMatches.length > 0) {
        issues.push({
            type: 'content',
            message: `正文中发现 ${garbageCharMatches.length} 个垃圾字符`,
            severity: 'error',
        });
    }
    return issues;
}
/**
 * 自动修复1：删除正文中的标题（不影响内容）
 */
function autoFixRemoveTitles(content) {
    let result = content;
    // 1. 删除 Markdown 标题（# 开头的行）
    result = result.replace(/^#{1,6}\s+.+$/gm, '');
    // 2. 删除所有格式的"第x章"标题（包括中文数字、空格、副标题等）
    // 匹配：
    // - 第34章
    // - 第 34 章
    // - 第三十四章
    // - 第34章 能量过载
    // - 第 34 章 能量过载
    // - 第三十四章 能量过载
    // - 第34章 能量过载 - 副标题
    // - 等等各种格式
    result = result.replace(/^第\s*[0-9零一二三四五六七八九十百千]+章.*$/gm, '');
    // 3. 清理多余的空行（但保留换行符）
    result = result.replace(/\n{3,}/g, '\n\n');
    return result;
}
/**
 * 自动修复2：修复 Markdown 语法（转换为普通文本，不影响内容意思）
 */
function autoFixMarkdown(content) {
    let result = content;
    // 粗体 **text** → text
    result = result.replace(/\*\*(.+?)\*\*/g, '$1');
    // 斜体 _text_ → text
    result = result.replace(/_(.+?)_/g, '$1');
    // 链接 [text](url) → text
    result = result.replace(/\[(.+?)\]\(.+?\)/g, '$1');
    // 代码 `code` → code
    result = result.replace(/`{1,3}(.+?)`{1,3}/g, '$1');
    return result;
}
/**
 * 自动修复3：删除垃圾字符和无意义单词
 */
function autoFixGarbage(content) {
    let result = content;
    // 删除垃圾字符
    result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    // 删除无意义字母数字单词（10个字符以上的无意义组合）
    result = result.replace(/\b[a-zA-Z0-9]{10,}\b/g, '');
    // 清理多余的空格（但不删除换行符）
    // 只替换连续的空格（不包含换行符）
    result = result.replace(/[ \t]+/g, ' ');
    return result;
}
/**
 * 自动修复：将全角符号转换为半角符号
 */
function autoFixFullWidthSymbols(content) {
    const fullWidthToHalfWidth = {
        '、': ',',
        '。': '.',
        '，': ',',
        '；': ';',
        '：': ':',
        '！': '!',
        '？': '?',
        '「': '"',
        '」': '"',
        '『': '"',
        '』': '"',
        '【': '[',
        '】': ']',
    };
    let result = content;
    for (const [full, half] of Object.entries(fullWidthToHalfWidth)) {
        result = result.split(full).join(half);
    }
    return result;
}
/**
 * 完整自动修复：按顺序执行所有自动修复，保证内容信息不受影响
 */
function autoFixAll(content) {
    let result = content;
    // 1. 删除正文中的标题
    result = autoFixRemoveTitles(result);
    // 2. 修复 Markdown 语法
    result = autoFixMarkdown(result);
    // 3. 删除垃圾字符和无意义单词
    result = autoFixGarbage(result);
    // 4. 转换全角符号为半角符号
    result = autoFixFullWidthSymbols(result);
    return result;
}
/**
 * 运行所有审稿规则
 */
function runAllAuditRules(title, content) {
    let issues = [];
    let score = 100;
    // 运行所有规则
    issues = issues.concat(checkChapterTitle(title));
    issues = issues.concat(checkNoTitlesInContent(content));
    issues = issues.concat(checkNoMarkdown(content));
    issues = issues.concat(checkJapaneseHalfWidth(content));
    issues = issues.concat(checkNoGarbage(content));
    // 计算分数
    issues.forEach(issue => {
        if (issue.severity === 'error')
            score -= 20;
        else if (issue.severity === 'warning')
            score -= 10;
    });
    // 检查是否可以自动修复（只要有问题就可以尝试自动修复）
    const canAutoFix = issues.length > 0;
    return {
        issues,
        score: Math.max(0, score),
        canAutoFix,
    };
}
//# sourceMappingURL=rules.js.map