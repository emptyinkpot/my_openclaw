import { ExperienceRepository, ExperienceRecord } from '../src/core/ExperienceRepository';
import * as fs from 'fs';
import * as path from 'path';

describe('ExperienceRepository', () => {
  const testDataPath = path.join(__dirname, 'test-experiences.json');
  let repo: ExperienceRepository;

  beforeEach(() => {
    // 清理测试数据文件
    if (fs.existsSync(testDataPath)) {
      fs.unlinkSync(testDataPath);
    }
    repo = new ExperienceRepository(testDataPath);
  });

  afterEach(() => {
    if (fs.existsSync(testDataPath)) {
      fs.unlinkSync(testDataPath);
    }
  });

  describe('create', () => {
    it('should create a new experience record', () => {
      const record = repo.create({
        type: 'learning',
        title: 'Test Title',
        description: 'Test Description',
        userQuery: 'Test Query',
        solution: 'Test Solution',
        experienceApplied: ['test'],
        experienceGained: ['test'],
        tags: ['test'],
        difficulty: 3,
        xpGained: 100
      });

      expect(record).toHaveProperty('id');
      expect(record).toHaveProperty('timestamp');
      expect(record.type).toBe('learning');
      expect(record.title).toBe('Test Title');
      expect(record.xpGained).toBe(100);
    });
  });

  describe('getAll', () => {
    it('should return all records', () => {
      repo.create({
        type: 'learning',
        title: 'Record A',
        description: 'Description A',
        userQuery: 'Query A',
        solution: 'Solution A',
        experienceApplied: [],
        experienceGained: [],
        tags: [],
        difficulty: 3,
        xpGained: 100
      });
      repo.create({
        type: 'problem_solving',
        title: 'Record B',
        description: 'Description B',
        userQuery: 'Query B',
        solution: 'Solution B',
        experienceApplied: [],
        experienceGained: [],
        tags: [],
        difficulty: 4,
        xpGained: 150
      });

      const all = repo.getAll();
      expect(all).toHaveLength(2);
    });
  });

  describe('getById', () => {
    it('should return record by id', () => {
      const created = repo.create({
        type: 'learning',
        title: 'Test Record',
        description: 'Test Description',
        userQuery: 'Test Query',
        solution: 'Test Solution',
        experienceApplied: [],
        experienceGained: [],
        tags: ['test'],
        difficulty: 3,
        xpGained: 100
      });

      const found = repo.getById(created.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('should return undefined for non-existent id', () => {
      const found = repo.getById('non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('getByTag', () => {
    it('should return records by tag', () => {
      repo.create({
        type: 'learning',
        title: 'Record with tag1',
        description: 'Description',
        userQuery: 'Query',
        solution: 'Solution',
        experienceApplied: [],
        experienceGained: [],
        tags: ['tag1'],
        difficulty: 3,
        xpGained: 100
      });
      repo.create({
        type: 'problem_solving',
        title: 'Record with tag2',
        description: 'Description',
        userQuery: 'Query',
        solution: 'Solution',
        experienceApplied: [],
        experienceGained: [],
        tags: ['tag2'],
        difficulty: 4,
        xpGained: 150
      });

      const tag1Records = repo.getByTag('tag1');
      expect(tag1Records).toHaveLength(1);
      expect(tag1Records[0].tags).toContain('tag1');
    });
  });

  describe('search', () => {
    it('should search by keyword', () => {
      repo.create({
        type: 'learning',
        title: 'JavaScript Tips',
        description: 'Description',
        userQuery: 'Query',
        solution: 'Solution',
        experienceApplied: [],
        experienceGained: [],
        tags: ['javascript'],
        difficulty: 3,
        xpGained: 100
      });
      repo.create({
        type: 'problem_solving',
        title: 'Python Tips',
        description: 'Description',
        userQuery: 'Query',
        solution: 'Solution',
        experienceApplied: [],
        experienceGained: [],
        tags: ['python'],
        difficulty: 4,
        xpGained: 150
      });

      const jsRecords = repo.search('javascript');
      expect(jsRecords).toHaveLength(1);
      expect(jsRecords[0].tags).toContain('javascript');
    });
  });

  describe('update', () => {
    it('should update a record', () => {
      const created = repo.create({
        type: 'learning',
        title: 'Original Title',
        description: 'Description',
        userQuery: 'Query',
        solution: 'Solution',
        experienceApplied: [],
        experienceGained: [],
        tags: [],
        difficulty: 3,
        xpGained: 100
      });

      const updated = repo.update(created.id, { title: 'Updated Title' });
      expect(updated).toBeDefined();
      expect(updated?.title).toBe('Updated Title');
    });

    it('should return null for non-existent id', () => {
      const updated = repo.update('non-existent-id', { title: 'Updated' });
      expect(updated).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a record', () => {
      const created = repo.create({
        type: 'learning',
        title: 'To Delete',
        description: 'Description',
        userQuery: 'Query',
        solution: 'Solution',
        experienceApplied: [],
        experienceGained: [],
        tags: [],
        difficulty: 3,
        xpGained: 100
      });

      const deleted = repo.delete(created.id);
      expect(deleted).toBe(true);
      expect(repo.getById(created.id)).toBeUndefined();
    });

    it('should return false for non-existent id', () => {
      const deleted = repo.delete('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return correct stats', () => {
      repo.create({
        type: 'learning',
        title: 'Record 1',
        description: 'Description',
        userQuery: 'Query',
        solution: 'Solution',
        experienceApplied: [],
        experienceGained: [],
        tags: ['tag1'],
        difficulty: 3,
        xpGained: 100
      });
      repo.create({
        type: 'problem_solving',
        title: 'Record 2',
        description: 'Description',
        userQuery: 'Query',
        solution: 'Solution',
        experienceApplied: [],
        experienceGained: [],
        tags: ['tag2'],
        difficulty: 4,
        xpGained: 200
      });

      const stats = repo.getStats();
      expect(stats.totalRecords).toBe(2);
      expect(stats.totalXP).toBe(300);
      expect(stats.level).toBe(1);
      expect(stats.typeDistribution.learning).toBe(1);
      expect(stats.typeDistribution.problem_solving).toBe(1);
    });
  });
});
