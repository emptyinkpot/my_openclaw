/**
 * Express 应用创建
 * 自包含：独立的 Express 实例
 */
import express from 'express';
import { ExperienceRepository } from './core/ExperienceRepository';
export interface AppOptions {
    port?: number;
    host?: string;
    publicPath?: string;
    repository?: ExperienceRepository;
}
export interface AppResult {
    app: express.Application;
    port: number;
    host: string;
}
export declare function createApp(options?: AppOptions): AppResult;
export declare function start(options?: AppOptions): Promise<void>;
//# sourceMappingURL=app.d.ts.map