/**
 * 沙盒安全路由
 */
import { Router } from 'express';
import { SandboxService } from '../services/SandboxService';
export declare class SandboxRouter {
    private router;
    private service;
    constructor(service: SandboxService);
    private setupRoutes;
    getRouter(): Router;
}
//# sourceMappingURL=sandbox.d.ts.map