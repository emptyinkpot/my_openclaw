/**
 * 番茄作品扫描器
 * 使用 Playwright 扫描番茄作者后台的作品列表
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../utils/logger';
import { getConfig } from '../config';
/**
 * 中文数字转阿拉伯数字
 */
function chineseToNumber(chinese) {
    const map = {
        '零': 0, '一': 1, '二': 2, '三': 3, '四': 4,
        '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
        '十': 10, '百': 100, '千': 1000
    };
    let result = 0;
    let temp = 0;
    for (const char of chinese) {
        const val = map[char];
        if (val === undefined)
            continue;
        if (val < 10) {
            temp = temp * 10 + val;
        }
        else {
            if (temp === 0)
                temp = 1;
            result += temp * val;
            temp = 0;
        }
    }
    return result + temp;
}
/**
 * 从文本提取章节数
 */
function extractChapterCount(text) {
    const patterns = [
        /第\s*([零一二三四五六七八九十百千\d]+)\s*章/,
        /更新至\s*第?\s*([零一二三四五六七八九十百千\d]+)\s*章?/,
        /已发布\s*([零一二三四五六七八九十百千\d]+)\s*章/,
        /共\s*([零一二三四五六七八九十百千\d]+)\s*章/,
        /(\d+)\s*章/
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const num = match[1];
            if (/^\d+$/.test(num))
                return parseInt(num);
            return chineseToNumber(num);
        }
    }
    return 0;
}
/**
 * 番茄作品扫描器
 */
