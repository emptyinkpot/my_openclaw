/**
 * 经验积累核心模块
 * 高内聚：所有经验相关功能集中于此
 * 自包含：独立数据存储，无外部依赖
 *
 * 集成 memory-lancedb-pro 支持语义检索
 */
export interface ExperienceRecord {
    id: string;
    timestamp: number;
    type: 'problem_solving' | 'feature_dev' | 'bug_fix' | 'optimization' | 'learning' | 'refactoring';
    title: string;
    description: string;
    userQuery: string;
    solution: string;
    experienceApplied: string[];
    experienceGained: string[];
    tags: string[];
    difficulty: 1 | 2 | 3 | 4 | 5;
    xpGained: number;
}
export interface ExperienceStats {
    totalXP: number;
    totalRecords: number;
    typeDistribution: Record<string, number>;
    tagDistribution: Record<string, number>;
    difficultyDistribution: Record<string, number>;
    monthlyGrowth: Array<{
        month: string;
        xp: number;
        count: number;
    }>;
    recentRecords: ExperienceRecord[];
    level: number;
    levelTitle: string;
}
export interface ExperienceData {
    records: ExperienceRecord[];
    version: string;
}
/**
 * 经验仓库类
 * 职责：经验数据的增删改查、统计分析
 */
export declare class ExperienceRepository {
    private data;
    private storagePath;
    constructor(storagePath?: string);
    /**
     * 从文件加载数据
     */
    private load;
    /**
     * 保存数据到文件
     */
    private save;
    /**
     * 创建新记录
     */
    create(record: Omit<ExperienceRecord, 'id' | 'timestamp'>): ExperienceRecord;
    /**
     * 获取所有记录
     */
    getAll(): ExperienceRecord[];
    /**
     * 根据ID获取记录
     */
    getById(id: string): ExperienceRecord | undefined;
    /**
     * 根据标签获取记录
     */
    getByTag(tag: string): ExperienceRecord[];
    /**
     * 搜索记录
     */
    search(keyword: string): ExperienceRecord[];
    /**
     * 语义搜索（通过 memory-lancedb-pro）
     * 使用向量相似度检索相关经验
     */
    semanticSearch(keyword: string, limit?: number): Promise<Array<ExperienceRecord & {
        score?: number;
    }>>;
    /**
     * 获取统计数据
     */
    getStats(): ExperienceStats;
    /**
     * 删除记录
     */
    delete(id: string): boolean;
    /**
     * 更新记录
     */
    update(id: string, updates: Partial<Omit<ExperienceRecord, 'id' | 'timestamp'>>): ExperienceRecord | null;
}
export declare const experienceRepo: ExperienceRepository;
//# sourceMappingURL=ExperienceRepository.d.ts.map