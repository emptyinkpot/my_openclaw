/**
 * 番茄小说控制器
 * 
 * 继承 BaseController，实现平台特定功能
 * 
 * @module skills/fanqie-novel/controller
 */

const { BaseController, createCliEntry, config } = require('../../../lib');

/**
 * 番茄小说控制器
 */
class FanqieController extends BaseController {
  constructor() {
    super({
      platform: 'fanqie',
      name: '番茄小说',
      urls: config.URLS.fanqie,
    });
  }
  
  /**
   * 获取作品列表（覆盖基类，添加番茄特有逻辑）
   */
  async getWorks() {
    const { page } = await this.ensureBrowser();
    await this.restoreLogin(page);
    
    const works = await this.getModule().works.getWorks(page);
    
    // 番茄特有：添加最新章节信息
    return works.map(w => ({
      id: w.id,
      title: w.title,
      latestChapter: w.latestChapter || '',
      status: w.status || '连载中',
    }));
  }
  
  /**
   * 处理获取作品列表（覆盖基类，添加更多输出）
   */
  async _handleGetWorks() {
    this.logger.info('获取作品列表...');
    
    const works = await this.getWorks();
    
    this.logger.success(`共 ${works.length} 部作品`);
    works.forEach((w, i) => {
      const extra = w.latestChapter ? ` - ${w.latestChapter}` : '';
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

// 导出控制器类（供其他模块使用）
module.exports = FanqieController;

// CLI 入口（直接运行时）
if (require.main === module) {
  const main = createCliEntry(FanqieController);
  main().catch(console.error);
}
