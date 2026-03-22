/**
 * AI模型管理中心 - OpenClaw插件主入口
 * 
 * 功能模块：
 * 1. 本地模型部署 (Ollama, vLLM)
 * 2. 模型微调 (Unsloth/PEFT)
 * 3. 代码沙盒安全 (AST + E2B/Local)
 */

import express from 'express';
import path from 'path';
import { LocalModelService } from './services/LocalModelService';
import { FineTuningService } from './services/FineTuningService';
import { SandboxService } from './services/SandboxService';
import { ModelRouter } from './routes/model';
import { FineTuneRouter } from './routes/finetune';
import { SandboxRouter } from './routes/sandbox';

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

class AIModelHub {
  private app: express.Application;
  private config: AIModelHubConfig;
  private localModelService: LocalModelService;
  private fineTuningService: FineTuningService;
  private sandboxService: SandboxService;

  constructor(config: AIModelHubConfig = {}) {
    this.config = config;
    this.app = express();
    this.localModelService = new LocalModelService(config.localModels);
    this.fineTuningService = new FineTuningService(config.fineTuning);
    this.sandboxService = new SandboxService(config.sandbox);
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json({ limit: '100mb' }));
    this.app.use(express.static(path.join(__dirname, '../public')));
  }

  private setupRoutes(): void {
    // API路由
    this.app.use('/api/models', new ModelRouter(this.localModelService).getRouter());
    this.app.use('/api/finetune', new FineTuneRouter(this.fineTuningService).getRouter());
    this.app.use('/api/sandbox', new SandboxRouter(this.sandboxService).getRouter());

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
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });
  }

  public async initialize(): Promise<void> {
    console.log('🚀 初始化AI模型管理中心...');
    
    // 初始化各服务
    await this.localModelService.initialize();
    await this.fineTuningService.initialize();
    await this.sandboxService.initialize();
    
    console.log('✅ AI模型管理中心初始化完成');
  }

  public getApp(): express.Application {
    return this.app;
  }
}

// OpenClaw插件导出
export default AIModelHub;

// 如果使用独立运行
if (require.main === module) {
  const config: AIModelHubConfig = {
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
