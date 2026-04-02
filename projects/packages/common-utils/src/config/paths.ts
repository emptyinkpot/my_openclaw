/**
 * 路径配置 - 公共模块
 * @module @openclaw/common-utils/config/paths
 */

import * as path from 'path';
import * as fs from 'fs';

/**
 * 获取项目根目录
 */
export function getProjectRoot(): string {
  // 从当前文件向上回溯到项目根
  return path.resolve(__dirname, '../../../..');
}

/**
 * 项目级路径
 */
export const PROJECT_PATHS = {
  root: getProjectRoot(),
  data: path.join(getProjectRoot(), 'data'),
  storage: path.join(getProjectRoot(), 'storage'),
  logs: path.join(getProjectRoot(), 'logs'),
  browser: path.join(getProjectRoot(), 'browser'),
  cookies: path.join(getProjectRoot(), 'cookies-accounts'),
} as const;

/**
 * 获取模块数据路径
 * @param moduleName - 模块名称（如 'novel-manager'）
 * @returns 模块路径配置
 */
export function getModulePaths(moduleName: string) {
  const moduleRoot = path.join(getProjectRoot(), 'apps', moduleName);
  return {
    root: moduleRoot,
    data: path.join(moduleRoot, 'data'),
    cache: path.join(moduleRoot, 'data', 'cache'),
    storage: path.join(moduleRoot, 'data', 'storage'),
    logs: path.join(moduleRoot, 'data', 'logs'),
    accounts: path.join(moduleRoot, 'data', 'accounts'),
  };
}

/**
 * 确保目录存在
 * @param paths - 路径数组
 */
export function ensurePaths(...paths: string[]): void {
  paths.forEach(p => {
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true });
    }
  });
}

/**
 * 确保模块目录存在
 * @param moduleName - 模块名称
 */
export function ensureModulePaths(moduleName: string): void {
  const paths = getModulePaths(moduleName);
  ensurePaths(paths.data, paths.cache, paths.storage, paths.logs, paths.accounts);
}
