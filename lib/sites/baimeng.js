/**
 * 白梦写作网站模块
 * 
 * 使用方式：
 * 1. 共享模式（默认）：使用 default 浏览器，与其他网站共享
 * 2. 独立模式：指定 accountId，使用独立浏览器目录
 * 
 * 示例：
 *   const site = new BaimengSite();      // 共享模式
 *   const site = new BaimengSite('1');   // 独立模式，使用 baimeng-1 目录
 */

const { BaseSite } = require('./base');
const { BrowserManager } = require('../browser/manager');

class BaimengSite extends BaseSite {
  /**
   * @param {string} accountId - 账号ID
   *   - 不传或 null: 使用共享模式（default 浏览器）
   *   - 传入 ID: 使用独立模式（baimeng-{ID} 浏览器）
   */
  constructor(accountId = null) {
    super('baimeng', accountId);
    this.accountId = accountId;  // 保存原始值，可能为 null
  }
  
  /**
   * 初始化浏览器
   * 重写父类方法，支持两种模式
   */
  async initBrowser() {
    let instance;
    
    if (this.accountId === null) {
      // 共享模式：使用 default 浏览器
      instance = await BrowserManager.getDefaultBrowser();
    } else {
      // 独立模式：使用 baimeng-{accountId} 浏览器
      instance = await BrowserManager.getSiteBrowser('baimeng', this.accountId);
    }
    
    this.context = instance.context;
    this.page = instance.page;
    
    return instance;
  }
  
  // ============ 白梦写作特有方法 ============
  
  /**
   * 获取作品列表
   */
  async getWorks() {
    // 打开作品库
    await this.openLibrary();
    await this.page.waitForTimeout(2000);
    
    // 获取作品列表
    const works = await this.page.evaluate(() => {
      const items = document.querySelectorAll('h3, [class*="title"], [class*="work-item"]');
      const results = [];
      
      items.forEach((item, index) => {
        const title = item.innerText?.trim();
        if (title && title.length > 0 && title.length < 100 && 
            !title.includes('创建新作品') && !title.includes('新建')) {
          results.push({
            id: index.toString(),
            title: title.split('\n')[0],
          });
        }
      });
      
      return results;
    });
    
    return works;
  }
  
  /**
   * 打开作品
   */
  async openWork(workId) {
    const works = await this.getWorks();
    const work = works.find(w => w.id === workId);
    
    if (!work) {
      throw new Error(`作品不存在: ${workId}`);
    }
    
    // 点击作品
    await this.page.click(`text=${work.title}`);
    await this.page.waitForTimeout(2000);
    
    return work;
  }
  
  /**
   * 打开作品库
   */
  async openLibrary() {
    const url = this.config.site?.urls?.library || 
      'https://baimengxiezuo.com/zh-Hans/library/';
    await this.waitForPage(url);
  }
  
  /**
   * 获取侧边栏位置
   */
  async getSidebarPosition() {
    const sidebar = await this.page.$('[class*="sidebar"]');
    if (!sidebar) return null;
    return await sidebar.boundingBox();
  }
  
  /**
   * 点击侧边栏获取焦点
   */
  async focusSidebar() {
    const pos = await this.getSidebarPosition();
    if (pos) {
      await this.page.mouse.click(pos.x + pos.width / 2, pos.y + pos.height / 2);
      await this.page.waitForTimeout(300);
    }
  }
  
  /**
   * 查找并打开章节
   * @param {string} chapterTitle - 章节标题
   */
  async findChapter(chapterTitle) {
    const sidebarSelector = '[class*="sidebar"]';
    
    return await this.slowScrollFind(
      sidebarSelector,
      async () => {
        return await this.page.evaluate((title) => {
          const items = document.querySelectorAll('[class*="cursor-pointer"]');
          for (const item of items) {
            // 排除文件夹
            const hasArrow = item.querySelector(
              '[class*="chevron"], [class*="arrow"], svg'
            );
            if (hasArrow) continue;
            
            const text = item.innerText || item.textContent;
            if (text && text.includes(title)) {
              item.click();
              return true;
            }
          }
          return false;
        }, chapterTitle);
      },
      { delay: 80, distance: 80, maxAttempts: 50 }
    );
  }
  
  /**
   * 滚动主内容区
   */
  async scrollMainContent(direction = 'down', distance = 300) {
    const main = await this.page.$('[class*="main"]');
    if (!main) return;
    
    const box = await main.boundingBox();
    if (!box) return;
    
    // 点击获取焦点
    await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await this.page.waitForTimeout(500);
    
    // 滚动
    const wheelDelta = direction === 'down' ? distance : -distance;
    await this.page.mouse.wheel(0, wheelDelta);
  }
  
  /**
   * 加载完整内容
   */
  async loadFullContent() {
    const main = await this.page.$('[class*="main"]');
    if (!main) return;
    
    const box = await main.boundingBox();
    if (!box) return;
    
    // 点击获取焦点
    await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await this.page.waitForTimeout(500);
    
    // 滚动加载
    for (let i = 0; i < 20; i++) {
      await this.page.mouse.wheel(0, 300);
      await this.page.waitForTimeout(100);
    }
    
    // 滚回顶部
    await this.page.mouse.wheel(0, -10000);
  }
  
  /**
   * 复制章节内容
   */
  async copyContent() {
    await this.page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.innerText.trim() === '复制') {
          btn.click();
          break;
        }
      }
    });
  }
  
  /**
   * 输入 AI 指令
   * @param {string} instruction - 指令内容
   */
  async inputAIInstruction(instruction) {
    // 点击输入框
    const inputSelector = '[contenteditable="true"], textarea';
    await this.page.click(inputSelector);
    
    // 输入指令
    await this.page.type(inputSelector, instruction);
    
    // 点击发送
    await this.page.click('button:has-text("发送")');
  }
  
  /**
   * 滚动对话区域
   */
  async scrollDialog(direction = 'up', distance = 300) {
    // 找对话区域
    const dialogArea = await this.page.evaluateHandle(() => {
      const containers = document.querySelectorAll('[class*="dialog"], [class*="message"]');
      for (const container of containers) {
        if (container.innerText.includes('修改内容') && 
            container.innerText.includes('字')) {
          return container;
        }
      }
      return null;
    });
    
    if (!dialogArea) return;
    
    const box = await dialogArea.boundingBox();
    if (!box) return;
    
    // 点击获取焦点
    await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await this.page.waitForTimeout(300);
    
    // 滚动
    const wheelDelta = direction === 'down' ? distance : -distance;
    await this.page.mouse.wheel(0, wheelDelta);
  }
}

module.exports = { BaimengSite };
