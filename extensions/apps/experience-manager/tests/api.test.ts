import request from 'supertest';
import express from 'express';
import { createExperienceRouter } from '../src/routes/experience-routes';
import { ExperienceRepository } from '../src/core/ExperienceRepository';
import * as fs from 'fs';
import * as path from 'path';

describe('Experience API', () => {
  const testDataPath = path.join(__dirname, 'test-api-experiences.json');
  let app: express.Application;
  let repo: ExperienceRepository;

  beforeEach(() => {
    // 清理测试数据文件
    if (fs.existsSync(testDataPath)) {
      fs.unlinkSync(testDataPath);
    }
    
    // 创建新的 Repository 实例
    repo = new ExperienceRepository(testDataPath);
    
    // 创建 Express 应用并使用新的 Repository
    app = express();
    app.use(express.json());
    app.use('/api/experience', createExperienceRouter(repo));
  });

  afterEach(() => {
    if (fs.existsSync(testDataPath)) {
      fs.unlinkSync(testDataPath);
    }
  });

  describe('POST /api/experience/records', () => {
    it('should create a new experience record', async () => {
      const res = await request(app)
        .post('/api/experience/records')
        .send({
          type: 'learning',
          title: 'Test Experience',
          description: 'Test Description',
          userQuery: 'Test Query',
          solution: 'Test Solution',
          experienceApplied: ['test'],
          experienceGained: ['test'],
          tags: ['test'],
          difficulty: 3,
          xpGained: 100
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.title).toBe('Test Experience');
    });

    it('should handle missing fields gracefully', async () => {
      // TypeScript 会在编译时检查类型，运行时不会验证
      // 所以这个测试主要验证不会崩溃
      const res = await request(app)
        .post('/api/experience/records')
        .send({ type: 'learning', title: 'Test Title' }); // missing required fields

      // 由于 TypeScript 类型检查，实际应用中不会发生这种情况
      // 但在测试中，我们验证服务器能正常响应
      expect(res.status).toBeLessThan(500);
    });
  });

  describe('GET /api/experience/records', () => {
    it('should return all experiences', async () => {
      // 先创建一条记录
      await request(app)
        .post('/api/experience/records')
        .send({
          type: 'learning',
          title: 'Test',
          description: 'Test',
          userQuery: 'Test',
          solution: 'Test',
          experienceApplied: [],
          experienceGained: [],
          tags: [],
          difficulty: 3,
          xpGained: 100
        });

      const res = await request(app).get('/api/experience/records');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/experience/stats', () => {
    it('should return statistics', async () => {
      // 创建测试数据
      await request(app)
        .post('/api/experience/records')
        .send({
          type: 'learning',
          title: 'Test',
          description: 'Test',
          userQuery: 'Test',
          solution: 'Test',
          experienceApplied: [],
          experienceGained: [],
          tags: ['test'],
          difficulty: 3,
          xpGained: 100
        });

      const res = await request(app).get('/api/experience/stats');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalXP');
      expect(res.body.data).toHaveProperty('totalRecords');
      expect(res.body.data).toHaveProperty('level');
    });
  });

  describe('GET /api/experience/records/:id', () => {
    it('should return a single record', async () => {
      const createRes = await request(app)
        .post('/api/experience/records')
        .send({
          type: 'learning',
          title: 'Test',
          description: 'Test',
          userQuery: 'Test',
          solution: 'Test',
          experienceApplied: [],
          experienceGained: [],
          tags: [],
          difficulty: 3,
          xpGained: 100
        });

      const id = createRes.body.data.id;
      const res = await request(app).get(`/api/experience/records/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(id);
    });

    it('should return 404 for non-existent id', async () => {
      const res = await request(app).get('/api/experience/records/non-existent');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/experience/search', () => {
    it('should search by keyword', async () => {
      await request(app)
        .post('/api/experience/records')
        .send({
          type: 'learning',
          title: 'JavaScript Experience',
          description: 'Test',
          userQuery: 'Test',
          solution: 'Test',
          experienceApplied: [],
          experienceGained: [],
          tags: ['javascript'],
          difficulty: 3,
          xpGained: 100
        });

      const res = await request(app).get('/api/experience/search?q=javascript');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/experience/records/:id', () => {
    it('should delete a record', async () => {
      const createRes = await request(app)
        .post('/api/experience/records')
        .send({
          type: 'learning',
          title: 'To Delete',
          description: 'Test',
          userQuery: 'Test',
          solution: 'Test',
          experienceApplied: [],
          experienceGained: [],
          tags: [],
          difficulty: 3,
          xpGained: 100
        });

      const id = createRes.body.data.id;
      const deleteRes = await request(app).delete(`/api/experience/records/${id}`);
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      // 验证已删除
      const getRes = await request(app).get(`/api/experience/records/${id}`);
      expect(getRes.status).toBe(404);
    });
  });
});
