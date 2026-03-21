/**
 * 小说管理 API 服务
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import { NovelService, NovelStats } from './services/novel-service';
import { getDatabaseManager } from './core/data-scan-storage/database';
import { registerClient } from './core/pipeline/ProgressManager';
import * as path from 'path';

const app = express();
const PORT = parseInt(process.env.NOVEL_API_PORT || '3001', 10);
const API_PREFIX = '/novel/api';

// 中间件
app.use(cors());
app.use(express.json());

// 数据库连接
let dbConnection: any = null;

// 初始化数据库连接
async function initDatabase() {
  try {
    const dbManager = getDatabaseManager();
    dbConnection = dbManager.getConnection();
    console.log('[Database] 连接已准备好');
  } catch (error) {
    console.error('[Database] 初始化失败:', error);
  }
}
initDatabase();

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

// 更新作品
app.put(`${API_PREFIX}/works/:id`, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { title, author, status } = req.body;
    await getNovelService().updateWork(id, { title, author, status });
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

// 番茄账号列表
app.get(`${API_PREFIX}/fanqie/accounts`, async (req: Request, res: Response) => {
  try {
    const { getConfig } = require('./core/config');
    const config = getConfig();
    const accounts = config.scheduler.fanqieAccounts || [];
    res.json({ success: true, data: accounts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 番茄发布（暂时禁用）
/*
app.post(`${API_PREFIX}/fanqie/publish`, async (req: Request, res: Response) => {
  try {
    const result = await getNovelService().startFanqiePublish(req.body);
    res.json({ success: true, message: result.message, note: result.note });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
*/

