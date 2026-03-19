"use strict";
/**
 * 模型管理路由
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelRouter = void 0;
const express_1 = require("express");
class ModelRouter {
    router;
    service;
    constructor(service) {
        this.router = (0, express_1.Router)();
        this.service = service;
        this.setupRoutes();
    }
    setupRoutes() {
        // 获取Ollama模型列表
        this.router.get('/ollama', async (req, res) => {
            try {
                const models = await this.service.getOllamaModels();
                res.json({ success: true, data: models });
            }
            catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        // 拉取Ollama模型
        this.router.post('/ollama/pull', async (req, res) => {
            try {
                const { model } = req.body;
                await this.service.pullOllamaModel(model);
                res.json({ success: true, message: `模型 ${model} 拉取成功` });
            }
            catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        // Ollama生成
        this.router.post('/ollama/generate', async (req, res) => {
            try {
                const { model, prompt, options } = req.body;
                const result = await this.service.generateWithOllama(model, prompt, options);
                res.json({ success: true, data: result });
            }
            catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        // vLLM生成
        this.router.post('/vllm/generate', async (req, res) => {
            try {
                const { messages, options } = req.body;
                const result = await this.service.generateWithVLLM(messages, options);
                res.json({ success: true, data: result });
            }
            catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        // 扫描本地模型
        this.router.get('/local', async (req, res) => {
            try {
                const { dir } = req.query;
                const models = await this.service.scanLocalModels(dir || './models');
                res.json({ success: true, data: models });
            }
            catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        // 服务状态
        this.router.get('/status', (req, res) => {
            res.json({
                success: true,
                data: {
                    ollama: this.service.isOllamaReady(),
                    vllm: this.service.isVLLMReady()
                }
            });
        });
    }
    getRouter() {
        return this.router;
    }
}
exports.ModelRouter = ModelRouter;
//# sourceMappingURL=model.js.map