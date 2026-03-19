/**
 * 白梦写作控制器
 * 
 * 继承 BaseController，实现平台特定功能
 * 
 * @module skills/baimeng-writer/controller
 */

const { BaseController, createCliEntry, config } = require('../../../lib');

/**
 * 白梦写作控制器
 */
class BaimengController extends BaseController {
  constructor() {
    super({
      platform: 'baimeng',
      name: '白梦写作',
      urls: config.URLS.baimeng,
    });
  }
  
  /**
   * 获取作品列表（覆盖基类，添加白梦特有逻辑）
   */
  async getWorks() {
    const { page } = await this.ensureBrowser();
    await this.restoreLogin(page);
    
    const works = await this.getModule().works.getWorks(page);
    
    // 白梦特有：添加作品 ID
    return works.map(w => ({
      id: w.id || w.title,
      title: w.title,
      chapterCount: w.chapterCount || 0,
      wordCount: w.wordCount || 0,
    }));
  }
  
  /**
   * 进入章节编辑（白梦特有）
   * @param {string} workTitle - 作品标题
   * @param {string} chapterName - 章节名称
   */
  async openChapter(workTitle, chapterName) {
    const { page } = await this.ensureBrowser();
    await this.restoreLogin(page);
    
    const baimeng = this.getModule();
    
    // 查找作品
    const works = await baimeng.works.getWorks(page);
    const work = works.find(w => w.title.includes(workTitle));
    if (!work) {
      throw new Error(`未找到作品: ${workTitle}`);
    }
    
    // 进入编辑器
    await baimeng.works.openEditor(page, work.id);
    
    // 查找章节
    await baimeng.sidebar.findChapter(page, chapterName);
    
    return { success: true, work, chapter: chapterName };
  }
  
  /**
   * 获取章节内容（白梦特有）
   */
  async getChapterContent(workTitle, chapterName) {
    const { page } = await this.ensureBrowser();
    await this.openChapter(workTitle, chapterName);
    
    const baimeng = this.getModule();
    const content = await baimeng.content.getContent(page);
    
    return { success: true, content };
  }
  
  /**
   * 处理获取作品列表（覆盖基类）
   */
  async _handleGetWorks() {
    this.logger.info('获取作品列表...');
    
    const works = await this.getWorks();
    
    this.logger.success(`共 ${works.length} 部作品`);
    works.forEach((w, i) => {
      const extra = w.chapterCount ? ` (${w.chapterCount} 章)` : '';
      console.log(`  ${i + 1}. ${w.title}${extra}`);
    });
    
    return {
      success: true,
      platform: this.platform,
      count: works.length,
      works: works,
    };
  }
}

// 导出控制器类
module.exports = BaimengController;

// CLI 入口
if (require.main === module) {
  const main = createCliEntry(BaimengController);
  main().catch(console.error);
}