// ====== 流水线相关API ======
app.post(`${API_PREFIX}/pipeline/start`, async (req: Request, res: Response) => {
  try {
    const result = await getNovelService().startPipeline({
      workId: req.body.workId,
      accountId: req.body.accountId,
      dryRun: req.body.dryRun
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post(`${API_PREFIX}/pipeline/stop`, async (req: Request, res: Response) => {
  try {
    const result = await getNovelService().stopPipeline();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get(`${API_PREFIX}/pipeline/status`, async (req: Request, res: Response) => {
  try {
    const status = await getNovelService().getPipelineStatus();
    res.json({ success: true, data: status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ====== 资源库相关API ======
// 资源库：词汇表
app.get(`${API_PREFIX}/main-library`, async (req: Request, res: Response) => {
  try {
    const [rows] = await dbConnection.execute(`
      SELECT 
        id,
        word AS name,
        category,
        tags,
        example AS example_usage,
        explanation AS description,
        created_at,
        updated_at
      FROM vocabulary
      ORDER BY word ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 资源库：文献
app.get(`${API_PREFIX}/literature`, async (req: Request, res: Response) => {
  try {
    const [rows] = await dbConnection.execute(`
      SELECT 
        id,
        title AS name,
        category,
        tags,
        summary,
        content,
        created_at,
        updated_at
      FROM literature
      ORDER BY title ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 资源库：禁用词
app.get(`${API_PREFIX}/banned-words`, async (req: Request, res: Response) => {
  try {
    const [rows] = await dbConnection.execute(`
      SELECT 
        id,
        word AS name,
        category,
        tags,
        reason,
        replacement,
        created_at,
        updated_at
      FROM banned_words
      ORDER BY word ASC
    `);
    res.json({ success: true, data: rows });
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
  
  console.log('[SSE] ====== 收到连接请求 ======');
  console.log('[SSE] progressId:', progressId);
  console.log('[SSE] token:', token ? '***' : 'undefined');
  console.log('[SSE] Headers:', JSON.stringify(req.headers, null, 2));
  
  // 验证 token
  const validToken = 'e1647cdb-1b80-4eee-a975-7599160cc89b';
  if (token !== validToken) {
    console.log('[SSE] Token 验证失败！');
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  
  console.log('[SSE] Token 验证通过！');
  console.log('[SSE] 客户端连接:', progressId);
  
  // 设置 SSE 响应头
  console.log('[SSE] 设置响应头...');
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
  
  // 立即发送连接确认消息
  console.log('[SSE] 发送连接确认消息...');
  const connectMsg = `data: ${JSON.stringify({ status: 'connected', message: 'SSE连接已建立', progressId })}\n\n`;
  console.log('[SSE] 发送消息:', connectMsg);
  res.write(connectMsg);
  
  console.log('[SSE] 注册客户端...');
  // 注册客户端
  const unregister = registerClient(progressId, (data: string) => {
    console.log('[SSE] 准备发送数据:', data);
    try {
      res.write(data);
      console.log('[SSE] 数据发送成功！');
    } catch (e) {
      console.error('[SSE] 写入失败:', e);
    }
  });
  
  console.log('[SSE] 客户端注册完成！');
  
  // 心跳保活
  console.log('[SSE] 启动心跳定时器...');
  const heartbeat = setInterval(() => {
    try {
      console.log('[SSE] 发送心跳...');
      res.write(': heartbeat\n\n');
    } catch (e) {
      console.log('[SSE] 心跳发送失败，清理连接...');
      clearInterval(heartbeat);
      unregister();
    }
  }, 15000);
  
  // 连接关闭时清理
  req.on('close', () => {
    console.log('[SSE] ====== 客户端断开 ======');
    console.log('[SSE] progressId:', progressId);
    clearInterval(heartbeat);
    unregister();
  });
  
  req.on('error', (err) => {
    console.log('[SSE] ====== 请求错误 ======');
    console.error('[SSE] error:', err);
  });
  
  console.log('[SSE] ====== SSE 连接处理完成 ======');
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

// 获取后端日志
app.get(`${API_PREFIX}/logs`, async (req: Request, res: Response) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const logPath = '/tmp/novel-api.log';
    
    // 读取日志文件的最后 500 行
    if (fs.existsSync(logPath)) {
      const content = fs.readFileSync(logPath, 'utf-8');
      const lines = content.split('\n');
      const lastLines = lines.slice(-500).join('\n');
      res.json({ success: true, data: lastLines });
    } else {
      res.json({ success: true, data: '日志文件不存在' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== 资源库 API ==========
// 获取词汇
app.get(`${API_PREFIX}/main-library`, async (req: Request, res: Response) => {
  try {
    const db = getDatabaseManager();
    const items = await db.query('SELECT * FROM vocabulary ORDER BY created_at ASC');
    
    const formattedItems = items.map((item: any) => ({
      id: `vocab-${item.id}`,
      content: item.content,
      type: item.type,
      category: item.category,
      createdAt: new Date(item.created_at).getTime(),
    }));
    
    res.json({ success: true, items: formattedItems });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 获取文献
app.get(`${API_PREFIX}/literature`, async (req: Request, res: Response) => {
  try {
    const db = getDatabaseManager();
    const items = await db.query('SELECT * FROM literature ORDER BY priority DESC, created_at DESC');
    
    const formattedItems = items.map((item: any) => ({
      id: `lit-${item.id}`,
      type: 'content',
      title: item.title,
      content: item.content || undefined,
      author: item.author || undefined,
      tags: item.tags ? JSON.parse(item.tags) : undefined,
      priority: item.priority || 0,
      note: item.note || undefined,
      createdAt: new Date(item.created_at).getTime(),
      updatedAt: item.updated_at ? new Date(item.updated_at).getTime() : undefined,
    }));
    
    res.json({ success: true, items: formattedItems });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 获取禁用词
app.get(`${API_PREFIX}/banned-words`, async (req: Request, res: Response) => {
  try {
    const db = getDatabaseManager();
    const items = await db.query('SELECT * FROM banned_words ORDER BY created_at ASC');
    
    const formattedItems = items.map((item: any) => ({
      id: `banned-${item.id}`,
      content: item.content,
      type: item.type,
      category: item.category,
      reason: item.reason || '',
      alternative: item.alternative || undefined,
      createdAt: new Date(item.created_at).getTime(),
      updatedAt: item.updated_at ? new Date(item.updated_at).getTime() : undefined,
    }));
    
    res.json({ success: true, items: formattedItems });
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
  app.use('/novel', express.static(path.join(__dirname, '..', '..', 'public')));
}

// 启动服务
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`小说管理 API 服务已启动: http://0.0.0.0:${PORT}${API_PREFIX}`);
  });
}

export default app;
