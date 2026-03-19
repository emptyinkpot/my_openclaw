/**
 * 浏览器自动化 - 公共模块 (占位实现)
 * @module @openclaw/common-utils/browser
 */
import { BrowserContext } from 'playwright';
export interface BrowserOptions {
    headless?: boolean;
    userDataDir?: string;
    viewport?: {
        width: number;
        height: number;
    };
}
export declare class BrowserManager {
    private browser;
    private context;
    launch(options?: BrowserOptions): Promise<BrowserContext>;
    close(): Promise<void>;
    getContext(): BrowserContext | null;
}
export declare function createBrowser(options?: BrowserOptions): Promise<BrowserManager>;
export { Browser, BrowserContext, Page } from 'playwright';
//# sourceMappingURL=index.d.ts.map