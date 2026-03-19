"use strict";
/**
 * AI模型管理中心 - OpenClaw插件主入口
 *
 * 功能模块：
 * 1. 本地模型部署 (Ollama, vLLM)
 * 2. 模型微调 (Unsloth/PEFT)
 * 3. 代码沙盒安全 (AST + E2B/Local)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const LocalModelService_1 = require("./services/LocalModelService");
const FineTuningService_1 = require("./services/FineTuningService");
const SandboxService_1 = require("./services/SandboxService");
const model_1 = require("./routes/model");
const finetune_1 = require("./routes/finetune");
const sandbox_1 = require("./routes/sandbox");
class AIModelHub {
    app;
    config;
    localModelService;
    fineTuningService;
    sandboxService;
    constructor(config = {}) {
        this.config = config;
        this.app = (0, express_1.default)();
        this.localModelService = new LocalModelService_1.LocalModelService(config.localModels);
        this.fineTuningService = new FineTuningService_1.FineTuningService(config.fineTuning);
        this.sandboxService = new SandboxService_1.SandboxService(config.sandbox);
        this.setupMiddleware();
        this.setupRoutes();
    }
    setupMiddleware() {
        this.app.use(express_1.default.json({ limit: '100mb' }));
        this.app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
    }
    setupRoutes() {
        // API路由
        this.app.use('/api/models', new model_1.ModelRouter(this.localModelService).getRouter());
        this.app.use('/api/finetune', new finetune_1.FineTuneRouter(this.fineTuningService).getRouter());
        this.app.use('/api/sandbox', new sandbox_1.SandboxRouter(this.sandboxService).getRouter());
        // 健康检查
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                services: {
                    ollama: this.localModelService.isOllamaReady(),
                    vllm: this.localModelService.isVLLMReady(),
                    unsloth: this.fineTuningService.getReadyState(),
                    sandbox: this.sandboxService.getReadyState()
                }
            });
        });
        // 配置信息
        this.app.get('/api/config', (req, res) => {
            res.json({
                localModels: this.config.localModels,
                fineTuning: this.config.fineTuning,
                sandbox: this.config.sandbox
            });
        });
        // 主页面
        this.app.get('/', (req, res) => {
            res.sendFile(path_1.default.join(__dirname, '../public/index.html'));
        });
    }
    async initialize() {
        console.log('🚀 初始化AI模型管理中心...');
        // 初始化各服务
        await this.localModelService.initialize();
        await this.fineTuningService.initialize();
        await this.sandboxService.initialize();
        console.log('✅ AI模型管理中心初始化完成');
    }
    getApp() {
        return this.app;
    }
}
// OpenClaw插件导出
exports.default = AIModelHub;
// 如果使用独立运行
if (require.main === module) {
    const config = {
        localModels: {
            ollama: {
                enabled: true,
                host: process.env.OLLAMA_HOST || 'http://localhost:11434',
                defaultModel: 'llama3.2'
            },
            vllm: {
                enabled: false,
                host: process.env.VLLM_HOST || 'http://localhost:8000'
            }
        },
        fineTuning: {
            unsloth: {
                enabled: false,
                outputDir: './models/fine-tuned',
                defaultConfig: {
                    r: 16,
                    loraAlpha: 16,
                    epochs: 3
                }
            }
        },
        sandbox: {
            enabled: true,
            provider: 'local',
            astCheck: true,
            blockedModules: ['os', 'subprocess', 'socket', 'requests']
        }
    };
    const hub = new AIModelHub(config);
    hub.initialize().then(() => {
        const port = parseInt(process.env.PORT || '5100');
        const host = process.env.HOST || '0.0.0.0';
        hub.getApp().listen(port, host, () => {
            console.log(`🎯 AI模型管理中心运行在 http://${host}:${port}`);
        });
    });
}
//# sourceMappingURL=index.js.map