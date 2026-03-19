"use strict";
/**
 * 浏览器自动化 - 公共模块 (占位实现)
 * @module @openclaw/common-utils/browser
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserManager = void 0;
exports.createBrowser = createBrowser;
const playwright_1 = require("playwright");
class BrowserManager {
    browser = null;
    context = null;
    async launch(options = {}) {
        this.browser = await playwright_1.chromium.launch({
            headless: options.headless ?? false,
        });
        this.context = await this.browser.newContext({
            viewport: options.viewport || { width: 1280, height: 720 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        });
        return this.context;
    }
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.context = null;
        }
    }
    getContext() {
        return this.context;
    }
}
exports.BrowserManager = BrowserManager;
async function createBrowser(options) {
    const manager = new BrowserManager();
    await manager.launch(options);
    return manager;
}
//# sourceMappingURL=index.js.map