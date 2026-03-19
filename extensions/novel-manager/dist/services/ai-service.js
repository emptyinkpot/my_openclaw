"use strict";
/**
 * AI内容生成服务
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const config_1 = require("../core/config");
class AIService {
    constructor() {
        const config = (0, config_1.getConfig)();
        this.config = config.ai;
    }
    getConfig() {
        return this.config;
    }
    /**
     * 模拟AI生成
     */
    async generateContent(prompt) {
        try {
            await new Promise(r => setTimeout(r, 2000));
            return {
                content: `【AI生成内容示例】\n\n根据您提供的大纲和前文，生成以下内容：\n\n${prompt.substring(0, 100)}...\n\n这只是一个示例内容。在实际部署中，您需要接入真实的LLM API。`,
            };
        }
        catch (error) {
            return { content: '', error: error.message };
        }
    }
}
exports.AIService = AIService;
//# sourceMappingURL=ai-service.js.map