/**
 * Express 应用创建
 * 自包含：独立的 Express 实例
 */

import express, { Application } from 'express';
import * as path from 'path';
import { createExperienceRouter } from './routes/experience-routes';
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

export function createApp(options: AppOptions = {}): AppResult {
  const port = options.port || parseInt(process.env.EXPERIENCE_PORT || '3002');
  const host = options.host || process.env.EXPERIENCE_HOST || '0.0.0.0';
  const publicPath = options.publicPath || path.join(__dirname, '../public');

  const app = express();

  // 中间件
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // CORS
  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  });

  // API 路由 - 支持传入自定义 repository
  const router = createExperienceRouter(options.repository);
  app.use('/api/experience', router);

  // 静态文件
  app.use('/static', express.static(publicPath));

  // 主页面
  app.get('/', (_req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });

  // 健康检查
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      module: 'experience-manager',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // 错误处理
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Server error:', err);
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    });
  });

  return { app, port, host };
}

export async function start(options: AppOptions = {}) {
  const { app, port, host } = createApp(options);

  return new Promise<void>((resolve, reject) => {
    const server = app.listen(port, host, () => {
      console.log(`[Experience] 服务已启动: http://${host}:${port}`);
      resolve();
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`端口 ${port} 已被占用`));
      } else {
        reject(err);
      }
    });
  });
}
