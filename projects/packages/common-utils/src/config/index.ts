/**
 * 配置管理 - 公共模块
 * @module @openclaw/common-utils/config
 */

import { PROJECT_PATHS, getModulePaths, ensurePaths, ensureModulePaths, getProjectRoot } from './paths';

// 重新导出路径配置
export {
  PROJECT_PATHS,
  getProjectRoot,
  getModulePaths,
  ensurePaths,
  ensureModulePaths,
};

// 默认导出
export default {
  PROJECT_PATHS,
  getModulePaths,
  ensurePaths,
  ensureModulePaths,
};
