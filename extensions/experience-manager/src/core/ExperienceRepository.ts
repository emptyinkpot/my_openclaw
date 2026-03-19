/**
 * 经验积累核心模块
 * 高内聚：所有经验相关功能集中于此
 * 自包含：独立数据存储，无外部依赖
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * 查找数据文件路径 - 支持多种运行环境
 * 经验：不要依赖 __dirname 或 cwd，使用明确的查找逻辑
 */
function findDataPath(): string {
  // 1. 优先使用环境变量
  if (process.env.EXPERIENCE_DATA_PATH) {
    return process.env.EXPERIENCE_DATA_PATH;
  }
  
  // 2. 尝试多个候选路径
  const candidates = [
    // 从源码目录计算
    path.resolve(__dirname, '../../data/experiences.json'),
    // 从编译后目录计算 (dist/src/core -> dist/data)
    path.resolve(__dirname, '../../../data/experiences.json'),
    // 基于 cwd 计算（如果从模块根目录启动）
    path.resolve(process.cwd(), 'data/experiences.json'),
    // 绝对路径（最终保底）
    '/workspace/projects/apps/experience-manager/data/experiences.json',
  ];
  
  // 返回第一个存在的路径，或默认路径
  for (const candidate of candidates) {
    if (fs.existsSync(path.dirname(candidate))) {
      return candidate;
    }
  }
  
  // 默认使用第一个候选路径
  return candidates[0];
}

// 数据存储路径
const DEFAULT_STORAGE_PATH = findDataPath();

// 类型定义
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

/**
 * 经验仓库类
 * 职责：经验数据的增删改查、统计分析
 */
export class ExperienceRepository {
  private data: ExperienceData = { records: [], version: '1.0' };
  private storagePath: string;

  constructor(storagePath?: string) {
    this.storagePath = storagePath || DEFAULT_STORAGE_PATH;
    this.load();
  }

  /**
   * 从文件加载数据
   */
  private load(): void {
    try {
      if (fs.existsSync(this.storagePath)) {
        this.data = JSON.parse(fs.readFileSync(this.storagePath, 'utf-8'));
      }
    } catch (e) {
      console.error('[Experience] 加载失败:', e);
      this.data = { records: [], version: '1.0' };
    }
  }

  /**
   * 保存数据到文件
   */
  private save(): void {
    try {
      fs.mkdirSync(path.dirname(this.storagePath), { recursive: true });
      fs.writeFileSync(this.storagePath, JSON.stringify(this.data, null, 2));
    } catch (e) {
      console.error('[Experience] 保存失败:', e);
    }
  }

  /**
   * 创建新记录
   */
  create(record: Omit<ExperienceRecord, 'id' | 'timestamp'>): ExperienceRecord {
    const newRecord: ExperienceRecord = {
      ...record,
      id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    this.data.records.unshift(newRecord);
    this.save();
    return newRecord;
  }

  /**
   * 获取所有记录
   */
  getAll(): ExperienceRecord[] {
    this.load(); // 每次都重新加载，确保数据最新
    return this.data.records;
  }

  /**
   * 根据ID获取记录
   */
  getById(id: string): ExperienceRecord | undefined {
    return this.data.records.find(r => r.id === id);
  }

  /**
   * 根据标签获取记录
   */
  getByTag(tag: string): ExperienceRecord[] {
    return this.data.records.filter(r => r.tags.includes(tag));
  }

  /**
   * 搜索记录
   */
  search(keyword: string): ExperienceRecord[] {
    const lower = keyword.toLowerCase();
    return this.data.records.filter(r =>
      r.title.toLowerCase().includes(lower) ||
      r.description.toLowerCase().includes(lower) ||
      r.userQuery.toLowerCase().includes(lower) ||
      r.tags.some(t => t.toLowerCase().includes(lower))
    );
  }

  /**
   * 获取统计数据
   */
  getStats(): ExperienceStats {
    this.load(); // 每次都重新加载，确保数据最新
    const records = this.data.records;
    const totalXP = records.reduce((sum, r) => sum + r.xpGained, 0);
    
    // 类型分布
    const typeDistribution: Record<string, number> = {};
    records.forEach(r => {
      typeDistribution[r.type] = (typeDistribution[r.type] || 0) + 1;
    });

    // 标签分布
    const tagDistribution: Record<string, number> = {};
    records.forEach(r => {
      r.tags.forEach(tag => {
        tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
      });
    });

    // 难度分布
    const difficultyDistribution: Record<string, number> = {};
    records.forEach(r => {
      difficultyDistribution[r.difficulty] = (difficultyDistribution[r.difficulty] || 0) + 1;
    });

    // 月度增长
    const monthlyMap = new Map<string, { xp: number; count: number }>();
    records.forEach(r => {
      const date = new Date(r.timestamp);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const current = monthlyMap.get(month) || { xp: 0, count: 0 };
      monthlyMap.set(month, { xp: current.xp + r.xpGained, count: current.count + 1 });
    });
    const monthlyGrowth = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);

    // 等级计算
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

  /**
   * 删除记录
   */
  delete(id: string): boolean {
    const index = this.data.records.findIndex(r => r.id === id);
    if (index === -1) return false;
    this.data.records.splice(index, 1);
    this.save();
    return true;
  }

  /**
   * 更新记录
   */
  update(id: string, updates: Partial<Omit<ExperienceRecord, 'id' | 'timestamp'>>): ExperienceRecord | null {
    const index = this.data.records.findIndex(r => r.id === id);
    if (index === -1) return null;
    
    this.data.records[index] = { ...this.data.records[index], ...updates };
    this.save();
    return this.data.records[index];
  }
}

// 导出单例实例
export const experienceRepo = new ExperienceRepository();
