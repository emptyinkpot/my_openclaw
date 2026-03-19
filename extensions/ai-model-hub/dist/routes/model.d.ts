/**
 * 模型管理路由
 */
import { Router } from 'express';
import { LocalModelService } from '../services/LocalModelService';
export declare class ModelRouter {
    private router;
    private service;
    constructor(service: LocalModelService);
    private setupRoutes;
    getRouter(): Router;
}
//# sourceMappingURL=model.d.ts.map