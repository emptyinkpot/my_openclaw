/**
 * 小说管理 API 服务
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import { NovelService, NovelStats } from './services/novel-service';
import { getDatabaseManager } from './core/database';
import { registerClient } from './core/pipeline/ProgressManager';
import * as path from 'path';

const app = express();
const PORT = parseInt(process.env.NOVEL_API_PORT || '3001', 10);
const API_PREFIX = '/novel/api';

// 中间件
app.use(cors());
app.use(express.json());

// 服务实例
let novelService: NovelService | null = null;

function getNovelService(): NovelService {
  if (!novelService) {
    novelService = new NovelService();
  }
  return novelService;
}

// 统计数据
app.get(`${API_PREFIX}/stats`, async (req: Request, res: Response) => {
  try {
    const stats = await getNovelService().getStats();
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 作品列表
app.get(`${API_PREFIX}/works`, async (req: Request, res: Response) => {
  try {
    const filter = {
      status: req.query.status as string,
      platform: req.query.platform as string,
      search: req.query.search as string,
    };
    const works = await getNovelService().getWorks(filter);
    res.json({ success: true, data: works });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 作品详情
app.get(`${API_PREFIX}/works/:id`, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const work = await getNovelService().getWorkById(id);
    if (!work) {
      return res.status(404).json({ success: false, error: '作品不存在' });
    }
    res.json({ success: true, data: work });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 删除作品
app.delete(`${API_PREFIX}/works/:id`, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await getNovelService().deleteWork(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 更新章节
app.put(`${API_PREFIX}/chapters/:id`, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    await getNovelService().updateChapter(id, data);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 根据卷纲生成章节
app.post(`${API_PREFIX}/works/:id/generate-chapters-from-volumes`, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const result = await getNovelService().generateChaptersFromVolumes(id);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 番茄作品列表
app.get(`${API_PREFIX}/fanqie/works`, async (req: Request, res: Response) => {
  try {
    const works = await getNovelService().getFanqieWorks();
    res.json({ success: true, data: works });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 番茄发布
app.post(`${API_PREFIX}/fanqie/publish`, async (req: Request, res: Response) => {
  try {
    const result = await getNovelService().startFanqiePublish(req.body);
    res.json({ success: true, message: result.message, note: result.note });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 一键发布下一章（直接运行脚本）
app.post(`${API_PREFIX}/fanqie/publish-next`, async (req: Request, res: Response) => {
  try {
    const { workId = 7, headless = false } = req.body;
    
    // 用子进程执行脚本
    const { spawn } = require('child_process');
    const path = require('path');
    
    const scriptPath = path.join(__dirname, '..', '..', 'run-publish.js');
    
    // 响应先返回
    res.json({ success: true, message: '发布脚本已启动', workId, headless });
    
    // 后台执行脚本
    const child = spawn('node', [scriptPath], {
      cwd: '/workspace/projects',
      env: { ...process.env, WORK_ID: String(workId), HEADLESS: String(headless) },
      stdio: 'inherit'
    });
    
    child.on('error', (err: Error) => {
      console.error('[PublishNext] 脚本执行错误:', err);
    });
    
    child.on('close', (code: number) => {
      console.log(`[PublishNext] 脚本执行完成，退出码: ${code}`);
    });
    
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 经验记录列表
app.get(`${API_PREFIX}/experience/records`, async (req: Request, res: Response) => {
  try {
    const records = await getNovelService().getExperienceRecords();
    res.json({ success: true, data: records });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 添加经验记录
app.post(`${API_PREFIX}/experience/records`, async (req: Request, res: Response) => {
  try {
    const record = await getNovelService().addExperienceRecord(req.body);
    res.json({ success: true, data: record });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 缓存文件列表
app.get(`${API_PREFIX}/cache/files`, async (req: Request, res: Response) => {
  try {
    const files = await getNovelService().getCacheFiles();
    res.json({ success: true, data: files });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// SSE 端点 - 进度推送
app.get('/novel/sse/progress/:progressId', async (req: Request, res: Response) => {
  const { progressId } = req.params;
  const token = req.query.token as string;
  
  // 验证 token
  const validToken = 'e1647cdb-1b80-4eee-a975-7599160cc89b';
  if (token !== validToken) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  
  console.log('[SSE] 客户端连接:', progressId);
  
  // 设置 SSE 响应头
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
  
  // 立即发送连接确认消息
  res.write(`data: ${JSON.stringify({ status: 'connected', message: 'SSE连接已建立', progressId })}\n\n`);
  
  // 注册客户端
  const unregister = registerClient(progressId, (data: string) => {
    try {
      res.write(data);
    } catch (e) {
      console.error('[SSE] 写入失败:', e);
    }
  });
  
  // 心跳保活
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch (e) {
      clearInterval(heartbeat);
      unregister();
    }
  }, 15000);
  
  // 连接关闭时清理
  req.on('close', () => {
    console.log('[SSE] 客户端断开:', progressId);
    clearInterval(heartbeat);
    unregister();
  });
});

// 获取缓存文件内容
app.get(`${API_PREFIX}/cache/files/:name`, async (req: Request, res: Response) => {
  try {
    const content = await getNovelService().getCacheFileContent(req.params.name);
    res.json({ success: true, data: content });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 保存缓存文件
app.put(`${API_PREFIX}/cache/files/:name`, async (req: Request, res: Response) => {
  try {
    await getNovelService().saveCacheFileContent(req.params.name, req.body.content);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 静态文件服务（开发模式）
if (process.env.NODE_ENV !== 'production') {
  app.use('/novel', express.static(path.join(__dirname, 'public')));
}

// 启动服务
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`小说管理 API 服务已启动: http://0.0.0.0:${PORT}${API_PREFIX}`);
  });
}

export default app;
