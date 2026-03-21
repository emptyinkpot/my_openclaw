/**
 * ============================================================================
 * 本地存储工具
 * ============================================================================
 */

/** 存储键 */
export const STORAGE_KEYS = {
  VOCABULARY: "text_polisher_vocabulary_v8",
  RESOURCES: "text_polisher_resources_v1",   // 新版资源库
} as const;

/** 通用存储操作 */
export const Storage = {
  /** 获取数据 */
  get<T>(key: string, defaultValue: T): T {
    if (typeof window === "undefined") return defaultValue;
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  /** 保存数据 */
  set<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error("Storage set error:", e);
    }
  },

  /** 删除数据 */
  remove(key: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
  },

  /** 清空所有数据 */
  clear(): void {
    if (typeof window === "undefined") return;
    localStorage.clear();
  },
};

/** 词汇库存储操作（兼容旧版） */
export const VocabularyStorage = {
  get: <T>(defaultValue: T) => Storage.get(STORAGE_KEYS.VOCABULARY, defaultValue),
  set: <T>(value: T) => Storage.set(STORAGE_KEYS.VOCABULARY, value),
};

/** 资源库存储操作（新版，支持词汇和梗） */
export const ResourceStorage = {
  get: <T>(defaultValue: T) => Storage.get(STORAGE_KEYS.RESOURCES, defaultValue),
  set: <T>(value: T) => Storage.set(STORAGE_KEYS.RESOURCES, value),
};
