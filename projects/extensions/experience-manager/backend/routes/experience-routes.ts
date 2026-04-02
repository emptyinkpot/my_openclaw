import * as fs from 'fs';
import * as path from 'path';
import { Router } from 'express';
import { ExperienceRepository, experienceRepo } from '../../core/ExperienceRepository';
import { NoteRepository, noteRepo } from '../../core/NoteRepository';
import { getCloudSyncStatus, syncAllToCloud } from '../../core/CloudSync';

function loadColumnsData(): any[] {
  const candidates = [
    path.resolve(__dirname, '..', '..', 'data', 'columns.json'),
    path.resolve(__dirname, '..', '..', '..', 'data', 'columns.json'),
  ];

  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) {
        continue;
      }

      const raw = fs.readFileSync(candidate, 'utf-8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.columns) ? parsed.columns : [];
    } catch (error) {
      console.error('[experience-manager] 加载专栏数据失败:', candidate, error);
    }
  }

  return [];
}

export function createExperienceRouter(
  expRepo: ExperienceRepository = experienceRepo,
  notesRepo: NoteRepository = noteRepo
): Router {
  const router = Router();

  router.use(async (_req, _res, next) => {
    try {
      await Promise.all([expRepo.waitReady(), notesRepo.waitReady()]);
      next();
    } catch (error) {
      next(error);
    }
  });

  router.get('/stats', (_req, res) => {
    try {
      res.json({ success: true, data: expRepo.getStats() });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/records', (_req, res) => {
    try {
      res.json({ success: true, data: expRepo.getAll() });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/records', async (req, res) => {
    try {
      const record = await expRepo.create(req.body);
      res.json({ success: true, data: record });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.get('/records/:id', (req, res) => {
    try {
      const record = expRepo.getById(req.params.id);
      if (!record) {
        res.status(404).json({ success: false, error: '记录不存在' });
        return;
      }

      res.json({ success: true, data: record });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.put('/records/:id', async (req, res) => {
    try {
      const record = await expRepo.update(req.params.id, req.body);
      if (!record) {
        res.status(404).json({ success: false, error: '记录不存在' });
        return;
      }

      res.json({ success: true, data: record });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/records/:id', async (req, res) => {
    try {
      const success = await expRepo.delete(req.params.id);
      if (!success) {
        res.status(404).json({ success: false, error: '记录不存在' });
        return;
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/search', (req, res) => {
    try {
      const keyword = String(req.query.q || '');
      const records = keyword ? expRepo.search(keyword) : expRepo.getAll();
      res.json({ success: true, data: records });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/tag/:tag', (req, res) => {
    try {
      res.json({ success: true, data: expRepo.getByTag(decodeURIComponent(req.params.tag)) });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/columns', (_req, res) => {
    try {
      res.json({ success: true, data: loadColumnsData() });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/notes', (_req, res) => {
    try {
      res.json({ success: true, data: notesRepo.getAll() });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/notes/categories', (_req, res) => {
    try {
      res.json({ success: true, data: notesRepo.getCategories() });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/notes', async (req, res) => {
    try {
      const note = await notesRepo.create(req.body);
      res.json({ success: true, data: note });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.get('/notes/:id', (req, res) => {
    try {
      const note = notesRepo.getById(req.params.id);
      if (!note) {
        res.status(404).json({ success: false, error: '笔记不存在' });
        return;
      }

      res.json({ success: true, data: note });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.put('/notes/:id', async (req, res) => {
    try {
      const note = await notesRepo.update(req.params.id, req.body);
      if (!note) {
        res.status(404).json({ success: false, error: '笔记不存在' });
        return;
      }

      res.json({ success: true, data: note });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/notes/:id', async (req, res) => {
    try {
      const success = await notesRepo.delete(req.params.id);
      if (!success) {
        res.status(404).json({ success: false, error: '笔记不存在' });
        return;
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/cloud/status', (_req, res) => {
    try {
      res.json({ success: true, data: getCloudSyncStatus() });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

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

export default createExperienceRouter();
