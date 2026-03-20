"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExperienceRouter = exports.start = exports.createApp = exports.searchRelatedExperiences = exports.syncExperienceToMemory = exports.memorySync = exports.experienceRepo = exports.ExperienceRepository = exports.version = void 0;
const app_1 = require("./app");
Object.defineProperty(exports, "createApp", { enumerable: true, get: function () { return app_1.createApp; } });
Object.defineProperty(exports, "start", { enumerable: true, get: function () { return app_1.start; } });
const ExperienceRepository_1 = require("./core/ExperienceRepository");
Object.defineProperty(exports, "ExperienceRepository", { enumerable: true, get: function () { return ExperienceRepository_1.ExperienceRepository; } });
Object.defineProperty(exports, "experienceRepo", { enumerable: true, get: function () { return ExperienceRepository_1.experienceRepo; } });
const MemorySync_1 = require("./core/MemorySync");
Object.defineProperty(exports, "memorySync", { enumerable: true, get: function () { return MemorySync_1.memorySync; } });
Object.defineProperty(exports, "syncExperienceToMemory", { enumerable: true, get: function () { return MemorySync_1.syncExperienceToMemory; } });
Object.defineProperty(exports, "searchRelatedExperiences", { enumerable: true, get: function () { return MemorySync_1.searchRelatedExperiences; } });
// 版本信息
exports.version = '1.0.0';
// 导出路由创建函数
var experience_routes_1 = require("./routes/experience-routes");
Object.defineProperty(exports, "createExperienceRouter", { enumerable: true, get: function () { return experience_routes_1.createExperienceRouter; } });
// 默认导出
exports.default = {
    createApp: app_1.createApp,
    start: app_1.start,
    ExperienceRepository: ExperienceRepository_1.ExperienceRepository,
    experienceRepo: ExperienceRepository_1.experienceRepo,
    version: '1.0.0',
};
if (require.main === module) {
    (0, app_1.start)().catch(err => {
        console.error('[Experience] 启动失败:', err);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map