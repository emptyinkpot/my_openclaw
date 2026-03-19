/**
 * 内容验证器
 * 检查章节内容是否符合润色网站要求
 */
import { ValidationRules } from './PolishFeatureDetector';
export interface ContentIssue {
    type: string;
    message: string;
    line?: number;
    severity: 'error' | 'warning';
}
export interface ValidationResult {
    valid: boolean;
    issues: ContentIssue[];
    cleaned: string;
    stats: {
        originalLength: number;
        cleanedLength: number;
        removedChars: number;
    };
}
export declare class ContentValidator {
    private rules;
    constructor(rules: ValidationRules);
    validate(content: string): ValidationResult;
    clean(content: string): string;
    quickCheck(content: string): boolean;
}
/**
 * 增强版内容清理函数
 */
export declare function cleanContentEnhanced(content: string, options?: {
    removeMarkdown?: boolean;
    normalizeQuotes?: boolean;
    removeParentheses?: boolean;
    maxLength?: number;
}): string;
//# sourceMappingURL=ContentValidator.d.ts.map