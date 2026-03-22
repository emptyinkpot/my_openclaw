/**
 * 微调训练路由
 */

import { Router } from 'express';
import { FineTuningService } from '../services/FineTuningService';

export class FineTuneRouter {
  private router: Router;
  private service: FineTuningService;

  constructor(service: FineTuningService) {
    this.router = Router();
    this.service = service;
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // 获取支持的预训练模型
    this.router.get('/base-models', (req, res) => {
      const models = this.service.getSupportedBaseModels();
      res.json({ success: true, data: models });
    });

    // 创建训练任务
    this.router.post('/jobs', (req, res) => {
      try {
        const job = this.service.createTrainingJob(req.body);
        res.json({ success: true, data: job });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // 启动训练
    this.router.post('/jobs/:id/start', async (req, res) => {
      try {
        await this.service.startTraining(req.params.id);
        res.json({ success: true, message: '训练已启动' });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // 获取训练任务列表
    this.router.get('/jobs', (req, res) => {
      const jobs = this.service.getJobs();
      res.json({ success: true, data: jobs });
    });

    // 获取训练任务详情
    this.router.get('/jobs/:id', (req, res) => {
      const job = this.service.getJob(req.params.id);
      if (!job) {
        res.status(404).json({ success: false, error: '任务不存在' });
        return;
      }
      res.json({ success: true, data: job });
    });

    // 导出模型
    this.router.post('/jobs/:id/export', async (req, res) => {
      try {
        const { format } = req.body;
        const exportPath = await this.service.exportModel(req.params.id, format);
        res.json({ success: true, data: { path: exportPath } });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
  }

  public getRouter(): Router {
    return this.router;
  }
}
