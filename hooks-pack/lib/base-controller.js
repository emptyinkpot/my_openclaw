/**
 * OpenClaw Workspace - Skills 控制器基类
 * 
 * 所有平台控制器的基础类，提供统一的生命周期管理
 * 
 * 设计原则：
 * - 低耦合：通过配置注入依赖，不直接依赖具体模块
 * - 高内聚：所有平台相关逻辑封装在子类中
 * - 可测试：提供 mock 接口
 * 
 * @module lib/base-controller
 */

const { ensureDir, formatLocalTime, createLogger } = require('./utils');
const config = require('./config');

/**
 * 平台控制器基类
 */
class BaseController {
  /**
   * @param {object} options - 配置选项
   * @param {string} options.platform - 平台 ID（baimeng/fanqie）
   * @param {string} options.name - 平台名称（用于显示）
   * @param {object} options.urls - 平台 URL 配置
   */
  constructor(options) {
    const { platform, name, urls } = options;
    
    this.platform = platform;
    this.name = name;
    this.urls = urls || {};
    this.logger = createLogger(name);
    
    // 浏览器实例（懒加载）
    this._browser = null;
    this._page = null;
    
    // 平台模块（懒加载）
    this._module = null;
  }
  
  // ============================================================
  // 生命周期
  // ============================================================
  
  /**
   * 获取平台模块（懒加载）
   * @returns {object}
   */
  getModule() {
    if (!this._module) {
      const modulePath = config.getPlatformModule(this.platform);
      if (!modulePath) {
        throw new Error(`Unknown platform: ${this.platform}`);
      }
      this._module = require(modulePath);
    }
    return this._module;
  }
  
  /**
   * 确保浏览器已启动
   * @returns {Promise<{browser, page}>}
   */
  async ensureBrowser() {
    if (!this._browser) {
      this.logger.info('启动浏览器...');
      const result = await this.getModule().browser.launch();
      this._browser = result.browser;
      this._page = result.page;
    }
    return { browser: this._browser, page: this._page };
  }
  
  /**
   * 关闭浏览器
   */
  async closeBrowser() {
    if (this._browser) {
      await this._browser.close();
      this._browser = null;
      this._page = null;
      this.logger.info('浏览器已关闭');
    }
  }
  
  // ============================================================
  // 核心功能（子类可覆盖）
  // ============================================================
  
  /**
   * 获取作品列表
   * @returns {Promise<Array>}
   */
  async getWorks() {
    const { page } = await this.ensureBrowser();
    await this.restoreLogin(page);
    return this.getModule().works.getWorks(page);
  }
  
  /**
   * 检查登录状态
   * @returns {Promise<{isLoggedIn: boolean, message: string}>}
   */
  async checkLogin() {
    const { page } = await this.ensureBrowser();
    return this.getModule().auth.checkLogin(page);
  }
  
  /**
   * 恢复登录状态
   * @param {Page} page - Playwright page 对象
   * @returns {Promise<{restored: boolean}>}
   */
  async restoreLogin(page) {
    return this.getModule().auth.restoreLogin(page);
  }
  
  /**
   * 等待用户登录
   * @param {number} timeout - 超时时间（毫秒）
   * @returns {Promise<{success: boolean}>}
   */
  async waitForLogin(timeout = 120000) {
    const { page } = await this.ensureBrowser();
    return this.getModule().auth.waitForLogin(page, timeout);
  }
  
  /**
   * 保存登录状态
   * @param {string} account - 账号标识
   */
  async saveLogin(account = 'default') {
    if (!this._page) return;
    return this.getModule().auth.saveLogin(this._page, account);
  }
  
  // ============================================================
  // CLI 命令处理
  // ============================================================
  
  /**
   * 处理 CLI 命令
   * @param {string} command - 命令
   * @param {Array<string>} args - 参数
   * @returns {Promise<object>}
   */
  async handleCommand(command, args = []) {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (command) {
        case 'list':
        case 'works':
          result = await this._handleGetWorks();
          break;
          
        case 'check':
        case 'status':
          result = await this._handleCheckLogin();
          break;
          
        case 'launch':
        case 'login':
          result = await this._handleLaunch();
          break;
          
        case 'close':
          result = await this._handleClose();
          break;
          
        case 'help':
        default:
          result = this._handleHelp();
          break;
      }
      
      result.duration = Date.now() - startTime;
      return result;
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }
  
