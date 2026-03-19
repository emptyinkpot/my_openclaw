/**
 * 润色特征检测器
 * 动态感知润色网站的配置和规则
 */
export interface PolishFeatures {
    disableMarkdown: boolean;
    useJapanesePunctuation: boolean;
    disableParentheses: boolean;
    styleMode: 'classical' | 'modern' | 'mixed';
    perspectiveMode: 'first-person' | 'third-person-limited' | 'third-person-omniscient';
    _raw?: any;
}
export interface ValidationRules {
    forbiddenFormats: Array<{
        pattern: RegExp;
        type: string;
        severity: 'error' | 'warning';
    }>;
    convertFormats: Array<{
        pattern: RegExp;
        to: string;
        type: string;
        condition?: (match: string) => boolean;
    }>;
    allowedSymbols: string[];
}
export interface DetectorOptions {
    polishSiteUrl?: string;
    cacheTimeout?: number;
}
export declare class PolishFeatureDetector {
    private options;
    private cache;
    private readonly defaultFeatures;
    private readonly featureMapping;
    constructor(options?: DetectorOptions);
    setFeatures(features: Partial<PolishFeatures>): PolishFeatures;
    getFeatures(): PolishFeatures;
    detectFromContent(content: string): PolishFeatures;
    private parseFeatures;
    generateValidationRules(features: PolishFeatures): ValidationRules;
    getFeatureDescription(features: PolishFeatures): string;
}
//# sourceMappingURL=PolishFeatureDetector.d.ts.map