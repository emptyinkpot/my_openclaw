/**
 * 微调训练路由
 */
import { Router } from 'express';
import { FineTuningService } from '../services/FineTuningService';
export declare class FineTuneRouter {
    private router;
    private service;
    constructor(service: FineTuningService);
    private setupRoutes;
    getRouter(): Router;
}
//# sourceMappingURL=finetune.d.ts.map