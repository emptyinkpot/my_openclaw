"use strict";
/**
 * 路径配置 - 公共模块
 * @module @openclaw/common-utils/config/paths
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROJECT_PATHS = void 0;
exports.getProjectRoot = getProjectRoot;
exports.getModulePaths = getModulePaths;
exports.ensurePaths = ensurePaths;
exports.ensureModulePaths = ensureModulePaths;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
/**
 * 获取项目根目录
 */
function getProjectRoot() {
    // 从当前文件向上回溯到项目根
    return path.resolve(__dirname, '../../../..');
}
/**
 * 项目级路径
 */
exports.PROJECT_PATHS = {
    root: getProjectRoot(),
    data: path.join(getProjectRoot(), 'data'),
    storage: path.join(getProjectRoot(), 'storage'),
    logs: path.join(getProjectRoot(), 'logs'),
    browser: path.join(getProjectRoot(), 'browser'),
    cookies: path.join(getProjectRoot(), 'cookies-accounts'),
};
/**
 * 获取模块数据路径
 * @param moduleName - 模块名称（如 'novel-manager'）
 * @returns 模块路径配置
 */
function getModulePaths(moduleName) {
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
function ensurePaths(...paths) {
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
function ensureModulePaths(moduleName) {
    const paths = getModulePaths(moduleName);
    ensurePaths(paths.data, paths.cache, paths.storage, paths.logs, paths.accounts);
}
//# sourceMappingURL=paths.js.map