export class FanqieScanner {
    constructor() {
        this.config = getConfig();
    }
    /**
     * 扫描番茄作品列表
     */
    scan() {
        return __awaiter(this, arguments, void 0, function* (options = {}) {
            const { accountId, headed = false, onProgress } = options;
            const allWorks = [];
            let accounts = this.config.scheduler.fanqieAccounts || [];
            if (accountId) {
                accounts = accounts.filter(acc => acc.id === accountId);
            }
            if (accounts.length === 0) {
                return { success: false, works: [], error: '没有配置番茄账号' };
            }
            for (const account of accounts) {
                onProgress === null || onProgress === void 0 ? void 0 : onProgress({
                    status: 'scanning',
                    message: `正在扫描 ${account.name}...`,
                    accountId: account.id,
                    worksFound: allWorks.length
                });
                try {
                    const works = yield this.scanAccount(account, headed);
                    allWorks.push(...works);
                    // 保存到缓存
                    this.saveCache(account.id, works);
                    logger.info(`[FanqieScanner] ${account.name} 扫描完成: ${works.length} 个作品`);
                }
                catch (e) {
                    logger.error(`[FanqieScanner] ${account.name} 扫描失败: ${e.message}`);
                }
            }
            onProgress === null || onProgress === void 0 ? void 0 : onProgress({
                status: 'completed',
                message: `扫描完成，共 ${allWorks.length} 个作品`,
                worksFound: allWorks.length
            });
            return { success: true, works: allWorks };
        });
    }
    /**
     * 扫描单个账号
     */
    scanAccount(account, headed) {
        return __awaiter(this, void 0, void 0, function* () {
            const works = [];
            let context = null;
            // 清理浏览器锁文件
            this.cleanBrowserLocks(account.browserDir);
            try {
                context = yield chromium.launchPersistentContext(account.browserDir, {
                    headless: !headed,
                    channel: 'chrome',
                    viewport: { width: 1400, height: 850 },
                    args: ['--no-sandbox']
                });
                const page = context.pages()[0] || (yield context.newPage());
                // 加载 Cookie
                if (fs.existsSync(account.cookiesFile)) {
                    try {
                        const cookieData = JSON.parse(fs.readFileSync(account.cookiesFile, 'utf-8'));
                        const cookies = cookieData.cookies || cookieData;
                        if (Array.isArray(cookies) && cookies.length > 0) {
                            yield page.context().addCookies(cookies);
                            logger.info(`[FanqieScanner] 已加载 ${cookies.length} 个 Cookie`);
                        }
                    }
                    catch (e) {
                        logger.warn(`[FanqieScanner] Cookie 加载失败: ${e.message}`);
                    }
                }
                // 访问作品管理页面
                yield page.goto('https://fanqienovel.com/main/writer/book-manage', {
                    waitUntil: 'networkidle',
                    timeout: 60000
                });
                yield page.waitForTimeout(3000);
                // 检查登录状态
                const currentUrl = page.url();
                const pageContent = yield page.content();
                const isLoginPage = currentUrl.includes('login') ||
                    currentUrl.includes('signin') ||
                    pageContent.includes('请登录') ||
                    pageContent.includes('页面无法访问');
                if (isLoginPage) {
                    logger.warn(`[FanqieScanner] ${account.name} 未登录，跳过`);
                    yield context.close();
                    return works;
                }
                // 等待作品卡片
                try {
                    yield page.waitForSelector('[id^="long-article-table-item-"]', {
                        state: 'visible',
                        timeout: 20000
                    });
                }
                catch (_a) {
                    logger.warn(`[FanqieScanner] 未找到作品卡片`);
                    yield context.close();
                    return works;
                }
                // 获取作品卡片
                const cards = yield page.locator('[id^="long-article-table-item-"]').all();
                logger.info(`[FanqieScanner] 找到 ${cards.length} 个作品`);
                for (let i = 0; i < cards.length; i++) {
                    try {
                        const card = cards[i];
                        const titleText = yield card.locator('.hoverup').first().innerText().catch(() => '');
                        const title = titleText.split('\n')[0].trim();
                        if (!title || title.length < 2)
                            continue;
                        const cardId = yield card.getAttribute('id');
                        const workId = (cardId === null || cardId === void 0 ? void 0 : cardId.replace('long-article-table-item-', '')) || `work_${i}`;
                        const cardText = yield card.innerText();
                        const totalChapters = extractChapterCount(cardText);
                        let status = '连载中';
                        if (cardText.includes('已签约'))
                            status = '已签约';
                        else if (cardText.includes('已完结'))
                            status = '已完结';
                        else if (cardText.includes('停止推荐'))
                            status = '已停止推荐';
                        let wordCount = '';
                        const wordMatch = cardText.match(/(\d+\.?\d*)\s*[万字万]/);
                        if (wordMatch)
                            wordCount = wordMatch[1] + '万字';
                        works.push({
                            workId,
                            title,
                            status,
                            totalChapters,
                            wordCount,
                            accountId: account.id,
                            accountName: account.name,
                        });
                    }
                    catch (e) {
                        logger.error(`[FanqieScanner] 解析作品失败: ${e.message}`);
                    }
                }
                yield context.close();
            }
            catch (e) {
                logger.error(`[FanqieScanner] 扫描失败: ${e.message}`);
                if (context)
                    yield context.close();
            }
            return works;
        });
    }
    /**
     * 清理浏览器锁文件
     */
    cleanBrowserLocks(browserDir) {
        ['SingletonLock', 'SingletonSocket', 'SingletonCookie', 'Lock'].forEach(f => {
            try {
                fs.unlinkSync(path.join(browserDir, f));
            }
            catch (_a) { }
        });
    }
    /**
     * 保存扫描结果到缓存
     */
    saveCache(accountId, works) {
        const cacheDir = path.join(this.config.paths.cache);
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }
        const cachePath = path.join(cacheDir, `fanqie-${accountId}-works.json`);
        fs.writeFileSync(cachePath, JSON.stringify(works, null, 2));
        logger.info(`[FanqieScanner] 缓存已保存: ${cachePath}`);
    }
    /**
     * 读取缓存
     */
    readCache(accountId) {
        const cacheDir = path.join(this.config.paths.cache);
        const allWorks = [];
        let accounts = this.config.scheduler.fanqieAccounts || [];
        if (accountId) {
            accounts = accounts.filter(acc => acc.id === accountId);
        }
        for (const account of accounts) {
            const cachePath = path.join(cacheDir, `fanqie-${account.id}-works.json`);
            if (fs.existsSync(cachePath)) {
                try {
                    const works = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
                    allWorks.push(...works);
                }
                catch (_a) { }
            }
        }
        return allWorks;
    }
}
// 单例
let scannerInstance = null;
export function getFanqieScanner() {
    if (!scannerInstance) {
        scannerInstance = new FanqieScanner();
    }
    return scannerInstance;
}
