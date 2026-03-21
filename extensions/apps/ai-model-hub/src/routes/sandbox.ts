/**
 * 沙盒安全路由
 */

import { Router } from 'express';
import { SandboxService } from '../services/SandboxService';

export class SandboxRouter {
  private router: Router;
  private service: SandboxService;

  constructor(service: SandboxService) {
    this.router = Router();
    this.service = service;
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // 分析代码
    this.router.post('/analyze', async (req, res) => {
      try {
        const { code, language } = req.body;
        
        let result;
        if (language === 'python') {
          result = await this.service.analyzePythonCode(code);
        } else {
          result = this.service.analyzeJavaScriptCode(code);
        }
        
        res.json({ success: true, data: result });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // 执行代码
    this.router.post('/execute', async (req, res) => {
      try {
        const { code, language, timeout } = req.body;
        const result = await this.service.executeCode(code, language, timeout);
        res.json({ success: true, data: result });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // 获取配置
    this.router.get('/config', (req, res) => {
      res.json({ success: true, data: this.service.getConfig() });
    });

    // 更新配置
    this.router.post('/config', (req, res) => {
      this.service.updateConfig(req.body);
      res.json({ success: true, message: '配置已更新' });
    });
  }

  public getRouter(): Router {
    return this.router;
  }
}
