import express from 'express';
import * as path from 'path';
import { createExperienceRouter } from './routes/experience-routes';
import { ExperienceRepository } from '../core/ExperienceRepository';
import { NoteRepository } from '../core/NoteRepository';

export interface AppOptions {
  port?: number;
  host?: string;
  publicPath?: string;
  repository?: ExperienceRepository;
  noteRepository?: NoteRepository;
}

export interface AppResult {
  app: express.Application;
  port: number;
  host: string;
}

export function createApp(options: AppOptions = {}): AppResult {
  const port = options.port || Number.parseInt(process.env.EXPERIENCE_PORT || '3002', 10);
  const host = options.host || process.env.EXPERIENCE_HOST || '0.0.0.0';
  const publicPath = options.publicPath || path.join(__dirname, '../frontend/pages/experience');

  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  });

  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }

    next();
  });

  app.get('/api/experience/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        module: 'experience-manager',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.use(
    '/api/experience',
    createExperienceRouter(options.repository, options.noteRepository)
  );

  app.use('/static', express.static(publicPath));

  app.get('/', (_req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      module: 'experience-manager',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[experience-manager] server error:', err);
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
      console.log(`[experience-manager] listening on http://${host}:${port}`);
      resolve();
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`端口 ${port} 已被占用`));
        return;
      }

      reject(err);
    });
  });
}
