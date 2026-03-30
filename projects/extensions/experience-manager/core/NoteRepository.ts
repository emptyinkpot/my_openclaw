/**
 * 笔记管理核心仓库
 * 当前模式：云端主存
 */

import { bootstrapCloudNotes, deleteCloudNote, upsertCloudNote } from './CloudStore';

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

export class NoteRepository {
  private data: NoteData = { notes: [], version: '1.0' };
  private bootstrapPromise: Promise<void>;

  constructor() {
    this.bootstrapPromise = this.bootstrap();
  }

  async waitReady(): Promise<void> {
    await this.bootstrapPromise;
  }

  private async bootstrap(): Promise<void> {
    const result = await bootstrapCloudNotes();
    this.data = {
      notes: Array.isArray(result.notes) ? result.notes : [],
      version: '1.0',
    };
  }

  getAll(): NoteRecord[] {
    return [...this.data.notes];
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

  async create(note: Omit<NoteRecord, 'id' | 'created_at' | 'updated_at'>): Promise<NoteRecord> {
    await this.waitReady();
    const now = new Date().toISOString();
    const newNote: NoteRecord = {
      ...note,
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: now,
      updated_at: now,
    };

    await upsertCloudNote(newNote);
    this.data.notes.unshift(newNote);
    return newNote;
  }

  async update(id: string, updates: Partial<Omit<NoteRecord, 'id' | 'created_at'>>): Promise<NoteRecord | null> {
    await this.waitReady();
    const index = this.data.notes.findIndex(n => n.id === id);
    if (index === -1) return null;

    const updated = {
      ...this.data.notes[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    await upsertCloudNote(updated);
    this.data.notes[index] = updated;
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    await this.waitReady();
    const index = this.data.notes.findIndex(n => n.id === id);
    if (index === -1) return false;

    const [removed] = this.data.notes.splice(index, 1);
    await deleteCloudNote(id);
    return Boolean(removed);
  }
}

export const noteRepo = new NoteRepository();