  /**
   * 处理获取作品列表
   */
  async _handleGetWorks() {
    this.logger.info('获取作品列表...');
    
    const works = await this.getWorks();
    
    this.logger.success(`共 ${works.length} 部作品`);
    works.forEach((w, i) => {
      console.log(`  ${i + 1}. ${w.title}`);
    });
    
    return {
      success: true,
      platform: this.platform,
      count: works.length,
      works: works,
    };
  }
  
  /**
   * 处理检查登录状态
   */
  async _handleCheckLogin() {
    this.logger.info('检查登录状态...');
    
    const result = await this.checkLogin();
    
    if (result.isLoggedIn) {
      this.logger.success('已登录');
    } else {
      this.logger.warn('未登录');
    }
    
    return {
      success: true,
      isLoggedIn: result.isLoggedIn,
      message: result.message || (result.isLoggedIn ? '登录状态有效' : '需要登录'),
    };
  }
  
  /**
   * 处理启动浏览器
   */
  async _handleLaunch() {
    this.logger.info('启动浏览器...');
    
    const { page } = await this.ensureBrowser();
    const result = await this.restoreLogin(page);
    
    if (result.restored) {
      this.logger.success('已恢复登录状态');
    } else {
      this.logger.info('请在浏览器中完成登录...');
      const loginResult = await this.waitForLogin();
      
      if (loginResult.success) {
        this.logger.success('登录成功');
        await this.saveLogin();
      }
    }
    
    return {
      success: true,
      message: '浏览器已启动',
    };
  }
  
  /**
   * 处理关闭浏览器
   */
  async _handleClose() {
    await this.closeBrowser();
    return { success: true, message: '浏览器已关闭' };
  }
  
  /**
   * 处理帮助命令
   */
  _handleHelp() {
    console.log(`
${this.name} 控制器

用法:
  node controller.js list       查看作品列表
  node controller.js check      检查登录状态
  node controller.js launch     启动浏览器并恢复登录
  node controller.js close      关闭浏览器

飞书指令:
  "${this.name}作品" - 查看作品列表
  "${this.name}状态" - 检查登录状态
`);
    return { success: true, message: '帮助信息已显示' };
  }
  
  // ============================================================
  // 工具方法
  // ============================================================
  
  /**
   * 输出 JSON 结果（用于飞书解析）
   * @param {object} data - 数据
   */
  outputJson(data) {
    console.log('\n---JSON---');
    console.log(JSON.stringify(data));
  }
  
  /**
   * 打印标题
   */
  printHeader() {
    console.log(`${this._getEmoji()} ${this.name} 控制器`);
    console.log('='.repeat(40));
  }
  
  /**
   * 获取平台 emoji
   */
  _getEmoji() {
    const emojis = {
      baimeng: '📖',
      fanqie: '🍅',
    };
    return emojis[this.platform] || '📋';
  }
}

// ============================================================
// 工厂函数
// ============================================================

/**
 * 创建控制器入口函数
 * @param {class} ControllerClass - 控制器类
 * @returns {Function}
 */
function createCliEntry(ControllerClass) {
  return async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    
    const controller = new ControllerClass();
    controller.printHeader();
    
    const result = await controller.handleCommand(command, args.slice(1));
    controller.outputJson(result);
    
    // 处理退出信号
    process.on('SIGINT', async () => {
      console.log('\n正在关闭...');
      await controller.closeBrowser();
      process.exit(0);
    });
    
    // 非启动命令时关闭浏览器
    if (!['launch', 'login', 'help'].includes(command)) {
      await controller.closeBrowser();
    }
  };
}

// ============================================================
// 导出
// ============================================================

module.exports = {
  BaseController,
  createCliEntry,
};
