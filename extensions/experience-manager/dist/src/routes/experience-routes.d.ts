/**
 * 经验积累 API 路由
 * 低耦合：仅依赖核心 Repository，无其他模块依赖
 */
import { Router } from 'express';
import { ExperienceRepository } from '../core/ExperienceRepository';
export declare function createExperienceRouter(repo?: ExperienceRepository): Router;
declare const _default: Router;
export default _default;
//# sourceMappingURL=experience-routes.d.ts.map