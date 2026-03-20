/**
 * 经验同步到 memory-lancedb-pro
 *
 * 职责：将 experience-manager 的结构化经验同步到 memory-lancedb-pro
 * 使 AI Agent 可以通过语义搜索找到相关经验
 *
 * 设计原则：
 * - 单向同步：experience-manager → memory-lancedb-pro
 * - 失败不阻塞：同步失败不影响经验记录的主流程
 * - 可配置：可通过环境变量关闭同步
 *
 * 当前实现：由于 memory-lancedb-pro 的工具 API 不直接暴露给 HTTP，
 * 使用文件系统作为中间存储，等待后续集成语义搜索能力。
 */
import type { ExperienceRecord } from './ExperienceRepository';
/**
 * 将经验同步到 memory-lancedb-pro
 *
 * 当前实现：由于 memory-lancedb-pro 的工具 API 不直接暴露给 HTTP，
 * 我们使用文件系统作为中间存储，后续可以通过 Agent 会话调用 memory 工具
 */
export declare function syncExperienceToMemory(record: ExperienceRecord): Promise<boolean>;
/**
 * 批量同步经验
 */
export declare function syncAllExperiences(records: ExperienceRecord[]): Promise<number>;
/**
 * 检索相关经验
 * 当前实现：从同步队列文件中进行简单文本匹配
 * TODO: 集成 memory-lancedb-pro 的语义搜索能力
 */
export declare function searchRelatedExperiences(query: string, limit?: number): Promise<Array<{
    text: string;
    score: number;
    metadata?: any;
}>>;
export declare const memorySync: {
    sync: typeof syncExperienceToMemory;
    syncAll: typeof syncAllExperiences;
    search: typeof searchRelatedExperiences;
    enabled: boolean;
};
//# sourceMappingURL=MemorySync.d.ts.map