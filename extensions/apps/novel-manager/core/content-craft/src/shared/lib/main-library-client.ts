/**
 * ============================================================================
 * 主库存储管理 - 支持 Supabase 云端持久化
 * ============================================================================
 * 统一的词汇主库，包含系统预设 + 用户添加的词汇
 * 系统预设词汇不可删除，用户词汇可自由管理
 * 
 * 存储策略：
 * 1. Supabase 作为主要存储（云端持久化）
 * 2. localStorage 作为备份和离线支持
 * 3. 浏览器端通过 API 路由与 Supabase 交互
 */

import type { ResourceItem } from "@/types";
import { PRESET_VOCABULARY, VOCABULARY_CATEGORIES } from "@/lib/preset-vocabulary";

// ============================================================================
// 常量
// ============================================================================

const MAIN_LIBRARY_KEY = "main-vocabulary-library";
const MIGRATION_KEY = "main-library-migrated";
const LIBRARY_VERSION = 2;

// ============================================================================
// 类型定义
// ============================================================================

interface MainLibraryData {
  version: number;
  lastUpdated: number;
  userItems: ResourceItem[];
  hiddenSystemItems: string[];
}

interface ApiResponse<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

// ============================================================================
// API 客户端
// ============================================================================

const Api = {
  /** 获取所有可见词汇 */
  getAll: async (): Promise<ResourceItem[]> => {
    try {
      const response = await fetch('/api/main-library');
      const data: ApiResponse<{ items: ResourceItem[] }> = await response.json();
      return data.success && data.data?.items ? data.data.items : [];
    } catch {
      return [];
    }
  },
  
  /** 获取隐藏的系统词汇 */
  getHidden: async (): Promise<ResourceItem[]> => {
    try {
      const response = await fetch('/api/main-library?action=hidden');
      const data: ApiResponse<{ items: ResourceItem[] }> = await response.json();
      return data.success && data.data?.items ? data.data.items : [];
    } catch {
      return [];
    }
  },
  
  /** 获取统计信息 */
  getStats: async () => {
    try {
      const response = await fetch('/api/main-library?action=stats');
      const data: ApiResponse<{ stats: {
        systemCount: number;
        visibleSystemCount: number;
        hiddenSystemCount: number;
        userCount: number;
        totalCount: number;
      }}> = await response.json();
      return data.success && data.data?.stats ? data.data.stats : null;
    } catch {
      return null;
    }
  },
  
  /** 批量添加词汇 */
  addItems: async (items: ResourceItem[]): Promise<boolean> => {
    try {
      const response = await fetch('/api/main-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', items }),
      });
      const data: ApiResponse = await response.json();
      return data.success;
    } catch {
      return false;
    }
  },
  
  /** 批量检查重复 */
  checkDuplicates: async (contents: string[]): Promise<Map<string, boolean>> => {
    const result = new Map<string, boolean>();
    try {
      const response = await fetch('/api/main-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check-duplicates', contents }),
      });
      const data: ApiResponse<{ duplicates: Record<string, boolean> }> = await response.json();
      if (data.success && data.data?.duplicates) {
        for (const [key, value] of Object.entries(data.data.duplicates)) {
          result.set(key, value);
        }
      }
    } catch {
      // 返回空 Map
    }
    return result;
  },
  
  /** 去重 */
  deduplicate: async (): Promise<{ removed: number; message: string }> => {
    try {
      const response = await fetch('/api/main-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deduplicate' }),
      });
      const data: ApiResponse<{ removed: number; message: string }> = await response.json();
      return data.success && data.data ? data.data : { removed: 0, message: '去重失败' };
    } catch {
      return { removed: 0, message: '去重操作失败' };
    }
  },
  
  /** 编辑词汇 */
  editItem: async (id: string, updates: { content?: string; category?: string }): Promise<boolean> => {
    try {
      const response = await fetch('/api/main-library', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit', id, ...updates }),
      });
      const data: ApiResponse = await response.json();
      return data.success;
    } catch {
      return false;
    }
  },
  
  /** 恢复隐藏的系统词汇 */
  restore: async (original: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/main-library', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', original }),
      });
      const data: ApiResponse = await response.json();
      return data.success;
    } catch {
      return false;
    }
  },
  
  /** 删除词汇 */
  deleteItem: async (id: string, content: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/main-library?id=${encodeURIComponent(id)}&content=${encodeURIComponent(content)}`, {
        method: 'DELETE',
      });
      const data: ApiResponse = await response.json();
      return data.success;
    } catch {
      return false;
    }
  },
};

// ============================================================================
// 本地存储操作（作为备份）
// ============================================================================

const LocalStorage = {
  get: function(): MainLibraryData {
    const defaultData: MainLibraryData = {
      version: LIBRARY_VERSION,
      lastUpdated: Date.now(),
      userItems: [],
      hiddenSystemItems: []
    };
    
    if (typeof window === "undefined") return defaultData;
    
    try {
      const saved = localStorage.getItem(MAIN_LIBRARY_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        return { ...defaultData, ...data };
      }
    } catch {
      console.error("Failed to load main library from localStorage");
    }
    
    return defaultData;
  },
  
  save: function(data: MainLibraryData) {
    if (typeof window === "undefined") return;
    
    try {
      localStorage.setItem(MAIN_LIBRARY_KEY, JSON.stringify({
        ...data,
        lastUpdated: Date.now()
      }));
    } catch {
      console.error("Failed to save main library to localStorage");
    }
  },
  
  clear: function() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(MAIN_LIBRARY_KEY);
  },
  
  isMigrated: function(): boolean {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(MIGRATION_KEY) === "true";
  },
  
  setMigrated: function() {
    if (typeof window === "undefined") return;
    localStorage.setItem(MIGRATION_KEY, "true");
  }
};

// ============================================================================
// 去重功能
// ============================================================================

/** 去重主库中的重复词汇 */
export async function deduplicateLibrary(): Promise<{ 
  removed: number; 
  message: string 
}> {
  return await Api.deduplicate();
}

/** 检查词汇是否已存在 */
export async function checkDuplicate(content: string): Promise<boolean> {
  const result = await Api.checkDuplicates([content]);
  return result.get(content) || false;
}

/** 批量检查重复 */
export async function batchCheckDuplicates(contents: string[]): Promise<Map<string, boolean>> {
  return await Api.checkDuplicates(contents);
}

// ============================================================================
// 主库操作函数（支持云端存储）
// ============================================================================

/** 获取完整主库（从云端） */
export async function getMainLibraryAsync(): Promise<ResourceItem[]> {
  return await Api.getAll();
}

/** 获取主库统计（从云端） */
export async function getMainLibraryStatsAsync() {
  const stats = await Api.getStats();
  
  if (!stats) {
    return getMainLibraryStats(); // 回退到本地
  }
  
  // 获取分类统计
  const items = await Api.getAll();
  const categoryStats: Record<string, number> = {};
  items.forEach(item => {
    categoryStats[item.category] = (categoryStats[item.category] || 0) + 1;
  });
  
  return {
    ...stats,
    categoryStats,
    lastUpdated: Date.now()
  };
}

/** 添加用户词汇（到云端） */
export async function addUserItemsAsync(items: Omit<ResourceItem, "id" | "createdAt">[]): Promise<number> {
  const now = Date.now();
  const newItems: ResourceItem[] = items.map(item => ({
    ...item,
    id: `user-${now}-${Math.random().toString(36).slice(2)}`,
    createdAt: now
  }));
  
  const success = await Api.addItems(newItems);
  return success ? items.length : 0;
}

/** 删除词汇（从云端） */
export async function removeItemAsync(item: ResourceItem): Promise<boolean> {
  return await Api.deleteItem(item.id, item.content);
}

/** 恢复隐藏的系统词汇（在云端） */
export async function restoreSystemItemAsync(content: string): Promise<boolean> {
  return await Api.restore(content);
}

/** 获取隐藏的系统词汇列表（从云端） */
export async function getHiddenSystemItemsAsync(): Promise<ResourceItem[]> {
  return await Api.getHidden();
}

/** 编辑用户词汇（在云端） */
export async function editUserItemAsync(id: string, updates: Partial<ResourceItem>): Promise<boolean> {
  return await Api.editItem(id, {
    content: updates.content,
    category: updates.category
  });
}

/** 重置主库（清除用户词汇，恢复隐藏的系统词汇） */
export async function resetMainLibraryAsync(): Promise<boolean> {
  // 获取所有隐藏的系统词汇并恢复
  const hidden = await Api.getHidden();
  for (const item of hidden) {
    await Api.restore(item.content);
  }
  
  // 注意：删除所有用户词汇需要额外的 API 支持
  // 这里暂时只恢复隐藏的系统词汇
  return true;
}

/** 导出主库为JSON（备份） */
export async function exportMainLibraryAsync(): Promise<string> {
  const items = await Api.getAll();
  const hidden = await Api.getHidden();
  
  const exportData = {
    version: LIBRARY_VERSION,
    exportedAt: new Date().toISOString(),
    type: "main-library-backup",
    userItems: items.filter(i => !i.id.startsWith('vocab-')),
    hiddenSystemItems: hidden.map(i => i.content)
  };
  
  return JSON.stringify(exportData, null, 2);
}

/** 从备份恢复主库（到云端） */
export async function importMainLibraryAsync(jsonString: string): Promise<{ success: boolean; message: string }> {
  try {
    const data = JSON.parse(jsonString);
    
    if (data.type !== "main-library-backup") {
      return { success: false, message: "无效的备份文件格式" };
    }
    
    if (!Array.isArray(data.userItems)) {
      return { success: false, message: "备份文件缺少用户词汇数据" };
    }
    
    // 导入用户词汇
    if (data.userItems.length > 0) {
      await Api.addItems(data.userItems);
    }
    
    // 恢复隐藏的系统词汇
    if (data.hiddenSystemItems?.length > 0) {
      for (const content of data.hiddenSystemItems) {
        await Api.restore(content);
      }
    }
    
    return { 
      success: true, 
      message: `成功恢复 ${data.userItems.length} 条用户词汇，${data.hiddenSystemItems?.length || 0} 条隐藏记录` 
    };
  } catch {
    return { success: false, message: "备份文件解析失败" };
  }
}

/** 检查词汇是否为系统预设 */
export function isSystemItem(item: ResourceItem): boolean {
  return item.id.startsWith("vocab-");
}

/** 导出分类配置 */
export { VOCABULARY_CATEGORIES };

/** 初始化主库（确保迁移完成） */
export async function initializeMainLibrary(): Promise<void> {
  // API 模式下无需初始化
  // 保留此函数以兼容旧代码
}

// ============================================================================
// 兼容性函数（同步版本，用于渐进迁移）
// ============================================================================

/** 获取完整主库（同步版本，优先使用 async 版本） */
export function getMainLibrary(): ResourceItem[] {
  const localData = LocalStorage.get();
  const hiddenSet = new Set(localData.hiddenSystemItems);
  
  // 过滤掉隐藏的系统词汇
  const visibleSystemItems = PRESET_VOCABULARY.filter(item => !hiddenSet.has(item.content));
  
  // 合并系统预设和用户词汇
  return [...visibleSystemItems, ...localData.userItems];
}

/** 获取主库统计（同步版本） */
export function getMainLibraryStats() {
  const localData = LocalStorage.get();
  const hiddenSet = new Set(localData.hiddenSystemItems);
  
  const visibleSystemCount = PRESET_VOCABULARY.filter(item => !hiddenSet.has(item.content)).length;
  const hiddenSystemCount = localData.hiddenSystemItems.length;
  const userCount = localData.userItems.length;
  
  // 分类统计
  const categoryStats: Record<string, number> = {};
  const allItems = getMainLibrary();
  allItems.forEach(item => {
    categoryStats[item.category] = (categoryStats[item.category] || 0) + 1;
  });
  
  return {
    systemCount: PRESET_VOCABULARY.length,
    visibleSystemCount,
    hiddenSystemCount,
    userCount,
    totalCount: visibleSystemCount + userCount,
    categoryStats,
    lastUpdated: localData.lastUpdated
  };
}

/** 添加用户词汇（同步版本） */
export function addUserItems(items: Omit<ResourceItem, "id" | "createdAt">[]): void {
  const data = LocalStorage.get();
  const now = Date.now();
  
  // 检查是否已存在
  const existingContents = new Set([
    ...PRESET_VOCABULARY.map(item => item.content),
    ...data.userItems.map(item => item.content)
  ]);
  
  const newItems: ResourceItem[] = [];
  for (const item of items) {
    if (!existingContents.has(item.content)) {
      newItems.push({
        ...item,
        id: `user-${now}-${Math.random().toString(36).slice(2)}`,
        createdAt: now
      });
      existingContents.add(item.content);
    }
  }
  
  if (newItems.length > 0) {
    data.userItems = [...data.userItems, ...newItems];
    LocalStorage.save(data);
    
    // 异步同步到云端
    addUserItemsAsync(newItems).catch(console.error);
  }
}

/** 删除词汇（同步版本） */
export function removeItem(item: ResourceItem): void {
  const data = LocalStorage.get();
  
  const isSystem = item.id.startsWith("vocab-");
  
  if (isSystem) {
    if (!data.hiddenSystemItems.includes(item.content)) {
      data.hiddenSystemItems.push(item.content);
    }
  } else {
    data.userItems = data.userItems.filter(i => i.id !== item.id);
  }
  
  LocalStorage.save(data);
  
  // 异步同步到云端
  removeItemAsync(item).catch(console.error);
}

/** 恢复隐藏的系统词汇（同步版本） */
export function restoreSystemItem(content: string): void {
  const data = LocalStorage.get();
  data.hiddenSystemItems = data.hiddenSystemItems.filter(c => c !== content);
  LocalStorage.save(data);
  
  // 异步同步到云端
  restoreSystemItemAsync(content).catch(console.error);
}

/** 获取隐藏的系统词汇列表（同步版本） */
export function getHiddenSystemItems(): ResourceItem[] {
  const data = LocalStorage.get();
  const hiddenSet = new Set(data.hiddenSystemItems);
  return PRESET_VOCABULARY.filter(item => hiddenSet.has(item.content));
}

/** 编辑词汇（同步版本） */
export function editUserItem(id: string, updates: Partial<ResourceItem>): void {
  const data = LocalStorage.get();
  const index = data.userItems.findIndex(item => item.id === id);
  
  if (index !== -1) {
    data.userItems[index] = { ...data.userItems[index], ...updates };
    LocalStorage.save(data);
    
    // 异步同步到云端
    editUserItemAsync(id, updates).catch(console.error);
  }
}

/** 重置主库（同步版本） */
export function resetMainLibrary(): void {
  LocalStorage.clear();
  
  // 异步重置云端
  resetMainLibraryAsync().catch(console.error);
}

/** 导出主库为JSON（同步版本） */
export function exportMainLibrary(): string {
  const data = LocalStorage.get();
  
  const exportData = {
    version: LIBRARY_VERSION,
    exportedAt: new Date().toISOString(),
    type: "main-library-backup",
    systemPresetVersion: 1,
    userItems: data.userItems,
    hiddenSystemItems: data.hiddenSystemItems
  };
  
  return JSON.stringify(exportData, null, 2);
}

/** 从备份恢复主库（同步版本） */
export function importMainLibrary(jsonString: string): { success: boolean; message: string } {
  try {
    const data = JSON.parse(jsonString);
    
    if (data.type !== "main-library-backup") {
      return { success: false, message: "无效的备份文件格式" };
    }
    
    if (!Array.isArray(data.userItems)) {
      return { success: false, message: "备份文件缺少用户词汇数据" };
    }
    
    LocalStorage.save({
      version: LIBRARY_VERSION,
      lastUpdated: Date.now(),
      userItems: data.userItems,
      hiddenSystemItems: data.hiddenSystemItems || []
    });
    
    // 异步同步到云端
    importMainLibraryAsync(jsonString).catch(console.error);
    
    return { 
      success: true, 
      message: `成功恢复 ${data.userItems.length} 条用户词汇，${data.hiddenSystemItems?.length || 0} 条隐藏记录` 
    };
  } catch {
    return { success: false, message: "备份文件解析失败" };
  }
}
