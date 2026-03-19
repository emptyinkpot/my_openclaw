/**
 * 配置管理 - 公共模块
 * @module @openclaw/common-utils/config
 */
import { PROJECT_PATHS, getModulePaths, ensurePaths, ensureModulePaths, getProjectRoot } from './paths';
export { PROJECT_PATHS, getProjectRoot, getModulePaths, ensurePaths, ensureModulePaths, };
declare const _default: {
    PROJECT_PATHS: {
        readonly root: string;
        readonly data: string;
        readonly storage: string;
        readonly logs: string;
        readonly browser: string;
        readonly cookies: string;
    };
    getModulePaths: typeof getModulePaths;
    ensurePaths: typeof ensurePaths;
    ensureModulePaths: typeof ensureModulePaths;
};
export default _default;
//# sourceMappingURL=index.d.ts.map