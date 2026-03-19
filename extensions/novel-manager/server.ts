/**
 * 小说管理 API 服务
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import { NovelService, NovelStats } from './services/novel-service';
import { getDatabaseManager } from './core/database';
import * as path from 'path';

const app = express();
const PORT = process.env.NOVEL_API_PORT || 3001;
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
