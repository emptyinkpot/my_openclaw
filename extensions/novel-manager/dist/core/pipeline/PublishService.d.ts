/**
 * 发布服务
 * 处理小说内容发布到各种平台
 */
export interface PlatformConfig {
    name: string;
    type: 'fanqie' | 'other';
    clientId: string;
    clientSecret: string;
    baseUrl?: string;
}
export interface PublishOptions {
    workId: number;
    chapterNumber: number;
    platform: string;
    dryRun?: boolean;
    headless?: boolean;
    skipValidation?: boolean;
}
export interface PublishResult {
    success: boolean;
    platform: string;
    chapterNumber: number;
    publishedAt?: string;
    url?: string;
    error?: string;
    retryable?: boolean;
}
export declare class PublishService {
    private platforms;
    private db;
    constructor();
    private loadPlatformsFromConfig;
    registerPlatform(config: PlatformConfig): void;
    getPlatforms(): PlatformConfig[];
    publish(options: PublishOptions): Promise<PublishResult>;
    protected doPublish(chapter: any, options: PublishOptions): Promise<PublishResult>;
    private publishToFanqie;
    batchPublish(workId: number, chapterNumbers: number[], platform: string): Promise<PublishResult[]>;
    private isRetryableError;
    getPublishStats(workId: number): Promise<{
        total: number;
        published: number;
        pending: number;
    }>;
}
//# sourceMappingURL=PublishService.d.ts.map