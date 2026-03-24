/**
 * 经验积累 API 路由
 * 低耦合：仅依赖核心 Repository，无其他模块依赖
 */

import { Router, Request, Response } from 'express';
import { ExperienceRepository, experienceRepo } from '../core/ExperienceRepository';
import { NoteRepository, noteRepo } from '../core/NoteRepository';
import { getCloudSyncStatus, syncAllToCloud } from '../core/CloudSync';

// 创建路由函数，支持传入自定义 repository（用于测试）
export function createExperienceRouter(
  expRepo: ExperienceRepository = experienceRepo,
  notesRepo: NoteRepository = noteRepo
): Router {
  const router: Router = Router();

  /**
   * GET /experience/stats
   * 获取经验统计
   */
  router.get('/stats', (_req, res) => {
    try {
      const stats = expRepo.getStats();
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /experience/records
   * 获取所有经验记录
   */
  router.get('/records', (_req, res) => {
    try {
      const records = expRepo.getAll();
      res.json({ success: true, data: records });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /experience/records
   * 创建新经验记录
   */
  router.post('/records', (req, res) => {
    try {
      const record = expRepo.create(req.body);
      res.json({ success: true, data: record });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /experience/records/:id
   * 获取单条记录
   */
  router.get('/records/:id', (req, res) => {
    try {
      const record = expRepo.getById(req.params.id);
      if (!record) {
        return res.status(404).json({ success: false, error: '记录不存在' });
      }
      res.json({ success: true, data: record });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /experience/search?q=keyword
   * 搜索经验记录
   */
  router.get('/search', (req, res) => {
    try {
      const keyword = req.query.q as string || '';
      const records = keyword ? expRepo.search(keyword) : expRepo.getAll();
      res.json({ success: true, data: records });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /experience/tag/:tag
   * 按标签获取记录
   */
  router.get('/tag/:tag', (req, res) => {
    try {
      const records = expRepo.getByTag(decodeURIComponent(req.params.tag));
      res.json({ success: true, data: records });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * PUT /experience/records/:id
   * 更新记录
   */
  router.put('/records/:id', (req, res) => {
    try {
      const record = expRepo.update(req.params.id, req.body);
      if (!record) {
        return res.status(404).json({ success: false, error: '记录不存在' });
      }
      res.json({ success: true, data: record });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  /**
   * DELETE /experience/records/:id
   * 删除记录
   */
  router.delete('/records/:id', (req, res) => {
    try {
      const success = expRepo.delete(req.params.id);
      if (!success) {
        return res.status(404).json({ success: false, error: '记录不存在' });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ========== 笔记相关 API ==========

  /**
   * GET /experience/notes
   * 获取所有笔记
   */
  router.get('/notes', (_req, res) => {
    try {
      const notes = notesRepo.getAll();
      res.json({ success: true, data: notes });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /experience/notes/categories
   * 获取笔记分类
   */
  router.get('/notes/categories', (_req, res) => {
    try {
      const categories = notesRepo.getCategories();
      res.json({ success: true, data: categories });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /experience/notes
   * 创建新笔记
   */
  router.post('/notes', (req, res) => {
    try {
      const note = notesRepo.create(req.body);
      res.json({ success: true, data: note });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /experience/notes/:id
   * 获取单条笔记
   */
  router.get('/notes/:id', (req, res) => {
    try {
      const note = notesRepo.getById(req.params.id);
      if (!note) {
        return res.status(404).json({ success: false, error: '笔记不存在' });
      }
      res.json({ success: true, data: note });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * PUT /experience/notes/:id
   * 更新笔记
   */
  router.put('/notes/:id', (req, res) => {
    try {
      const note = notesRepo.update(req.params.id, req.body);
      if (!note) {
        return res.status(404).json({ success: false, error: '笔记不存在' });
      }
      res.json({ success: true, data: note });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  /**
   * DELETE /experience/notes/:id
   * 删除笔记
   */
  router.delete('/notes/:id', (req, res) => {
    try {
      const success = notesRepo.delete(req.params.id);
      if (!success) {
        return res.status(404).json({ success: false, error: '笔记不存在' });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /experience/cloud/status
   * 鑾峰彇浜戝悓姝ョ姸鎬?
   */
  router.get('/cloud/status', (_req, res) => {
    try {
      res.json({ success: true, data: getCloudSyncStatus() });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /experience/cloud/sync
   * 鎵嬪姩鍚屾鍒?cloud
   */
  router.post('/cloud/sync', async (req, res) => {
    try {
      const scope = String(req.body?.scope || 'all').toLowerCase();
      const includeExperiences = scope === 'all' || scope === 'experiences' || scope === 'records';
      const includeNotes = scope === 'all' || scope === 'notes';

      const result = await syncAllToCloud({
        experiences: includeExperiences ? expRepo.getAll() : [],
        notes: includeNotes ? notesRepo.getAll() : [],
      });

      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

// 默认导出使用单例实例的路由
export default createExperienceRouter();
