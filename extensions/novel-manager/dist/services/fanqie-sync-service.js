"use strict";
/**
 * 番茄同步发布服务
 * 根据番茄作品名称匹配本地小说，同步最新章节（只发布润色且审核通过的）
 *
 * 改编自 task-planner/core/services/PublishService.js + ScanService.js
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FanqieSyncService = void 0;
const playwright_1 = require("playwright");
const database_1 = require("../core/database");
const logger_1 = require("../utils/logger");
const config_1 = require("../core/config");
const FanqiePublisher_1 = require("../core/pipeline/FanqiePublisher");
const text_1 = require("../core/utils/text");
const helpers_1 = require("../utils/helpers");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const FANQIE_AUTHOR_URL = 'https://fanqienovel.com/writer/zone/';
const FANQIE_PAGE_URL = 'https://fanqienovel.com/author-page/1514776055710208';
class FanqieSyncService {
    constructor() {
        this.db = (0, database_1.getDatabaseManager)();
        this.config = (0, config_1.getConfig)();
    }
    /**
     * 扫描番茄作品列表
     * 模拟 ScanService.scanFanqie() 的核心逻辑
     * 支持指定账号或扫描所有账号
     */
    async scanFanqieWorks(accountId, headed = false) {
        logger_1.logger.info(`【番茄】开始扫描作品列表${accountId ? ` [账号: ${accountId}]` : ''}${headed ? ' [有头模式]' : ''}...`);
        const allWorks = [];
        // 从配置中读取番茄账号
        let accounts = this.config.scheduler.fanqieAccounts || [];
        // 如果指定了账号ID，只扫描该账号
        if (accountId) {
            accounts = accounts.filter(acc => acc.id === accountId);
        }
        if (accounts.length === 0) {
            logger_1.logger.warn('没有配置番茄账号');
            return allWorks;
        }
        // 使用 Playwright 真实扫描番茄网站
        for (const account of accounts) {
            logger_1.logger.info(`扫描账号: ${account.name}`);
            try {
                const works = await this.scanWithPlaywright(account, headed);
                allWorks.push(...works);
            }
            catch (e) {
                logger_1.logger.error(`扫描账号 ${account.name} 失败: ${e}`);
            }
        }
        logger_1.logger.info(`扫描完成，共 ${allWorks.length} 个作品`);
        // 保存到缓存
        if (accountId) {
            this.saveWorksCache(accountId, allWorks);
        }
        return allWorks;
    }
    /**
     * 使用 Playwright 扫描番茄作品列表
     */
    async scanWithPlaywright(account, headed = false) {
        const works = [];
        let browser = null;
        let page = null;
        try {
            // 检查缓存文件路径
            const storagePath = account.cookiesFile || path.join(this.config.paths.cache, `fanqie-${account.id}-state.json`);
            browser = await playwright_1.chromium.launch({ headless: !headed });
            const context = await browser.newContext({
                viewport: { width: 1280, height: 800 },
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            });
            // 如果有保存的存储状态，加载它
            if (fs.existsSync(storagePath)) {
                const storageState = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
                await context.addCookies(storageState.cookies || []);
                logger_1.logger.info(`  已加载 cookies: ${storagePath}`);
            }
            page = await context.newPage();
            // 访问作者后台
            await page.goto(FANQIE_AUTHOR_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await (0, helpers_1.delay)(2000);
            // 检查是否需要登录
            const currentUrl = page.url();
            const pageTitle = await page.title();
            const pageContent = await page.content();
            logger_1.logger.info(`  当前页面: ${currentUrl}`);
            logger_1.logger.info(`  页面标题: ${pageTitle}`);
            // 检测多种未登录状态
            const isLoginPage = currentUrl.includes('login') ||
                currentUrl.includes('signin') ||
                pageContent.includes('登录') ||
                pageContent.includes('请登录') ||
                pageContent.includes('页面无法访问');
            if (isLoginPage) {
                logger_1.logger.warn(`========================================`);
                logger_1.logger.warn(`账号 ${account.name} 未登录或登录已过期！`);
                logger_1.logger.warn(`请手动登录后重新运行脚本。`);
                logger_1.logger.warn(`Cookies 文件: ${storagePath}`);
                logger_1.logger.warn(`========================================`);
                return works;
            }
            // 输出页面内容用于调试
            const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
            logger_1.logger.debug(`  页面内容片段: ${bodyText}...`);
            // 点击"工作台"进入作品管理页面
            const workbenchLink = await page.$('a[href*="book-manage"], a:has-text("工作台"), [data-e2e="workbench"]');
            if (workbenchLink) {
                logger_1.logger.info(`  点击工作台...`);
                await workbenchLink.click();
                await (0, helpers_1.delay)(3000);
            }
            else {
                // 尝试直接访问作品管理页面
                logger_1.logger.info(`  直接访问作品管理页面...`);
                await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'domcontentloaded' });
                await (0, helpers_1.delay)(2000);
            }
            // 再次检查页面
            const manageUrl = page.url();
            logger_1.logger.info(`  当前页面: ${manageUrl}`);
            // 等待作品列表加载 - 番茄作品管理页面的实际结构
            await page.waitForTimeout(2000);
            // 番茄作品管理页面的作品卡片选择器
            const selectors = [
                '[id^="long-article-table-item-"]', // 番茄官方ID前缀
                'div[data-e2e="book-list-item"]', // 官方属性
                '.book-card',
                '.book-item',
                '[class*="BookCard"]',
                '[class*="book-card"]',
                '.ant-card',
                '.work-card',
            ];
            let workElements = [];
            for (const selector of selectors) {
                workElements = await page.$$(selector);
                if (workElements.length > 0) {
                    logger_1.logger.info(`找到 ${workElements.length} 个作品 [选择器: ${selector}]`);
                    break;
                }
            }
            // 如果还找不到，尝试通过 evaluate 获取
            if (workElements.length === 0) {
                logger_1.logger.info(`尝试通过 JavaScript 获取作品列表...`);
                const worksFromJs = await page.evaluate(() => {
                    // 尝试找到包含作品名称的元素
                    const allElements = document.querySelectorAll('div, article, section');
                    const results = [];
                    for (const el of Array.from(allElements)) {
                        // 查找可能是作品卡片的元素
                        const hasTitle = el.querySelector('h1, h2, h3, h4, .title, [class*="title"]');
                        const hasChapter = el.textContent?.includes('章') || el.textContent?.includes('字');
                        const hasLink = el.querySelector('a[href*="book"], a[href*="chapter"]');
                        if (hasTitle && hasChapter) {
                            const titleEl = el.querySelector('h1, h2, h3, h4, .title, [class*="title"]');
                            const title = titleEl?.textContent?.trim() || '';
                            if (title && title.length > 2 && title.length < 50 && !title.includes('活动') && !title.includes('公告')) {
                                results.push({ title, element: el.tagName });
                            }
                        }
                    }
                    return results;
                });
                logger_1.logger.info(`JavaScript 找到 ${worksFromJs.length} 个可能的作品: ${JSON.stringify(worksFromJs.slice(0, 5))}`);
            }
            // 通过 JavaScript 在页面上获取所有作品信息
            const fanqieWorksRaw = await page.evaluate(() => {
                const results = [];
                // 番茄作品管理页面的作品卡片通常有特定的 ID 或类名
                const workCards = document.querySelectorAll('[id^="long-article-table-item-"], [data-e2e="book-list-item"], .book-card, .book-item');
                for (const card of Array.from(workCards)) {
                    // 提取作品标题
                    const titleEl = card.querySelector('.title, h1, h2, h3, h4, [class*="title"]');
                    const title = titleEl?.textContent?.trim() || '';
                    if (!title || title.length < 2)
                        continue;
                    // 提取章节文本
                    const chapterText = card.textContent || '';
                    results.push({
                        title,
                        chapterText,
                    });
                }
                return results;
            });
            // 在 Node.js 端解析章节号（支持阿拉伯数字和中文数字）
            const fanqieWorks = fanqieWorksRaw.map(({ title, chapterText }) => {
                let totalChapters = 0;
                // 尝试匹配 "已发布 X 章" 或 "共 X 章"
                const arabicMatch = chapterText.match(/(?:已发布|共)?\s*(\d+)\s*章/);
                if (arabicMatch) {
                    totalChapters = parseInt(arabicMatch[1], 10);
                }
                else {
                    // 尝试匹配中文数字
                    const chineseMatch = chapterText.match(/(?:已发布|共)?\s*([零一二三四五六七八九十百千万]+)\s*章/);
                    if (chineseMatch) {
                        totalChapters = (0, text_1.chineseToNumber)(chineseMatch[1]);
                    }
                }
                return {
                    title,
                    latestChapter: totalChapters > 0 ? `第${totalChapters}章` : '未知',
                    latestChapterNum: totalChapters,
                    totalChapters,
                };
            });
            logger_1.logger.info(`通过 JavaScript 获取到 ${fanqieWorks.length} 个作品`);
            // 添加到结果
            for (const work of fanqieWorks) {
                works.push({
                    ...work,
                    accountId: account.id,
                    accountName: account.name,
                });
                logger_1.logger.info(`  作品: ${work.title}, 章节: ${work.totalChapters || '未知'}`);
            }
            // 如果没有找到作品，尝试备用方法
            if (works.length === 0 && workElements.length > 0) {
                logger_1.logger.info(`尝试从 DOM 元素中提取作品信息...`);
                for (let i = 0; i < Math.min(workElements.length, 10); i++) {
                    try {
                        const el = workElements[i];
                        const text = await el.textContent() || '';
                        const lines = text.split('\n').map((l) => l.trim()).filter((l) => l && l.length > 1);
                        if (lines.length > 0) {
                            const title = lines[0];
                            // 过滤掉非作品名称
                            if (title.includes('ICP') || title.includes('公告') || title.includes('活动'))
                                continue;
                            // 查找章节数（支持阿拉伯数字和中文数字）
                            let totalChapters = 0;
                            for (const line of lines) {
                                // 尝试阿拉伯数字
                                const arabicMatch = line.match(/(\d+)\s*章/);
                                if (arabicMatch) {
                                    totalChapters = parseInt(arabicMatch[1], 10);
                                    break;
                                }
                                // 尝试中文数字
                                const chineseMatch = line.match(/([零一二三四五六七八九十百千万]+)\s*章/);
                                if (chineseMatch) {
                                    totalChapters = (0, text_1.chineseToNumber)(chineseMatch[1]);
                                    break;
                                }
                            }
                            works.push({
                                title,
                                latestChapter: totalChapters > 0 ? `第${totalChapters}章` : '未知',
                                latestChapterNum: totalChapters,
                                totalChapters,
                                accountId: account.id,
                                accountName: account.name,
                            });
                            logger_1.logger.info(`  作品: ${title}, 章节: ${totalChapters || '未知'}`);
                        }
                    }
                    catch (err) {
                        logger_1.logger.error(`  解析第 ${i + 1} 个元素失败: ${err}`);
                    }
                }
            }
            // 保存登录状态
            const cookies = await context.cookies();
            fs.mkdirSync(path.dirname(storagePath), { recursive: true });
            fs.writeFileSync(storagePath, JSON.stringify({ cookies }, null, 2));
        }
        catch (e) {
            logger_1.logger.error(`Playwright 扫描失败: ${e}`);
            throw e;
        }
        finally {
            if (browser) {
                await browser.close();
            }
        }
        return works;
    }
    /**
     * 获取缓存的作品列表
     */
    async getCachedWorks(accountId) {
        try {
            const cachePath = path.join(this.config.paths.cache, `fanqie-${accountId}-works.json`);
            if (fs.existsSync(cachePath)) {
                const data = fs.readFileSync(cachePath, 'utf-8');
                return JSON.parse(data);
            }
        }
        catch (e) {
            logger_1.logger.error(`读取缓存失败: ${e}`);
        }
        return [];
    }
    /**
     * 保存作品列表到缓存
     */
    saveWorksCache(accountId, works) {
        try {
            const cachePath = path.join(this.config.paths.cache, `fanqie-${accountId}-works.json`);
            fs.mkdirSync(path.dirname(cachePath), { recursive: true });
            fs.writeFileSync(cachePath, JSON.stringify(works, null, 2));
        }
        catch (e) {
            logger_1.logger.error(`保存缓存失败: ${e}`);
        }
    }
    /**
     * 根据标题匹配本地作品
     */
    async matchLocalWork(fanqieTitle) {
        // 首先精确匹配
        const exactMatch = await this.db.queryOne(`
      SELECT id, title, current_chapters FROM works 
      WHERE title = ? OR title LIKE ? OR title LIKE ?
    `, [fanqieTitle, `%${fanqieTitle}%`, `${fanqieTitle}%`]);
        if (exactMatch) {
            return exactMatch;
        }
        // 模糊匹配：移除标点符号后比较
        const cleanFanqieTitle = this.cleanTitle(fanqieTitle);
        const allWorks = await this.db.query('SELECT id, title, current_chapters FROM works');
        for (const work of allWorks) {
            const cleanLocalTitle = this.cleanTitle(work.title);
            if (cleanLocalTitle === cleanFanqieTitle ||
                cleanLocalTitle.includes(cleanFanqieTitle) ||
                cleanFanqieTitle.includes(cleanLocalTitle)) {
                return work;
            }
        }
        return null;
    }
    /**
     * 清理标题（移除标点符号）
     */
    cleanTitle(title) {
        return title.replace(/[？?！!。，,、\s]/g, '').toLowerCase();
    }
    /**
     * 检查章节是否可以发布
     * 条件：存在内容 + 已润色 + 审核通过
     */
    async checkChapterPublishable(workId, chapterNum) {
        const chapter = await this.db.queryOne(`
      SELECT c.*, w.title as work_title
      FROM chapters c
      JOIN works w ON c.work_id = w.id
      WHERE c.work_id = ? AND c.chapter_number = ?
    `, [workId, chapterNum]);
        if (!chapter) {
            return {
                canPublish: false,
                status: 'not_exist',
                auditStatus: 'none',
                chapterTitle: '',
                reason: '章节不存在',
            };
        }
        const c = chapter;
        // 检查内容是否存在
        if (!c.content || c.content.length < 100) {
            return {
                canPublish: false,
                status: c.status || 'empty',
                auditStatus: c.audit_status || 'pending',
                chapterTitle: c.title,
                reason: '章节内容不足',
            };
        }
        // 检查是否已润色
        if (c.status !== 'polished') {
            return {
                canPublish: false,
                status: c.status,
                auditStatus: c.audit_status || 'pending',
                chapterTitle: c.title,
                reason: `章节状态: ${c.status}，需要润色`,
            };
        }
        // 检查审核状态
        if (c.audit_status !== 'passed') {
            return {
                canPublish: false,
                status: c.status,
                auditStatus: c.audit_status || 'pending',
                chapterTitle: c.title,
                reason: `审核状态: ${c.audit_status || 'pending'}，需要审核通过`,
            };
        }
        return {
            canPublish: true,
            status: c.status,
            auditStatus: c.audit_status,
            chapterTitle: c.title,
        };
    }
    /**
     * 获取可以发布的章节列表
     */
    async getPublishableChapters(workId, fromChapter, toChapter) {
        const chapters = await this.db.query(`
      SELECT chapter_number, title, status, audit_status
      FROM chapters
      WHERE work_id = ? 
        AND chapter_number BETWEEN ? AND ?
        AND status = 'polished'
        AND audit_status = 'passed'
        AND content IS NOT NULL
        AND LENGTH(content) > 100
      ORDER BY chapter_number
    `, [workId, fromChapter, toChapter]);
        return chapters.map(c => ({
            chapterNum: c.chapter_number,
            chapterTitle: c.title,
            status: c.status,
            auditStatus: c.audit_status,
        }));
    }
    /**
     * 执行同步
     * 核心逻辑：匹配 → 检查 → 发布
     */
    async sync(options = {}) {
        const { dryRun = false, maxChaptersPerWork = 2, headed = false } = options;
        logger_1.logger.info(`开始同步${dryRun ? ' [试运行]' : ''}${headed ? ' [有头模式]' : ''}`);
        const result = {
            matched: 0,
            skipped: 0,
            published: 0,
            failed: 0,
            details: [],
        };
        // 1. 扫描番茄作品
        const fanqieWorks = await this.scanFanqieWorks(undefined, headed);
        for (const fw of fanqieWorks) {
            logger_1.logger.info(`\n处理: ${fw.title}`);
            // 2. 匹配本地作品
            const localWork = await this.matchLocalWork(fw.title);
            if (!localWork) {
                logger_1.logger.warn(`  ✗ 未找到匹配的本地作品`);
                result.skipped++;
                result.details.push({
                    workTitle: fw.title,
                    action: 'skipped',
                    message: '未找到匹配的本地作品',
                });
                continue;
            }
            logger_1.logger.info(`  ✓ 匹配到本地作品: ${localWork.title} (ID: ${localWork.id})`);
            result.matched++;
            // 3. 计算需要发布的章节
            // 从番茄最新章节往前推，找到第一个缺失的章节
            const localChapterCount = localWork.current_chapters || 0;
            const fanqieChapterCount = fw.latestChapterNum;
            if (localChapterCount <= fanqieChapterCount) {
                logger_1.logger.info(`  ℹ 本地章节(${localChapterCount}) <= 番茄章节(${fanqieChapterCount})，无需更新`);
                continue;
            }
            // 需要发布的章节范围
            const startChapter = fanqieChapterCount + 1;
            const endChapter = Math.min(startChapter + maxChaptersPerWork - 1, localChapterCount);
            logger_1.logger.info(`  → 检查章节 ${startChapter} - ${endChapter}`);
            // 4. 检查每个章节是否可以发布
            const publishableChapters = await this.getPublishableChapters(localWork.id, startChapter, endChapter);
            if (publishableChapters.length === 0) {
                logger_1.logger.warn(`  ⚠ 没有可发布的章节（需要润色且审核通过）`);
                // 详细显示每个章节的状态
                for (let i = startChapter; i <= endChapter; i++) {
                    const check = await this.checkChapterPublishable(localWork.id, i);
                    logger_1.logger.info(`    第${i}章: ${check.reason}`);
                }
                continue;
            }
            logger_1.logger.info(`  ✓ 找到 ${publishableChapters.length} 个可发布章节`);
            // 5. 发布章节
            // 初始化 FanqiePublisher
            const publisher = new FanqiePublisher_1.FanqiePublisher();
            // 获取账号配置
            const account = this.config.scheduler.fanqieAccounts.find(acc => acc.id === fw.accountId);
            if (!account) {
                logger_1.logger.error(`  ✗ 未找到账号配置: ${fw.accountId}`);
                result.skipped++;
                continue;
            }
            for (const chapter of publishableChapters) {
                if (dryRun) {
                    logger_1.logger.info(`  [试运行] 将发布: 第${chapter.chapterNum}章 ${chapter.chapterTitle}`);
                    result.published++;
                    result.details.push({
                        workTitle: fw.title,
                        action: 'published',
                        message: `[试运行] 第${chapter.chapterNum}章`,
                    });
                    continue;
                }
                // 实际发布 - 使用 FanqiePublisher
                try {
                    // 获取完整章节数据
                    const chapterData = await this.db.queryOne(`
            SELECT 
              c.work_id,
              w.title as work_title,
              c.chapter_number,
              c.title as chapter_title,
              c.content,
              c.word_count
            FROM chapters c
            JOIN works w ON c.work_id = w.id
            WHERE c.work_id = ? AND c.chapter_number = ?
          `, [localWork.id, chapter.chapterNum]);
                    if (!chapterData) {
                        throw new Error('章节数据不存在');
                    }
                    const chapterToPublish = {
                        workId: localWork.id,
                        workTitle: chapterData.work_title,
                        chapterNumber: chapter.chapterNum,
                        chapterTitle: chapterData.chapter_title || `第${chapter.chapterNum}章`,
                        content: chapterData.content,
                        wordCount: chapterData.word_count || chapterData.content?.length || 0,
                    };
                    logger_1.logger.info(`  → 开始发布: ${chapterToPublish.workTitle} 第${chapterToPublish.chapterNumber}章`);
                    const publishResult = await publisher.publishChapter(chapterToPublish, {
                        id: account.id,
                        name: account.name,
                        browserDir: account.browserDir || `./browser-data/${account.id}`,
                        cookiesFile: account.cookiesFile || `./browser-data/${account.id}/cookies.json`,
                    }, { dryRun: false, headless: !headed });
                    if (publishResult.success) {
                        logger_1.logger.info(`  ✓ 发布成功: 第${chapter.chapterNum}章`);
                        result.published++;
                        result.details.push({
                            workTitle: fw.title,
                            action: 'published',
                            message: `第${chapter.chapterNum}章发布成功`,
                        });
                    }
                    else {
                        logger_1.logger.error(`  ✗ 发布失败: ${publishResult.message}`);
                        result.failed++;
                        result.details.push({
                            workTitle: fw.title,
                            action: 'failed',
                            message: `第${chapter.chapterNum}章: ${publishResult.message}`,
                        });
                    }
                    // 发布间隔
                    await (0, helpers_1.delay)(3000);
                }
                catch (error) {
                    logger_1.logger.error(`  ✗ 发布异常: ${error.message}`);
                    result.failed++;
                    result.details.push({
                        workTitle: fw.title,
                        action: 'failed',
                        message: `第${chapter.chapterNum}章: ${error.message}`,
                    });
                }
            }
        }
        logger_1.logger.info(`\n同步完成: 匹配${result.matched} 跳过${result.skipped} 发布${result.published} 失败${result.failed}`);
        return result;
    }
    /**
     * 发布单个章节
     * 实际实现需要调用番茄API或模拟浏览器操作
     */
    async publishChapter(workId, chapterNum, accountId) {
        logger_1.logger.info(`  → 发布第${chapterNum}章到账号 ${accountId}`);
        // 获取章节内容
        const chapter = await this.db.queryOne(`
      SELECT title, content FROM chapters 
      WHERE work_id = ? AND chapter_number = ?
    `, [workId, chapterNum]);
        if (!chapter) {
            return { success: false, error: '章节不存在' };
        }
        const c = chapter;
        // 这里需要实现实际的发布逻辑
        // 方案1: 调用番茄API（如果有）
        // 方案2: 使用 Playwright 模拟浏览器操作
        // 方案3: 调用外部脚本（如 publish-to-fanqie.js）
        // 简化实现：记录到操作日志
        await this.db.execute(`
      INSERT INTO action_log (work_id, action, chapter_num, result, timestamp)
      VALUES (?, 'publish_fanqie', ?, 'success', NOW())
    `, [workId, chapterNum]);
        // 更新章节状态
        await this.db.execute(`
      UPDATE chapters SET status = 'published', updated_at = NOW()
      WHERE work_id = ? AND chapter_number = ?
    `, [workId, chapterNum]);
        return { success: true };
    }
    /**
     * 获取同步状态报告
     */
    async getSyncReport() {
        const [totalWorks] = await this.db.query('SELECT COUNT(*) as cnt FROM works');
        const [matchedWorks] = await this.db.query(`
      SELECT COUNT(DISTINCT w.id) as cnt 
      FROM works w
      JOIN chapters c ON w.id = c.work_id
      WHERE c.status = 'polished' AND c.audit_status = 'passed'
    `);
        const [pendingPublish] = await this.db.query(`
      SELECT COUNT(*) as cnt FROM chapters
      WHERE status = 'polished' AND audit_status = 'passed'
    `);
        return {
            totalWorks: totalWorks.cnt || 0,
            matchedWorks: matchedWorks.cnt || 0,
            pendingPublish: pendingPublish.cnt || 0,
            lastSyncAt: new Date().toISOString(),
        };
    }
}
exports.FanqieSyncService = FanqieSyncService;
//# sourceMappingURL=fanqie-sync-service.js.map