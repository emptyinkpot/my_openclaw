"use strict";
/**
 * 配置管理 - 公共模块
 * @module @openclaw/common-utils/config
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureModulePaths = exports.ensurePaths = exports.getModulePaths = exports.getProjectRoot = exports.PROJECT_PATHS = void 0;
const paths_1 = require("./paths");
Object.defineProperty(exports, "PROJECT_PATHS", { enumerable: true, get: function () { return paths_1.PROJECT_PATHS; } });
Object.defineProperty(exports, "getModulePaths", { enumerable: true, get: function () { return paths_1.getModulePaths; } });
Object.defineProperty(exports, "ensurePaths", { enumerable: true, get: function () { return paths_1.ensurePaths; } });
Object.defineProperty(exports, "ensureModulePaths", { enumerable: true, get: function () { return paths_1.ensureModulePaths; } });
Object.defineProperty(exports, "getProjectRoot", { enumerable: true, get: function () { return paths_1.getProjectRoot; } });
// 默认导出
exports.default = {
    PROJECT_PATHS: paths_1.PROJECT_PATHS,
    getModulePaths: paths_1.getModulePaths,
    ensurePaths: paths_1.ensurePaths,
    ensureModulePaths: paths_1.ensureModulePaths,
};
//# sourceMappingURL=index.js.map