/**
 * 番茄小说调试脚本 - 详细日志版本
 */

const { FanqieSite } = require('./sites/fanqie');
const fs = require('fs-extra');
const path = require('path');

async function test() {
  const site = new FanqieSite('1');
  
  try {
    console.log('=== 番茄小说调试测试 ===\n');
    
    // 1. 检查登录数据
    const authPath = '/workspace/projects/cookies-accounts/fanqie-account-1.json';
    const hasAuthData = await fs.pathExists(authPath);
    console.log('📂 登录数据文件:', authPath);
    console.log('📂 数据存在:', hasAuthData ? '✅ 是' : '❌ 否');
    
    if (hasAuthData) {
      const authData = await fs.readJson(authPath);
      console.log('📦 Cookie 数量:', authData.length);
    }
    
    // 2. 初始化浏览器
    console.log('\n🔧 初始化浏览器...');
    await site.initBrowser();
    console.log('✅ 浏览器初始化成功');
    
    // 3. 访问首页并检查登录
    console.log('\n📖 访问首页...');
    const homeUrl = 'https://fanqienovel.com';
    await site.page.goto(homeUrl, { waitUntil: 'networkidle' });
    await site.page.waitForTimeout(2000);
    
    // 截图
    await site.screenshot('fanqie-home');
    console.log('📸 首页截图已保存');
    
    // 4. 检查登录状态
    console.log('\n🔍 检查登录状态...');
    const loginStatus = await site.checkLogin();
    console.log('登录状态:', loginStatus);
    
    if (!loginStatus.isLoggedIn) {
      console.log('\n⚠️ 未登录，尝试恢复登录...');
      
      // 检查 auth 管理器
      console.log('Auth 管理器:', site.auth ? '✅ 已创建' : '❌ 未创建');
      
      if (site.auth) {
        console.log('Has Backup:', site.auth.hasBackup());
        
        if (site.auth.hasBackup()) {
          console.log('🔄 开始恢复登录状态...');
          await site.restoreAuth();
          
          // 等待页面刷新
          await site.page.waitForTimeout(3000);
          
          // 再次检查登录状态
          const newLoginStatus = await site.checkLogin();
          console.log('恢复后登录状态:', newLoginStatus);
          
          // 截图
          await site.screenshot('fanqie-after-restore');
          console.log('📸 恢复后截图已保存');
        }
      }
    }
    
    // 5. 访问作家管理页
    console.log('\n📖 访问作家管理页...');
    const writerUrl = 'https://fanqienovel.com/main/writer/book-manage';
    await site.page.goto(writerUrl, { waitUntil: 'networkidle' });
    await site.page.waitForTimeout(3000);
    
    await site.screenshot('fanqie-writer-manage');
    console.log('📸 作家管理页截图已保存');
    
    // 6. 尝试获取作品列表
    console.log('\n📚 尝试获取作品列表...');
    try {
      const works = await site.getWorks();
      console.log('作品数量:', works.length);
      if (works.length > 0) {
        console.log('作品列表:', works);
      } else {
        console.log('⚠️ 未找到作品');
        
        // 尝试手动查找作品元素
        console.log('\n🔍 尝试手动查找作品元素...');
        const pageContent = await site.page.evaluate(() => {
          const allElements = document.body.innerText;
          const hasLoginBtn = document.querySelector('[class*="login"]') !== null;
          const hasUser = document.querySelector('[class*="user"], [class*="avatar"]') !== null;
          const bookCount = document.querySelectorAll('[class*="book"], [class*="work"]').length;
          
          return {
            hasLoginBtn,
            hasUser,
            bookCount,
            pageText: allElements.substring(0, 500)
          };
        });
        
        console.log('页面分析:', pageContent);
      }
    } catch (error) {
      console.error('❌ 获取作品列表失败:', error.message);
      
      // 保存错误截图
      await site.screenshot('fanqie-error');
      console.log('📸 错误截图已保存');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
  } finally {
    console.log('\n🔒 关闭浏览器...');
    if (site.context) {
      await site.context.close();
    }
  }
}

test().catch(console.error);
