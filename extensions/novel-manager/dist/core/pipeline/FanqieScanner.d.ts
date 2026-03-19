/**
 * 番茄作品扫描器
 * 使用 Playwright 扫描番茄作者后台的作品列表
 */
export interface ScanResult {
    success: boolean;
    works: ScannedWork[];
    error?: string;
}
export interface ScannedWork {
    workId: string;
    title: string;
    status: string;
    totalChapters: number;
    wordCount: string;
    accountId: string;
    accountName: string;
    chapterManageUrl?: string;
}
export interface ScanProgress {
    status: 'idle' | 'scanning' | 'completed' | 'error';
    message: string;
    accountId?: string;
    worksFound: number;
}
export interface ScanOptions {
    accountId?: string;
    headed?: boolean;
    onProgress?: (progress: ScanProgress) => void;
}
/**
 * 番茄作品扫描器
 */
export declare class FanqieScanner {
    private config;
    /**
     * 扫描番茄作品列表
     */
    scan(options?: ScanOptions): Promise<ScanResult>;
    /**
     * 扫描单个账号
     */
    private scanAccount;
    /**
     * 清理浏览器锁文件
     */
    private cleanBrowserLocks;
    /**
     * 保存扫描结果到缓存
     */
    private saveCache;
    /**
     * 读取缓存
     */
    readCache(accountId?: string): ScannedWork[];
}
export declare function getFanqieScanner(): FanqieScanner;
//# sourceMappingURL=FanqieScanner.d.ts.map