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
 * 集成 memory-lancedb-pro 支持语义检索
 *
 * @module experience-manager
 * @version 1.1.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExperienceRouter = exports.start = exports.createApp = exports.memoryService = exports.MemoryService = exports.experienceRepo = exports.ExperienceRepository = exports.version = void 0;
const app_1 = require("./app");
Object.defineProperty(exports, "createApp", { enumerable: true, get: function () { return app_1.createApp; } });
Object.defineProperty(exports, "start", { enumerable: true, get: function () { return app_1.start; } });
const ExperienceRepository_1 = require("./core/ExperienceRepository");
Object.defineProperty(exports, "ExperienceRepository", { enumerable: true, get: function () { return ExperienceRepository_1.ExperienceRepository; } });
Object.defineProperty(exports, "experienceRepo", { enumerable: true, get: function () { return ExperienceRepository_1.experienceRepo; } });
const MemoryService_1 = require("./core/MemoryService");
Object.defineProperty(exports, "MemoryService", { enumerable: true, get: function () { return MemoryService_1.MemoryService; } });
Object.defineProperty(exports, "memoryService", { enumerable: true, get: function () { return MemoryService_1.memoryService; } });
// 版本信息
exports.version = '1.1.0';
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