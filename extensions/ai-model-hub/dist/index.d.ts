/**
 * AI模型管理中心 - OpenClaw插件主入口
 *
 * 功能模块：
 * 1. 本地模型部署 (Ollama, vLLM)
 * 2. 模型微调 (Unsloth/PEFT)
 * 3. 代码沙盒安全 (AST + E2B/Local)
 */
import express from 'express';
export interface AIModelHubConfig {
    localModels?: {
        ollama?: {
            enabled: boolean;
            host: string;
            defaultModel: string;
        };
        vllm?: {
            enabled: boolean;
            host: string;
            model?: string;
        };
    };
    fineTuning?: {
        unsloth?: {
            enabled: boolean;
            outputDir: string;
            defaultConfig: {
                r: number;
                loraAlpha: number;
                epochs: number;
            };
        };
    };
    sandbox?: {
        enabled: boolean;
        provider: 'e2b' | 'local' | 'docker';
        astCheck: boolean;
        blockedModules: string[];
    };
}
declare class AIModelHub {
    private app;
    private config;
    private localModelService;
    private fineTuningService;
    private sandboxService;
    constructor(config?: AIModelHubConfig);
    private setupMiddleware;
    private setupRoutes;
    initialize(): Promise<void>;
    getApp(): express.Application;
}
export default AIModelHub;
//# sourceMappingURL=index.d.ts.map