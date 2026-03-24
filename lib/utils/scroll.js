/**
 * 滚动工具
 * 提供通用的滚动操作方法
 */

class ScrollUtils {
  /**
   * 点击区域获取焦点
   * @param {Page} page 
   * @param {string} selector 
   */
  static async focusArea(page, selector) {
    const element = await page.$(selector);
    if (!element) {
      throw new Error(`元素不存在: ${selector}`);
    }
    
    const box = await element.boundingBox();
    if (!box) {
      throw new Error(`元素不可见: ${selector}`);
    }
    
    // 点击中心位置获取焦点
    await page.mouse.click(
      box.x + box.width / 2,
      box.y + box.height / 2
    );
    
    await page.waitForTimeout(300);
  }
  
  /**
   * 滚动指定区域
   * @param {Page} page 
   * @param {string} selector 
   * @param {'up'|'down'} direction 
   * @param {number} distance 
   */
  static async scroll(page, selector, direction = 'down', distance = 100) {
    await this.focusArea(page, selector);
    
    const wheelDelta = direction === 'down' ? distance : -distance;
    await page.mouse.wheel(0, wheelDelta);
  }
  
  /**
   * 慢速滚动查找元素
   * @param {Page} page 
   * @param {string} containerSelector - 容器选择器
   * @param {Function} callback - 每次滚动后的检查回调
   * @param {object} options 
   */
  static async slowScrollFind(page, containerSelector, callback, options = {}) {
    const {
      delay = 80,
      distance = 80,
      maxAttempts = 50,
      startFromTop = true
    } = options;
    
    // 点击获取焦点
    await this.focusArea(page, containerSelector);
    
    // 从顶部开始
    if (startFromTop) {
      await page.mouse.wheel(0, -10000);
      await page.waitForTimeout(500);
    }
    
    // 慢速滚动查找
    for (let i = 0; i < maxAttempts; i++) {
      const result = await callback();
      if (result) return result;
      
      await page.mouse.wheel(0, distance);
      await page.waitForTimeout(delay);
    }
    
    return null;
  }
  
  /**
   * 滚动加载完整内容
   * @param {Page} page 
   * @param {string} selector 
   * @param {number} targetScrolls 
   */
  static async scrollLoadContent(page, selector, targetScrolls = 20) {
    await this.focusArea(page, selector);
    
    for (let i = 0; i < targetScrolls; i++) {
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(100);
    }
    
    // 滚回顶部
    await page.mouse.wheel(0, -10000);
    await page.waitForTimeout(300);
  }
}

module.exports = { ScrollUtils };
