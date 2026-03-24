/**
 * 笔记管理核心模块
 */

import * as fs from 'fs';
import * as path from 'path';
import { syncNoteToCloud } from './CloudSync';

/**
 * 查找笔记数据文件路径
 */
function findNoteDataPath(): string {
  if (process.env.NOTE_DATA_PATH) {
    return process.env.NOTE_DATA_PATH;
  }
  
  const candidates = [
    path.resolve(__dirname, '../../data/notes.json'),
    path.resolve(__dirname, '../../../data/notes.json'),
    path.resolve(process.cwd(), 'data/notes.json'),
    '/workspace/projects/apps/experience-manager/data/notes.json',
  ];
  
  for (const candidate of candidates) {
    if (fs.existsSync(path.dirname(candidate))) {
      return candidate;
    }
  }
  
  return candidates[0];
}

const DEFAULT_NOTE_STORAGE_PATH = findNoteDataPath();

// 类型定义
export interface NoteRecord {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  summary?: string;
  sections?: Record<string, string>;
  relatedExperienceIds?: string[];
  cloud?: {
    published?: boolean;
    publishedAt?: string;
    lastSyncAt?: string;
    lastSyncStatus?: string;
    remoteId?: string;
  };
}

export interface NoteData {
  notes: NoteRecord[];
  version: string;
}

/**
 * 笔记仓库类
 */
export class NoteRepository {
  private data: NoteData = { notes: [], version: '1.0' };
  private storagePath: string;

  constructor(storagePath?: string) {
    this.storagePath = storagePath || DEFAULT_NOTE_STORAGE_PATH;
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.storagePath)) {
        this.data = JSON.parse(fs.readFileSync(this.storagePath, 'utf-8'));
        // 确保数据结构正确
        if (!this.data.notes) {
          this.data.notes = [];
        }
      }
    } catch (e) {
      console.error('[Note] 加载失败:', e);
      this.data = { notes: [], version: '1.0' };
    }
  }

  private save(): void {
    try {
      fs.mkdirSync(path.dirname(this.storagePath), { recursive: true });
      fs.writeFileSync(this.storagePath, JSON.stringify(this.data, null, 2));
    } catch (e) {
      console.error('[Note] 保存失败:', e);
    }
  }

  create(note: Omit<NoteRecord, 'id' | 'created_at' | 'updated_at'>): NoteRecord {
    const now = new Date().toISOString();
    const newNote: NoteRecord = {
      ...note,
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: now,
      updated_at: now,
    };
    this.data.notes.unshift(newNote);
    this.save();
    syncNoteToCloud(newNote, 'upsert').catch(err => {
      console.warn('[Note] 同步到云端失败:', err.message);
    });
    return newNote;
  }

  getAll(): NoteRecord[] {
    this.load();
    return this.data.notes;
  }

  getById(id: string): NoteRecord | undefined {
    return this.data.notes.find(n => n.id === id);
  }

  getByCategory(category: string): NoteRecord[] {
    return this.data.notes.filter(n => n.category === category);
  }

  getCategories(): string[] {
    const categories = new Set<string>();
    this.data.notes.forEach(n => {
      if (n.category) categories.add(n.category);
    });
    return Array.from(categories);
  }

  search(keyword: string): NoteRecord[] {
    const lower = keyword.toLowerCase();
    return this.data.notes.filter(n =>
      n.title.toLowerCase().includes(lower) ||
      (n.content && n.content.toLowerCase().includes(lower)) ||
      n.tags.some(t => t.toLowerCase().includes(lower))
    );
  }

  update(id: string, updates: Partial<Omit<NoteRecord, 'id' | 'created_at'>>): NoteRecord | null {
    const index = this.data.notes.findIndex(n => n.id === id);
    if (index === -1) return null;
    
    this.data.notes[index] = {
      ...this.data.notes[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.save();
    syncNoteToCloud(this.data.notes[index], 'upsert').catch(err => {
      console.warn('[Note] 更新同步到云端失败:', err.message);
    });
    return this.data.notes[index];
  }

  delete(id: string): boolean {
    const index = this.data.notes.findIndex(n => n.id === id);
    if (index === -1) return false;
    const [removed] = this.data.notes.splice(index, 1);
    this.save();
    if (removed) {
      syncNoteToCloud(removed, 'delete').catch(err => {
        console.warn('[Note] 删除同步到云端失败:', err.message);
      });
    }
    return true;
  }
}

// 导出单例实例
export const noteRepo = new NoteRepository();
