"use strict";
/**
 * 小说管理模块 - OpenClaw 插件
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = exports.register = void 0;
// OpenClaw 插件定义
const plugin = {
    id: "novel-manager",
    name: "小说数据管理",
    description: "小说数据管理Web界面",
    version: "1.0.0",
    configSchema: {
        type: "object",
        additionalProperties: false,
        properties: {}
    },
    register(api) {
        console.log('[novel-manager] Plugin registered');
    },
    activate() {
        console.log('[novel-manager] Plugin activated');
    }
};
exports.default = plugin;
exports.register = plugin.register;
exports.activate = plugin.activate;
//# sourceMappingURL=index.js.map