/**
 * ============================================================================
 * 主库存储管理 - 重导出客户端模块
 * ============================================================================
 * 统一的词汇主库，包含系统预设 + 用户添加的词汇
 * 
 * 此文件重新导出 main-library-client.ts 中的函数
 * 以保持向后兼容性
 */

// 重新导出所有函数
export {
  // 异步版本（云端存储）
  initializeMainLibrary,
  getMainLibraryAsync,
  getMainLibraryStatsAsync,
  addUserItemsAsync,
  removeItemAsync,
  restoreSystemItemAsync,
  getHiddenSystemItemsAsync,
  editUserItemAsync,
  resetMainLibraryAsync,
  exportMainLibraryAsync,
  importMainLibraryAsync,
  
  // 去重功能
  deduplicateLibrary,
  checkDuplicate,
  batchCheckDuplicates,
  
  // 同步版本（本地存储）
  getMainLibrary,
  getMainLibraryStats,
  addUserItems,
  removeItem,
  restoreSystemItem,
  getHiddenSystemItems,
  editUserItem,
  resetMainLibrary,
  exportMainLibrary,
  importMainLibrary,
  
  // 工具函数
  isSystemItem,
  
  // 常量
  VOCABULARY_CATEGORIES
} from './main-library-client';
