/**
 * 经验积累 API 路由
 * 低耦合：仅依赖核心 Repository，无其他模块依赖
 */

import { Router, Request, Response } from 'express';
import { ExperienceRepository, experienceRepo } from '../core/ExperienceRepository';

// 创建路由函数，支持传入自定义 repository（用于测试）
export function createExperienceRouter(repo: ExperienceRepository = experienceRepo): Router {
  const router: Router = Router();

  /**
   * GET /experience/stats
   * 获取经验统计
   */
  router.get('/stats', (_req, res) => {
    try {
      const stats = repo.getStats();
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
      const records = repo.getAll();
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
      const record = repo.create(req.body);
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
      const record = repo.getById(req.params.id);
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
      const records = keyword ? repo.search(keyword) : repo.getAll();
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
      const records = repo.getByTag(decodeURIComponent(req.params.tag));
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
      const record = repo.update(req.params.id, req.body);
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
      const success = repo.delete(req.params.id);
      if (!success) {
        return res.status(404).json({ success: false, error: '记录不存在' });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

// 默认导出使用单例实例的路由
export default createExperienceRouter();
