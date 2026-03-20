"use strict";
/**
 * 内容验证器
 * 检查章节内容是否符合润色网站要求
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentValidator = void 0;
exports.cleanContentEnhanced = cleanContentEnhanced;
class ContentValidator {
    constructor(rules) {
        this.rules = rules;
    }
    validate(content) {
        const issues = [];
        const lines = content.split('\n');
        for (const rule of this.rules.forbiddenFormats) {
            const matches = content.match(rule.pattern);
            if (matches) {
                matches.forEach(match => {
                    const line = lines.findIndex(l => l.includes(match)) + 1;
                    issues.push({
                        type: rule.type,
                        message: `发现禁止格式: ${match.substring(0, 30)}...`,
                        line,
                        severity: rule.severity,
                    });
                });
            }
        }
        let cleaned = this.clean(content);
        const cleanedLines = cleaned.split('\n');
        if (cleanedLines.length < 3) {
            issues.push({
                type: 'too-short',
                message: '清理后内容过短，可能已损坏',
                severity: 'error',
            });
        }
        return {
            valid: !issues.some(i => i.severity === 'error'),
            issues,
            cleaned,
            stats: {
                originalLength: content.length,
                cleanedLength: cleaned.length,
                removedChars: content.length - cleaned.length,
            },
        };
    }
    clean(content) {
        let cleaned = content;
        for (const rule of this.rules.convertFormats) {
            cleaned = cleaned.replace(rule.pattern, (match, ...groups) => {
                if (rule.condition && !rule.condition(match)) {
                    return match;
                }
                let result = rule.to;
                groups.forEach((group, i) => {
                    result = result.replace(`$${i + 1}`, group);
                });
                return result;
            });
        }
        cleaned = cleaned
            .replace(/^#{1,6}\s+/gm, '')
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            .replace(/\*([^*]+)\*/g, '$1')
            .replace(/^[-*+]\s+/gm, '')
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`([^`]+)`/g, '$1');
        cleaned = cleaned
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        return cleaned;
    }
    quickCheck(content) {
        return !this.rules.forbiddenFormats.some(rule => rule.severity === 'error' && rule.pattern.test(content));
    }
}
exports.ContentValidator = ContentValidator;
/**
 * 增强版内容清理函数
 */
function cleanContentEnhanced(content, options = {}) {
    let cleaned = content;
    if (options.removeMarkdown !== false) {
        cleaned = cleaned
            .replace(/^#{1,6}\s+/gm, '')
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            .replace(/\*([^*]+)\*/g, '$1')
            .replace(/^[-*+]\s+/gm, '')
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`([^`]+)`/g, '$1');
    }
    if (options.normalizeQuotes !== false) {
        cleaned = cleaned
            .replace(/"([^"]+)"/g, '「$1」')
            .replace(/"([^"]+)"/g, '「$1」')
            .replace(/'([^']+)'/g, '「$1」');
    }
    if (options.removeParentheses) {
        cleaned = cleaned.replace(/[（(]([^)）]{5,})[)）]/g, '「$1」');
    }
    cleaned = cleaned
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    if (options.maxLength && cleaned.length > options.maxLength) {
        cleaned = cleaned.substring(0, options.maxLength);
    }
    return cleaned;
}
//# sourceMappingURL=ContentValidator.js.map