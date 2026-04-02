/**
 * 经验积累核心仓库
 * 当前模式：云端主存
 * - 读写直接落到云端 MySQL
 * - 本地 JSON 只在首次迁移时读取一次，迁移完成后删除
 */

import { syncExperienceToMemory } from './MemorySync';
import {
  bootstrapCloudExperiences,
  deleteCloudExperience,
  upsertCloudExperience,
} from './CloudStore';

export interface ExperienceRecord {
  id: string;
  timestamp: number;
  type: 'problem_solving' | 'feature_dev' | 'bug_fix' | 'optimization' | 'learning' | 'refactoring';
  title: string;
  description: string;
  userQuery: string;
  solution: string;
  experienceApplied: string[];
  experienceGained: string[];
  tags: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  xpGained: number;
  summary?: string;
  rootCause?: string;
  verification?: string[];
  source?: {
    project?: string;
    branch?: string;
    file?: string;
    url?: string;
  };
  cloud?: {
    published?: boolean;
    publishedAt?: string;
    lastSyncAt?: string;
    lastSyncStatus?: string;
    remoteId?: string;
  };
}

export interface ExperienceStats {
  totalXP: number;
  totalRecords: number;
  typeDistribution: Record<string, number>;
  tagDistribution: Record<string, number>;
  difficultyDistribution: Record<string, number>;
  monthlyGrowth: Array<{ month: string; xp: number; count: number }>;
  recentRecords: ExperienceRecord[];
  level: number;
  levelTitle: string;
}

export interface ExperienceData {
  records: ExperienceRecord[];
  version: string;
}

export class ExperienceRepository {
  private data: ExperienceData = { records: [], version: '1.0' };
  private bootstrapPromise: Promise<void>;

  constructor() {
    this.bootstrapPromise = this.bootstrap();
  }

  async waitReady(): Promise<void> {
    await this.bootstrapPromise;
  }

  private async bootstrap(): Promise<void> {
    const result = await bootstrapCloudExperiences();
    this.data = {
      records: Array.isArray(result.records) ? result.records : [],
      version: '1.0',
    };
  }

  getAll(): ExperienceRecord[] {
    return [...this.data.records];
  }

  getById(id: string): ExperienceRecord | undefined {
    return this.data.records.find(r => r.id === id);
  }

  getByTag(tag: string): ExperienceRecord[] {
    return this.data.records.filter(r => r.tags.includes(tag));
  }

  search(keyword: string): ExperienceRecord[] {
    const lower = keyword.toLowerCase();
    return this.data.records.filter(r =>
      r.title.toLowerCase().includes(lower) ||
      r.description.toLowerCase().includes(lower) ||
      r.userQuery.toLowerCase().includes(lower) ||
      r.tags.some(t => t.toLowerCase().includes(lower))
    );
  }

  getStats(): ExperienceStats {
    const records = this.data.records || [];
    const totalXP = records.reduce((sum, r) => sum + (r.xpGained || 0), 0);

    const typeDistribution: Record<string, number> = {};
    records.forEach(r => {
      if (r.type) typeDistribution[r.type] = (typeDistribution[r.type] || 0) + 1;
    });

    const tagDistribution: Record<string, number> = {};
    records.forEach(r => {
      if (r.tags && Array.isArray(r.tags)) {
        r.tags.forEach(tag => {
          tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
        });
      }
    });

    const difficultyDistribution: Record<string, number> = {};
    records.forEach(r => {
      if (r.difficulty) {
        difficultyDistribution[String(r.difficulty)] = (difficultyDistribution[String(r.difficulty)] || 0) + 1;
      }
    });

    const monthlyMap = new Map<string, { xp: number; count: number }>();
    records.forEach(r => {
      if (r.timestamp) {
        const date = new Date(r.timestamp);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const current = monthlyMap.get(month) || { xp: 0, count: 0 };
        monthlyMap.set(month, { xp: current.xp + (r.xpGained || 0), count: current.count + 1 });
      }
    });
    const monthlyGrowth = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);

    const level = Math.floor(totalXP / 1000) + 1;
    const levelTitles = ['新手', '学徒', '助手', '专家', '大师', '宗师', '传奇'];
    const levelTitle = levelTitles[Math.min(level - 1, levelTitles.length - 1)];

    return {
      totalXP,
      totalRecords: records.length,
      typeDistribution,
      tagDistribution,
      difficultyDistribution,
      monthlyGrowth,
      recentRecords: records.slice(0, 10),
      level,
      levelTitle,
    };
  }

  async create(record: Omit<ExperienceRecord, 'id' | 'timestamp'>): Promise<ExperienceRecord> {
    await this.waitReady();
    const newRecord: ExperienceRecord = {
      ...record,
      id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    await upsertCloudExperience(newRecord);
    this.data.records.unshift(newRecord);

    syncExperienceToMemory(newRecord).catch(err => {
      console.warn('[Experience] 同步到 memory-lancedb-pro 失败:', err.message);
    });

    return newRecord;
  }

  async update(id: string, updates: Partial<Omit<ExperienceRecord, 'id' | 'timestamp'>>): Promise<ExperienceRecord | null> {
    await this.waitReady();
    const index = this.data.records.findIndex(r => r.id === id);
    if (index === -1) return null;

    const updated = { ...this.data.records[index], ...updates };
    await upsertCloudExperience(updated);
    this.data.records[index] = updated;
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    await this.waitReady();
    const index = this.data.records.findIndex(r => r.id === id);
    if (index === -1) return false;

    const [removed] = this.data.records.splice(index, 1);
    await deleteCloudExperience(id);

    if (removed) {
      syncExperienceToMemory(removed).catch(err => {
        console.warn('[Experience] 删除后同步 memory-lancedb-pro 失败:', err.message);
      });
    }

    return true;
  }
}

export const experienceRepo = new ExperienceRepository();
