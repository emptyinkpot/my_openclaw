/**
 * 路径配置 - 公共模块
 * @module @openclaw/common-utils/config/paths
 */
/**
 * 获取项目根目录
 */
export declare function getProjectRoot(): string;
/**
 * 项目级路径
 */
export declare const PROJECT_PATHS: {
    readonly root: string;
    readonly data: string;
    readonly storage: string;
    readonly logs: string;
    readonly browser: string;
    readonly cookies: string;
};
/**
 * 获取模块数据路径
 * @param moduleName - 模块名称（如 'novel-manager'）
 * @returns 模块路径配置
 */
export declare function getModulePaths(moduleName: string): {
    root: string;
    data: string;
    cache: string;
    storage: string;
    logs: string;
    accounts: string;
};
/**
 * 确保目录存在
 * @param paths - 路径数组
 */
export declare function ensurePaths(...paths: string[]): void;
/**
 * 确保模块目录存在
 * @param moduleName - 模块名称
 */
export declare function ensureModulePaths(moduleName: string): void;
//# sourceMappingURL=paths.d.ts.map