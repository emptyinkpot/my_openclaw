/**
 * 作品到番茄账号的自动匹配器
 * 根据作品标题自动匹配对应的番茄账号
 */
export interface FanqieAccount {
    id: string;
    name: string;
    browserDir: string;
    cookiesFile: string;
}
export interface WorkAccountMatch {
    workTitle: string;
    accountId: string;
    accountName: string;
    confidence: number;
}
export declare class AccountMatcher {
    private static instance;
    private workToAccountCache;
    static getInstance(): AccountMatcher;
    /**
     * 根据作品标题自动匹配对应的番茄账号
     *
     * 策略：
     * 1. 先查缓存
     * 2. 如果缓存没有，扫描所有账号的作品列表进行匹配
     * 3. 返回匹配度最高的账号
     */
    matchAccountForWork(workTitle: string): Promise<FanqieAccount | null>;
    /**
     * 计算两个标题的匹配分数（0-1）
     */
    private calculateMatchScore;
    /**
     * 清空缓存
     */
    clearCache(): void;
}
export declare function getAccountMatcher(): AccountMatcher;
