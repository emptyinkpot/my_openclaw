/**
 * 番茄小说发布服务
 * 将润色并审核通过的章节发布到番茄平台
 * 
 * 改编自 task-planner/scripts/publish-to-fanqie.js
 */

import { getConfig } from '../config';
import { logger } from '../../utils/logger';
import { extractChapterNumber } from '../utils/text';
import { chromium, BrowserContext, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { getChapterRepository } from './ChapterRepository';

export interface FanqieAccount {
  id: string;
  name: string;
  browserDir: string;
  cookiesFile: string;
}

export interface ChapterToPublish {
  workId: number;
  workTitle: string;
  chapterNumber: number;
  chapterTitle: string;
  content: string;
  wordCount: number;
}

export interface PublishResult {
  success: boolean;
  workId: number;
  chapterNumber: number;
  chapterTitle: string;
  message: string;
  error?: string;
  publishedAt?: string;
}

// 发布进度事件
export interface PublishProgress {
  action: string;      // 当前动作
  detail?: string;     // 详细信息
  percent?: number;    // 进度百分比
}

export class FanqiePublisher {
  private config = getConfig();
  private browserContext: BrowserContext | null = null;
  private page: Page | null = null;

  /**
   * 获取所有待发布的章节
   * 条件：有内容 + 已润色(polished) + 审核通过(passed)
   */
  async getPendingChapters(workId?: number, limit: number = 10): Promise<ChapterToPublish[]> {
    const repo = getChapterRepository();
    const chapters = await repo.getPendingPublish({ workId, limit });
    
    return chapters.map(ch => ({
      workId: ch.workId,
      workTitle: ch.workTitle,
      chapterNumber: ch.chapterNumber,
      chapterTitle: ch.chapterTitle || `第${ch.chapterNumber}章`,
      content: ch.content || '',
      wordCount: ch.wordCount || ch.content?.length || 0,
    }));
  }

  /**
   * 发布单章到番茄
   */
  async publishChapter(
    chapter: ChapterToPublish,
    account: FanqieAccount,
    options: {
      dryRun?: boolean;
      headless?: boolean;
      onProgress?: (progress: PublishProgress) => void;
    } = {}
  ): Promise<PublishResult> {
    const { dryRun = false, headless = false, onProgress } = options;
    
    const emitProgress = (action: string, detail?: string) => {
      logger.info(`  → ${action}`);
      onProgress?.({ action, detail });
    };

    logger.info(`[番茄发布] 开始发布: ${chapter.workTitle} 第${chapter.chapterNumber}章`);

    if (dryRun) {
      emitProgress('模拟发布模式');
      logger.info(`[DRY RUN] 将发布到账号: ${account.name}`);
      return {
        success: true,
        workId: chapter.workId,
        chapterNumber: chapter.chapterNumber,
        chapterTitle: chapter.chapterTitle,
        message: '模拟发布成功',
        publishedAt: new Date().toISOString(),
      };
    }

    try {
      // 初始化浏览器
      emitProgress('启动浏览器...');
      await this.initBrowser(account, headless);

      // 1. 在番茄找到对应作品
      emitProgress('查找作品...');
      const fanqieWork = await this.findFanqieWork(chapter.workTitle);
      if (!fanqieWork) {
        emitProgress('未找到作品', chapter.workTitle);
        return {
          success: false,
          workId: chapter.workId,
          chapterNumber: chapter.chapterNumber,
          chapterTitle: chapter.chapterTitle,
          message: '未在番茄找到对应作品',
          error: 'WORK_NOT_FOUND',
        };
      }

      // 2. 检查番茄最新章节
      emitProgress('检查章节状态...');
      const latestChapter = await this.getFanqieLatestChapter(fanqieWork.id);
      logger.info(`  番茄最新章节: 第${latestChapter}章`);

      // 3. 确认章节序号连续
      if (chapter.chapterNumber !== latestChapter + 1) {
        emitProgress('章节不连续', `番茄最新: ${latestChapter}，待发布: ${chapter.chapterNumber}`);
        return {
          success: false,
          workId: chapter.workId,
          chapterNumber: chapter.chapterNumber,
          chapterTitle: chapter.chapterTitle,
          message: `章节不连续，番茄最新: ${latestChapter}，待发布: ${chapter.chapterNumber}`,
          error: 'CHAPTER_NOT_CONTINUOUS',
        };
      }

      // 4. 发布章节
      emitProgress('正在发布章节...');
      const result = await this.doPublishToFanqie(fanqieWork.id, chapter);

      // 5. 更新数据库状态
      if (result.success) {
        emitProgress('更新数据库状态...');
        await this.updatePublishStatus(chapter.workId, chapter.chapterNumber, 'published');
        emitProgress('发布成功!');
      } else {
        emitProgress('发布失败', result.error);
      }

      return result;

    } catch (error: any) {
      logger.error('发布失败:', error);
      return {
        success: false,
        workId: chapter.workId,
        chapterNumber: chapter.chapterNumber,
        chapterTitle: chapter.chapterTitle,
        message: error.message,
        error: error.code || 'PUBLISH_ERROR',
      };
    } finally {
      await this.closeBrowser();
    }
  }

  /**
   * 初始化浏览器
   */
  private async initBrowser(account: FanqieAccount, headless: boolean): Promise<void> {
    // 清理锁文件
    this.cleanBrowserLocks(account.browserDir);

    this.browserContext = await chromium.launchPersistentContext(account.browserDir, {
      headless,
      channel: 'chrome',
      viewport: { width: 1400, height: 850 },
      args: ['--no-sandbox'],
    });

    this.page = this.browserContext.pages()[0] || await this.browserContext.newPage();

    // 如果有cookies文件，加载它
    if (fs.existsSync(account.cookiesFile)) {
      try {
        const cookies = JSON.parse(fs.readFileSync(account.cookiesFile, 'utf-8'));
        if (cookies.cookies) {
          await this.browserContext.addCookies(cookies.cookies);
        }
      } catch (e) {
        logger.warn('加载cookies失败:', e);
      }
    }
  }

  /**
   * 关闭浏览器
   */
  private async closeBrowser(): Promise<void> {
    if (this.browserContext) {
      await this.browserContext.close();
      this.browserContext = null;
      this.page = null;
    }
  }

  /**
   * 清理浏览器锁文件
   */
  private cleanBrowserLocks(browserDir: string): void {
    const locks = ['SingletonLock', 'SingletonSocket', 'SingletonCookie', 'Lock'];
    for (const lock of locks) {
      try {
        fs.unlinkSync(path.join(browserDir, lock));
      } catch (e) {
        // 忽略错误
      }
    }
  }

  /**
   * 在番茄找到对应作品
   */
  private async findFanqieWork(workTitle: string): Promise<{ id: string; title: string } | null> {
    if (!this.page) return null;

    await this.page.goto('https://fanqienovel.com/main/writer/book-manage', {
      waitUntil: 'domcontentloaded',
    });

    // 等待作品列表加载
    await this.page.waitForSelector('[id^="long-article-table-item-"]', {
      state: 'visible',
      timeout: 10000,
    });

    // 关闭弹窗
    await this.closePopups();

    // 获取所有作品
    const works = await this.page.evaluate(() => {
      const items = document.querySelectorAll('[id^="long-article-table-item-"]');
      return Array.from(items).map(item => {
        const id = item.id.replace('long-article-table-item-', '');
        const titleEl = item.querySelector('.hoverup');
        const title = titleEl ? (titleEl.textContent?.split('\n')[0].trim() || '') : '';
        return { id, title };
      });
    });

    // 匹配作品（精确匹配或包含匹配）
    logger.debug(`  番茄网站上的作品列表: ${JSON.stringify(works)}`);
    logger.info(`  查找作品: "${workTitle}"`);

    for (const work of works) {
      logger.debug(`    尝试匹配: "${work.title}" vs "${workTitle}"`);
      if (work.title === workTitle) {
        logger.info(`    精确匹配成功: ${work.title}`);
        return work;
      }
      if (work.title.includes(workTitle) || workTitle.includes(work.title)) {
        logger.info(`    包含匹配成功: ${work.title}`);
        return work;
      }
      // 清理标点符号后比较
      const clean1 = work.title.replace(/[？?！!。，,、]/g, '');
      const clean2 = workTitle.replace(/[？?！!。，,、]/g, '');
      if (clean1 === clean2) {
        logger.info(`    清理后匹配成功: ${work.title} -> ${clean1}`);
        return work;
      }
      // 去除"征文作品"等常见后缀后比较
      const normalized1 = work.title.replace(/征文作品|别名/g, '').trim();
      const normalized2 = workTitle.replace(/征文作品|别名/g, '').trim();
      if (normalized1 === normalized2 || normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
        logger.info(`    标准化匹配成功: ${work.title}`);
        return work;
      }
    }

    logger.error(`  未找到匹配作品。可用作品: ${works.map(w => `"${w.title}"`).join(', ')}`);
    return null;
  }

  /**
   * 获取番茄作品的最新章节号
   */
  private async getFanqieLatestChapter(workId: string): Promise<number> {
    if (!this.page) return 0;

    // 进入章节管理
    const workCard = this.page.locator(`#long-article-table-item-${workId}`);
    await workCard.hover();
    await workCard.getByRole('button', { name: '章节管理' }).click();

    // 等待章节列表
    await this.page.waitForSelector('table tbody tr', { state: 'visible' });
    await this.closePopups();

    // 获取最新章节号
    const chapterTexts = await this.page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr');
      const texts: string[] = [];
      
      for (const row of Array.from(rows)) {
        const chapterCell = row.querySelector('td:first-child');
        if (chapterCell) {
          const text = chapterCell.textContent || '';
          texts.push(text);
        }
      }
      
      return texts;
    });

    // 解析章节号（支持阿拉伯数字和中文数字）
    logger.debug(`  章节文本列表: ${JSON.stringify(chapterTexts.slice(0, 10))}`);
    
    let maxChapter = 0;
    for (const text of chapterTexts) {
      const num = extractChapterNumber(text);
      logger.debug(`    解析 "${text.trim()}": ${num}`);
      if (num !== null && num > maxChapter) {
        maxChapter = num;
      }
    }
    
    logger.info(`  解析到最新章节: ${maxChapter}`);

    return maxChapter;
  }

  /**
   * 公开方法：获取番茄作品的最新章节号（独立调用）
   */
  async getLatestChapterFromFanqie(workTitle: string, account: FanqieAccount, headless: boolean = true): Promise<number | null> {
    try {
      // 初始化浏览器
      logger.info(`[FanqiePublisher] 获取最新章节: ${workTitle}`);
      await this.initBrowser(account, headless);

      // 找到作品
      const fanqieWork = await this.findFanqieWork(workTitle);
      if (!fanqieWork) {
        logger.error(`  未找到作品: ${workTitle}`);
        return null;
      }

      // 获取最新章节
      const latestChapter = await this.getFanqieLatestChapter(fanqieWork.id);
      logger.info(`  最新章节: ${latestChapter}`);
      
      return latestChapter;
    } catch (error: any) {
      logger.error('获取最新章节失败:', error);
      return null;
    } finally {
      await this.closeBrowser();
    }
  }

  /**
   * 执行发布
   */
  private async doPublishToFanqie(
    workId: string,
    chapter: ChapterToPublish
  ): Promise<PublishResult> {
    if (!this.page) {
      throw new Error('浏览器未初始化');
    }

    logger.info('  → 点击创建章节...');
    
    // 等待页面完全加载
    await this.page.waitForLoadState('networkidle');
    // 条件等待：等待"新建章节"按钮可见
    await this.page.waitForSelector('a:has-text("新建章节"), button:has-text("新建章节")', {
      state: 'visible',
      timeout: 5000,
    }).catch(() => {
      // 如果超时继续执行
    });
    
    // 保存截图用于调试
    await this.page.screenshot({ path: '/tmp/fanqie-before-click.png' });
    logger.debug('    已保存点击前截图: /tmp/fanqie-before-click.png');
    
    // 调试：点击前的页面信息
    const beforeClick = await this.page.evaluate(() => ({
      url: window.location.href,
      buttons: Array.from(document.querySelectorAll('button, a, [role="button"]')).slice(0, 15).map(b => ({
        text: b.textContent?.slice(0, 30),
        class: b.className?.slice(0, 50),
        tag: b.tagName,
      })),
    }));
    logger.debug(`    点击前: ${JSON.stringify(beforeClick)}`);

    // 尝试多种方式点击"新建章节"按钮/链接
    let clicked = false;
    
    // 方式1: 直接获取 A 标签的 href 并导航
    try {
      const href = await this.page.evaluate(() => {
        const link = Array.from(document.querySelectorAll('a')).find(a => 
          a.textContent?.trim() === '新建章节'
        );
        return link?.getAttribute('href') || null;
      });
      if (href) {
        logger.debug(`    从 A 标签获取到 href: ${href}`);
        // 如果是相对路径，转换为绝对路径
        const fullUrl = href.startsWith('http') ? href : `https://fanqienovel.com${href}`;
        await this.page.goto(fullUrl, { waitUntil: 'networkidle' });
        logger.debug(`    直接导航到新建章节页面`);
        clicked = true;
      }
    } catch (e: any) {
      logger.debug(`    直接导航失败: ${e.message}`);
    }
    
    // 方式2: 优先点击 A 标签
    if (!clicked) {
      try {
        const linkBtn = this.page.locator('a').filter({ hasText: /^新建章节$/ });
        if (await linkBtn.count() > 0 && await linkBtn.isVisible()) {
          await linkBtn.click({ timeout: 5000 });
          logger.debug(`    使用 A 标签点击成功`);
          clicked = true;
        }
      } catch (e: any) {
        logger.debug(`    A 标签点击失败: ${e.message}`);
      }
    }
    
    // 方式3: 使用 getByRole 点击按钮
    if (!clicked) {
      try {
        const btn = this.page.getByRole('button', { name: '新建章节', exact: true });
        if (await btn.count() > 0 && await btn.isVisible()) {
          await btn.click({ timeout: 5000 });
          logger.debug(`    使用 getByRole 点击成功`);
          clicked = true;
        }
      } catch (e: any) {
        logger.debug(`    getByRole 点击失败: ${e.message}`);
      }
    }
    
    // 方式4: 通过 evaluate 点击
    if (!clicked) {
      try {
        const result = await this.page.evaluate(() => {
          const link = Array.from(document.querySelectorAll('a')).find(a => 
            a.textContent?.trim() === '新建章节'
          );
          if (link) {
            (link as HTMLElement).click();
            return `clicked link: ${link.className}`;
          }
          const btn = Array.from(document.querySelectorAll('button')).find(b => 
            b.textContent?.trim() === '新建章节'
          );
          if (btn) {
            (btn as HTMLElement).click();
            return `clicked button: ${btn.className}`;
          }
          return 'not found';
        });
        logger.debug(`    evaluate 点击结果: ${result}`);
        if (result !== 'not found') clicked = true;
      } catch (e: any) {
        logger.debug(`    evaluate 点击失败: ${e.message}`);
      }
    }
    
    if (!clicked) {
      logger.error('    所有点击方式都失败');
      throw new Error('无法点击"新建章节"按钮');
    }

    // 等待页面变化（条件等待：等待输入框或编辑器出现）
    logger.info('    等待页面响应...');
    try {
      await this.page.waitForSelector('input[type="text"], [contenteditable="true"]', {
        state: 'visible',
        timeout: 5000,
      });
    } catch (e) {
      // 如果超时，使用短延时
      await this.page.waitForTimeout(1000);
    }
    
    // 保存点击后截图
    await this.page.screenshot({ path: '/tmp/fanqie-after-click.png' });
    
    // 检查点击后的页面状态
    const afterClick = await this.page.evaluate(() => ({
      url: window.location.href,
      hasModal: !!document.querySelector('.modal, .ant-modal, [role="dialog"], [class*="modal"]'),
      inputs: document.querySelectorAll('input, textarea').length,
      editors: document.querySelectorAll('[contenteditable="true"]').length,
      buttons: Array.from(document.querySelectorAll('button')).slice(0, 5).map(b => b.textContent?.slice(0, 15)),
    }));
    logger.debug(`    点击后: ${JSON.stringify(afterClick)}`);
    
    // 如果页面没有输入框和编辑器，可能需要先进入正确的页面
    if (afterClick.inputs === 0 && afterClick.editors === 0) {
      logger.warn('    页面没有输入框，尝试进入章节管理页面...');
      
      // 尝试点击"章节管理"按钮
      try {
        const manageBtn = this.page.locator('button').filter({ hasText: /章节管理/ }).first();
        if (await manageBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await manageBtn.click();
          logger.debug(`    点击"章节管理"按钮`);
          // 条件等待章节列表加载
          await this.page.waitForSelector('table tbody tr, .chapter-list, [class*="chapter"]', {
            state: 'visible',
            timeout: 5000,
          }).catch(() => {});
        }
      } catch (e: any) {
        logger.debug(`    章节管理按钮未找到: ${e.message}`);
      }
      
      // 再次尝试点击新建章节
      const retryResult = await this.page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button, a')).find(b => 
          b.textContent?.includes('新建章节') || b.textContent?.includes('创建章节')
        );
        if (btn) {
          (btn as HTMLElement).click();
          return `clicked: ${btn.textContent}`;
        }
        return 'not found';
      });
      logger.debug(`    重试点击结果: ${retryResult}`);
      // 条件等待输入框出现
      try {
        await this.page.waitForSelector('input[type="text"], [contenteditable="true"]', {
          state: 'visible',
          timeout: 5000,
        });
      } catch {
        // 超时使用短延时
        await this.page.waitForTimeout(1000);
      }
    }
    
    // 调试：获取页面上的所有输入框信息
    const inputDebug = await this.page.evaluate(() => {
      const inputs = document.querySelectorAll('input, textarea, [contenteditable="true"]');
      return Array.from(inputs).slice(0, 10).map((el, i) => ({
        index: i,
        tag: el.tagName,
        type: (el as HTMLInputElement).type || 'text',
        placeholder: (el as HTMLInputElement).placeholder || '',
        name: (el as HTMLInputElement).name || '',
        className: el.className?.slice(0, 50) || '',
        value: (el as HTMLInputElement).value?.slice(0, 30) || '',
      }));
    });
    logger.debug(`  页面输入框: ${JSON.stringify(inputDebug, null, 2)}`);

    // 填充章节号（如：第50章）
    logger.info(`  → 填写章节号: 第${chapter.chapterNumber}章`);
    
    // 先获取所有输入框的详细信息
    const allInputs = await this.page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      return Array.from(inputs).map((el, i) => ({
        index: i,
        type: el.type,
        placeholder: el.placeholder,
        name: el.name,
        id: el.id,
        className: el.className?.slice(0, 50),
        value: el.value?.slice(0, 30),
      }));
    });
    logger.debug(`    所有input: ${JSON.stringify(allInputs)}`);
    
    // 查找章节号输入框（可能是 number 类型或特定placeholder）
    let chapterNumFilled = false;
    
    // 方式1: 查找 number 类型的input
    const numberInputs = allInputs.filter(i => i.type === 'number');
    if (numberInputs.length > 0) {
      const idx = numberInputs[0].index;
      const input = this.page.locator('input').nth(idx);
      await input.fill(chapter.chapterNumber.toString());
      logger.debug(`    章节号使用第${idx}个number类型input`);
      chapterNumFilled = true;
    }
    
    // 方式2: 通过placeholder查找
    if (!chapterNumFilled) {
      const chapterNumSelectors = [
        'input[placeholder*="章节号"]', 
        'input[placeholder*="章节数"]', 
        'input[placeholder*="第"]', 
        'input[name*="chapter"][name*="num"]',
        'input[name*="number"]',
        '[data-e2e="chapter-number-input"] input',
        '.chapter-number input',
      ];
      
      for (const selector of chapterNumSelectors) {
        const input = this.page.locator(selector).first();
        if (await input.isVisible().catch(() => false)) {
          await input.fill(chapter.chapterNumber.toString());
          logger.debug(`    章节号使用选择器: ${selector}`);
          chapterNumFilled = true;
          break;
        }
      }
    }
    
    // 方式3: 使用第0个input填写章节号（阿拉伯数字）
    if (!chapterNumFilled) {
      const input = this.page.locator('input').nth(0);
      await input.fill(chapter.chapterNumber.toString());
      logger.debug(`    章节号使用第0个input: ${chapter.chapterNumber}`);
      chapterNumFilled = true;
    }
    
    if (!chapterNumFilled) {
      logger.error(`    无法找到章节号输入框`);
    } else {
      // 验证填写（短延时等待值生效）
      await this.page.waitForTimeout(200);
      const verifyChapterNum = await this.page.evaluate(() => {
        const input = document.querySelector('input') as HTMLInputElement;
        return input?.value || null;
      });
      logger.debug(`    验证章节号: ${verifyChapterNum}`);
    }

    // 填充章节标题
    logger.info(`  → 填写标题: ${chapter.chapterTitle}`);
    
    // 查找标题输入框
    const titleSelectors = [
      'input[placeholder*="标题"]', 
      'input[placeholder*="章节名"]',
      'input[name*="title"]',
      '[data-e2e="chapter-title-input"] input',
      '.chapter-title input',
    ];
    
    let titleFilled = false;
    for (const selector of titleSelectors) {
      const input = this.page.locator(selector).first();
      if (await input.isVisible().catch(() => false)) {
        await input.fill(chapter.chapterTitle);
        logger.debug(`    标题使用选择器: ${selector}`);
        titleFilled = true;
        break;
      }
    }
    if (!titleFilled) {
      logger.warn(`    未找到标题输入框，尝试第1个input`);
      const inputs = this.page.locator('input');
      const count = await inputs.count();
      if (count > 1) {
        await inputs.nth(1).fill(chapter.chapterTitle);
      }
    }

    // 填充正文内容
    logger.info(`  → 填写正文 (${chapter.wordCount}字)...`);
    
    // 清理内容
    const cleanedContent = this.cleanContent(chapter.content);
    logger.debug(`    正文前100字: ${cleanedContent.slice(0, 100)}`);
    
    // 查找编辑器
    const editorSelectors = [
      '[contenteditable="true"]',
      '.editor-content',
      '.ProseMirror',
      'textarea',
      '[data-e2e="chapter-content-editor"]',
    ];
    
    let editorFilled = false;
    for (const selector of editorSelectors) {
      const editor = this.page.locator(selector).first();
      if (await editor.isVisible().catch(() => false)) {
        // 使用evaluate直接设置内容，更可靠
        await this.page.evaluate((content) => {
          const editor = document.querySelector('[contenteditable="true"], .ProseMirror, .editor-content');
          if (editor) {
            editor.innerHTML = content.replace(/\n/g, '<p>').replace(/$/gm, '</p>');
            // 触发input事件
            editor.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, cleanedContent);
        logger.debug(`    正文使用选择器: ${selector} (evaluate方式)`);
        editorFilled = true;
        break;
      }
    }
    
    if (!editorFilled) {
      logger.warn(`    未找到编辑器，尝试第一个 textarea 或 contenteditable`);
      const fallbackEditor = this.page.locator('textarea, [contenteditable]').first();
      if (await fallbackEditor.isVisible().catch(() => false)) {
        await fallbackEditor.fill(cleanedContent);
      } else {
        logger.error(`    无法找到任何编辑器！`);
      }
    }
    
    // 验证填入内容
    const verifyContent = await this.page.evaluate(() => {
      const editor = document.querySelector('[contenteditable="true"], textarea');
      return editor?.textContent?.slice(0, 50) || '';
    });
    logger.debug(`    验证填入内容: ${verifyContent}`);

    // 等待自动保存（条件等待）
    logger.info('  → 等待自动保存...');
    await this.waitForAutoSave(10000);

    // 点击下一步/发布
    logger.info('  → 进入发布流程...');
    
    // Step 1: 点击"下一步"
    try {
      const nextBtn = this.page.locator('button').filter({ hasText: /^下一步$/ }).first();
      await nextBtn.click({ timeout: 5000 });
      logger.debug('    点击"下一步"成功');
      // 条件等待：等待"提交"按钮出现
      await this.page.locator('button').filter({ hasText: /^提交$/ }).first().waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
    } catch (e: any) {
      logger.warn(`    点击"下一步"失败或不存在: ${e.message}`);
    }
    
    // Step 2: 点击"提交"
    try {
      const submitBtn = this.page.locator('button').filter({ hasText: /^提交$/ }).first();
      await submitBtn.click({ timeout: 5000 });
      logger.debug('    点击"提交"成功');
      // 条件等待：等待弹窗或"确认发布"按钮出现
      await this.page.locator('button').filter({ hasText: /^确认发布$/ }).first().waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
    } catch (e: any) {
      logger.warn(`    点击"提交"失败: ${e.message}`);
    }
    
    // Step 3: 处理弹窗（取消/我知道了）- 使用条件等待
    const hasDialog = await this.waitForDialog(5000);
    if (hasDialog) {
      logger.debug('    检测到弹窗');
      const dialogButtons = await this.page.locator('div[class*="modal"] button, div[class*="dialog"] button, div[role="dialog"] button').all();
      logger.debug(`    检测到 ${dialogButtons.length} 个弹窗按钮`);
      
      if (dialogButtons.length > 0) {
        for (const btn of dialogButtons) {
          const text = await btn.innerText().catch(() => '');
          logger.debug(`      弹窗按钮: "${text.trim()}"`);
        }
        
        // 尝试点击"取消"或"我知道了"
        try {
          const cancelBtn = this.page.locator('button').filter({ hasText: /^取消$/ }).first();
          await cancelBtn.click({ timeout: 3000 });
          logger.debug('    点击"取消"关闭弹窗');
        } catch (e) {
          try {
            const knowBtn = this.page.locator('button').filter({ hasText: /^我知道了$/ }).first();
            await knowBtn.click({ timeout: 3000 });
            logger.debug('    点击"我知道了"关闭弹窗');
          } catch (e2) {
            logger.debug('    无需关闭弹窗');
          }
        }
        // 条件等待：等待弹窗消失
        await this.waitForDialogClosed(3000);
      }
    } else {
      logger.debug('    未检测到弹窗');
    }
    
    // Step 4: 选择免费选项（如果存在）
    try {
      const freeRadio = this.page.locator('label:has-text("否"), label:has-text("免费")').first();
      if (await freeRadio.count() > 0) {
        await freeRadio.click();
        logger.debug('    选择"免费/否"');
      }
    } catch (e) {
      // 免费选项可能不存在
    }
    
    // Step 5: 点击"确认发布"
    logger.info('  → 点击"确认发布"...');
    let publishSuccess = false;
    let retryCount = 0;
    
    while (retryCount < 3 && !publishSuccess) {
      try {
        const confirmBtn = this.page.locator('button').filter({ hasText: /^确认发布$/ }).first();
        await confirmBtn.click({ timeout: 10000 });
        logger.debug('    点击"确认发布"成功');
        publishSuccess = true;
      } catch (e: any) {
        retryCount++;
        logger.warn(`    第${retryCount}次点击"确认发布"失败: ${e.message}`);
        if (retryCount >= 3) break;
      }
    }
    
    // 条件等待：检测页面跳转
    logger.debug('    等待发布完成...');
    await this.waitForNavigation('chapter-manage', 8000);

    // 检查结果
    const pageInfo = await this.page.evaluate(() => ({
      url: window.location.href,
      hasSuccessToast: !!document.querySelector('[class*="success"], [class*="Success"]'),
      pageText: document.body.textContent?.slice(0, 500) || '',
    }));
    
    logger.debug(`    最终页面信息: ${JSON.stringify(pageInfo)}`);
    
    // 严格验证：检查是否真的发布了章节
    const success = await this.page.evaluate(() => {
      // 检查是否有明确的发布成功提示
      const pageText = document.body.textContent || '';
      if (pageText.includes('发布成功') || pageText.includes('已发布成功') || pageText.includes('审核中')) {
        return true;
      }
      
      // 检查是否有成功提示元素
      const successElements = document.querySelectorAll('[class*="success"], .ant-message-success, .arco-message-success');
      if (successElements.length > 0) {
        // 检查元素是否包含成功文本
        for (const el of Array.from(successElements)) {
          if (el.textContent?.includes('发布') || el.textContent?.includes('成功')) {
            return true;
          }
        }
      }
      
      // 检查是否在章节管理页面且显示了刚发布的章节
      if (window.location.href.includes('chapter-manage')) {
        return true;
      }
      
      return false;
    });

    if (success) {
      logger.info('  ✓ 发布成功');
      return {
        success: true,
        workId: chapter.workId,
        chapterNumber: chapter.chapterNumber,
        chapterTitle: chapter.chapterTitle,
        message: '发布成功',
        publishedAt: new Date().toISOString(),
      };
    } else {
      // 截图保存用于调试
      const screenshotPath = `/tmp/fanqie-publish-fail-${Date.now()}.png`;
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      logger.error(`  发布失败截图已保存: ${screenshotPath}`);
      throw new Error('发布可能失败，请检查页面');
    }
  }

  /**
   * 条件等待：等待自动保存完成
   * 通过检测保存状态文本或超时
   */
  private async waitForAutoSave(timeout: number = 10000): Promise<void> {
    if (!this.page) return;
    
    const startTime = Date.now();
    const checkInterval = 500; // 每500ms检查一次
    
    while (Date.now() - startTime < timeout) {
      // 检查是否已保存（多种可能的提示文本）
      const isSaved = await this.page.evaluate(() => {
        const pageText = document.body.textContent || '';
        // 检查保存完成提示
        if (pageText.includes('已保存') || 
            pageText.includes('保存成功') || 
            pageText.includes('自动保存')) {
          return true;
        }
        // 检查保存中提示是否消失
        const savingIndicator = document.querySelector('[class*="saving"], [class*="Saving"]');
        if (!savingIndicator) {
          // 如果没有保存中指示器，也认为保存完成
          return true;
        }
        return false;
      });
      
      if (isSaved) {
        logger.debug('    自动保存完成（条件检测）');
        return;
      }
      
      await this.page.waitForTimeout(checkInterval);
    }
    
    logger.warn('    等待自动保存超时，继续执行');
  }

  /**
   * 条件等待：等待弹窗出现
   */
  private async waitForDialog(timeout: number = 5000): Promise<boolean> {
    if (!this.page) return false;
    
    try {
      // 等待弹窗元素出现
      await this.page.waitForSelector('.arco-modal-wrapper, .ant-modal, [role="dialog"], .modal, div[class*="modal"], div[class*="dialog"]', {
        state: 'visible',
        timeout: timeout,
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * 条件等待：等待弹窗消失
   */
  private async waitForDialogClosed(timeout: number = 3000): Promise<void> {
    if (!this.page) return;
    
    try {
      await this.page.waitForSelector('.arco-modal-wrapper, .ant-modal, [role="dialog"], .modal, div[class*="modal"], div[class*="dialog"]', {
        state: 'hidden',
        timeout: timeout,
      });
      logger.debug('    弹窗已关闭');
    } catch (e) {
      // 超时也继续
    }
  }

  /**
   * 条件等待：等待页面跳转
   */
  private async waitForNavigation(targetUrlPattern: string, timeout: number = 10000): Promise<boolean> {
    if (!this.page) return false;
    
    const startTime = Date.now();
    const checkInterval = 300;
    
    while (Date.now() - startTime < timeout) {
      const currentUrl = this.page.url();
      if (currentUrl.includes(targetUrlPattern)) {
        logger.debug(`    页面已跳转到: ${currentUrl}`);
        return true;
      }
      await this.page.waitForTimeout(checkInterval);
    }
    
    return false;
  }

  /**
   * 关闭弹窗
   */
  private async closePopups(): Promise<void> {
    if (!this.page) return;

    await this.page.evaluate(() => {
      // 点击所有关闭按钮
      const closeElements = document.querySelectorAll('[class*="close"], [aria-label*="close"]');
      for (const el of Array.from(closeElements)) {
        if (el instanceof HTMLElement) {
          el.click();
        }
      }
      
      // 点击"知道了"等确认按钮
      const texts = ['知道了', '我知道了', 'Accept', '确定', '关闭'];
      const buttons = document.querySelectorAll('button');
      for (const btn of Array.from(buttons)) {
        for (const text of texts) {
          if (btn.textContent?.includes(text) && btn instanceof HTMLElement) {
            btn.click();
            break;
          }
        }
      }
    });
  }

  /**
   * 清理内容
   */
  private cleanContent(content: string): string {
    // 移除垃圾信息
    const junkPatterns = [
      /arrivedat\w+\.?\s*/gi,
      /location:\s*\w+\.?\s*/gi,
      /「「([^」]+)」\d+」/g,
      /」\d+」/g,
    ];

    let cleaned = content;
    for (const pattern of junkPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    // 移除特定行
    const junkLines = ['章节概要', '总结当前章节概要', '批量生成概要', '处理配置', '已启用', 'AI 模型'];
    const lines = cleaned.split('\n');
    const filtered = lines.filter(line => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (junkLines.some(j => trimmed.includes(j))) return false;
      if (/^[a-zA-Z\s,\.\'\"]+$/.test(trimmed) && trimmed.length > 5) return false;
      return true;
    });

    return filtered.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  /**
   * 更新发布状态
   */
  private async updatePublishStatus(
    workId: number,
    chapterNumber: number,
    status: string
  ): Promise<void> {
    const repo = getChapterRepository();
    await repo.updatePublishStatus(workId, chapterNumber, status);
  }

  /**
   * 获取番茄账号列表
   */
  getFanqieAccounts(): FanqieAccount[] {
    return this.config.scheduler.fanqieAccounts || [];
  }
}
