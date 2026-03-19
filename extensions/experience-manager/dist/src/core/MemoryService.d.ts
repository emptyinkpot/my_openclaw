/**
 * Memory-LanceDB Pro 集成服务
 * 将经验记录同步到向量数据库，支持语义检索
 */
import { ExperienceRecord } from './ExperienceRepository';
interface MemoryRecallResult {
    content: string;
    score: number;
    metadata?: Record<string, any>;
    scope?: string;
    category?: string;
    createdAt?: string;
}
/**
 * Memory 服务类
 * 通过 OpenClaw 工具调用与 memory-lancedb-pro 交互
 */
export declare class MemoryService {
    private static instance;
    private enabled;
    constructor();
    static getInstance(): MemoryService;
    /**
     * 存储经验到 Memory
     */
    storeExperience(exp: ExperienceRecord): Promise<boolean>;
    /**
     * 语义搜索经验
     */
    searchExperiences(query: string, limit?: number): Promise<MemoryRecallResult[]>;
    /**
     * 构建经验内容字符串
     */
    private buildExperienceContent;
    /**
     * HTTP 方式存储（备用）
     */
    private httpStore;
    /**
     * HTTP 方式检索（备用）
     */
    private httpRecall;
    /**
     * 批量同步经验到 Memory
     */
    syncAllExperiences(records: ExperienceRecord[]): Promise<{
        synced: number;
        failed: number;
    }>;
}
export declare const memoryService: MemoryService;
export {};
//# sourceMappingURL=MemoryService.d.ts.map