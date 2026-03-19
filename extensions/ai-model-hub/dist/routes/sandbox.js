"use strict";
/**
 * 沙盒安全路由
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SandboxRouter = void 0;
const express_1 = require("express");
class SandboxRouter {
    router;
    service;
    constructor(service) {
        this.router = (0, express_1.Router)();
        this.service = service;
        this.setupRoutes();
    }
    setupRoutes() {
        // 分析代码
        this.router.post('/analyze', async (req, res) => {
            try {
                const { code, language } = req.body;
                let result;
                if (language === 'python') {
                    result = await this.service.analyzePythonCode(code);
                }
                else {
                    result = this.service.analyzeJavaScriptCode(code);
                }
                res.json({ success: true, data: result });
            }
            catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        // 执行代码
        this.router.post('/execute', async (req, res) => {
            try {
                const { code, language, timeout } = req.body;
                const result = await this.service.executeCode(code, language, timeout);
                res.json({ success: true, data: result });
            }
            catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        // 获取配置
        this.router.get('/config', (req, res) => {
            res.json({ success: true, data: this.service.getConfig() });
        });
        // 更新配置
        this.router.post('/config', (req, res) => {
            this.service.updateConfig(req.body);
            res.json({ success: true, message: '配置已更新' });
        });
    }
    getRouter() {
        return this.router;
    }
}
exports.SandboxRouter = SandboxRouter;
//# sourceMappingURL=sandbox.js.map