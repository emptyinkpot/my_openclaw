/**
 * 番茄小说网站模块
 * 
 * 使用方式：
 * 1. 共享模式（默认）：使用 default 浏览器，与其他网站共享
 * 2. 独立模式：指定 accountId，使用独立浏览器目录
 */

const { BaseSite } = require('./base');
const { BrowserManager } = require('../browser/manager');

class FanqieSite extends BaseSite {
  /**
   * @param {string} accountId - 账号ID
   *   - 不传或 null: 使用独立模式（fanqie-1 浏览器）
   *   - 传入 ID: 使用独立模式（fanqie-{ID} 浏览器）
   */
  constructor(accountId = '1') {
    super('fanqie', accountId);
    this.accountId = accountId;
  }
  
  /**
   * 初始化浏览器（独立模式）
   */
  async initBrowser() {
    const instance = await BrowserManager.getSiteBrowser('fanqie', this.accountId);
    this.context = instance.context;
    this.page = instance.page;
    return instance;
  }
  
  // ============ 番茄小说特有方法 ============
  
  /**
   * 获取作品列表
   */
  async getWorks() {
    // 打开作家管理页
    await this.openWriterPage();
    await this.page.waitForTimeout(2000);
    
    // 获取作品列表
    const works = await this.page.evaluate(() => {
      const results = [];
      document.querySelectorAll('[class*="book"], [class*="work"]').forEach(el => {
        let title = el.querySelector('[class*="title"], [class*="name"], h3, h4')?.innerText?.trim();
        if (title && title.length > 0 && title.length < 100) {
          // 清理标题
          title = title.split('\n')[0].trim();
          // 过滤掉作品小贴士
          if (!title.includes('作品小贴士') && title.length > 2) {
            results.push({
              id: el.getAttribute('data-id') || results.length.toString(),
              title,
            });
          }
        }
      });
      return results;
    });
    
    // 去重
    const uniqueWorks = [...new Map(works.map(w => [w.title, w])).values()];
    
    return uniqueWorks;
  }
  
  /**
   * 打开作家管理页
   */
  async openWriterPage() {
    const url = this.config.site?.urls?.writer || 
      'https://fanqienovel.com/main/writer/book-manage';
    await this.waitForPage(url);
    await this.page.waitForTimeout(3000);
    
    // 截图调试
    await this.screenshot('fanqie-writer-page');
  }
  
  /**
   * 打开作品
   * @param {string} workId - 作品ID或标题
   */
  async openWork(workId) {
    await this.page.click(`[data-id="${workId}"]`);
    await this.page.waitForLoadState('networkidle');
  }
  
  /**
   * 获取章节列表
   */
  async getChapters() {
    await this.page.waitForSelector('[class*="chapter-item"]');
    
    return await this.page.$$eval(
      '[class*="chapter-item"]',
      items => items.map(item => ({
        title: item.innerText?.trim(),
        id: item.getAttribute('data-id')
      }))
    );
  }
  
  /**
   * 打开章节编辑
   */
  async openChapter(chapterId) {
    await this.page.click(`[data-id="${chapterId}"]`);
    await this.page.waitForSelector('[contenteditable="true"], textarea');
  }
  
  /**
   * 获取章节内容
   */
  async getChapterContent() {
    const selector = '[contenteditable="true"], textarea';
    return await this.page.$eval(selector, el => el.innerText);
  }
  
  /**
   * 编辑章节内容
   */
  async setChapterContent(content) {
    const selector = '[contenteditable="true"], textarea';
    await this.page.click(selector);
    await this.page.keyboard.press('Control+A');
    await this.page.type(selector, content);
  }
  
  /**
   * 保存章节
   */
  async saveChapter() {
    await this.page.click('button:has-text("保存")');
    await this.page.waitForTimeout(1000);
  }
}

module.exports = { FanqieSite };
