/**
 * 经验积累模块 - 统一入口
 * 
 * 设计原则：
 * - 高内聚：所有经验相关功能集中于此
 * - 低耦合：通过标准API接口与外部交互
 * - 自包含：独立的依赖、配置、数据存储
 * - 模块化：可独立运行、独立部署
 * 
 * 集成 memory-lancedb-pro 支持语义检索
 * 
 * @module experience-manager
 * @version 1.1.0
 */

import { createApp, start } from './app';
import { ExperienceRepository, experienceRepo } from './core/ExperienceRepository';
import { MemoryService, memoryService } from './core/MemoryService';

// 版本信息
export const version = '1.1.0';

// 导出核心功能
export { ExperienceRepository, experienceRepo, MemoryService, memoryService };
export type { 
  ExperienceRecord, 
  ExperienceStats, 
  ExperienceData 
} from './core/ExperienceRepository';

// 导出应用创建函数
export { createApp, start };

// 导出路由创建函数
export { createExperienceRouter } from './routes/experience-routes';

// 默认导出
export default {
  createApp,
  start,
  ExperienceRepository,
  experienceRepo,
  version: '1.0.0',
};

if (require.main === module) {
  start().catch(err => {
    console.error('[Experience] 启动失败:', err);
    process.exit(1);
  });
}
