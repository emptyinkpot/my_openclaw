/**
 * 经验积累模块 - 统一入口
 *
 * 设计原则：
 * - 高内聚：所有经验相关功能集中于此
 * - 低耦合：通过标准API接口与外部交互
 * - 自包含：独立的依赖、配置、数据存储
 * - 模块化：可独立运行、独立部署
 *
 * 职责说明：
 * - 本模块负责结构化记录问题解决经验
 * - memory-lancedb-pro 负责 AI Agent 的自动学习和记忆
 * - 通过 MemorySync 实现单向联动（experience → memory-lancedb-pro）
 *
 * @module experience-manager
 * @version 1.0.0
 */
import { createApp, start } from './app';
import { ExperienceRepository, experienceRepo } from './core/ExperienceRepository';
import { memorySync, syncExperienceToMemory, searchRelatedExperiences } from './core/MemorySync';
export declare const version = "1.0.0";
export { ExperienceRepository, experienceRepo };
export { memorySync, syncExperienceToMemory, searchRelatedExperiences };
export type { ExperienceRecord, ExperienceStats, ExperienceData } from './core/ExperienceRepository';
export { createApp, start };
export { createExperienceRouter } from './routes/experience-routes';
declare const _default: {
    createApp: typeof createApp;
    start: typeof start;
    ExperienceRepository: typeof ExperienceRepository;
    experienceRepo: ExperienceRepository;
    version: string;
};
export default _default;
//# sourceMappingURL=index.d.ts.map