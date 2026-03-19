/**
 * 番茄小说测试脚本
 */

const { FanqieSite } = require('./sites/fanqie');

async function test() {
  const site = new FanqieSite('1');
  
  try {
    console.log('🔧 初始化浏览器...');
    await site.initBrowser();
    
    console.log('📖 检查登录状态...');
    const loginStatus = await site.checkLogin();
    console.log('登录状态:', loginStatus);
    
    if (!loginStatus.isLoggedIn) {
      console.log('⚠️ 未登录，尝试恢复登录...');
      await site.restoreAuth();
    }
    
    console.log('📚 获取作品列表...');
    const works = await site.getWorks();
    console.log('作品数量:', works.length);
    console.log('作品列表:', works);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
  } finally {
    console.log('🔒 关闭浏览器...');
    if (site.context) {
      await site.context.close();
    }
  }
}

test().catch(console.error);
