#!/usr/bin/env node
/**
 * 番茄小说飞书处理器 - 简化版
 * 
 * 直接复用 novel-sync 已验证代码
 */

const { execSync } = require('child_process');

// 已验证的番茄小说任务
const FANQIE_TASK = '/workspace/projects/auto-scripts/src/platforms/fanqie';

function main() {
  const message = process.argv[2] || '';
  const msg = message.toLowerCase();
  
  // 番茄小说指令
  if (msg.includes('番茄') || msg.includes('fanqie')) {
    
    if (msg.includes('作品') || msg.includes('列表')) {
      const cmd = `node -e "const t = require('${FANQIE_TASK}'); t.getWorks().then(r => console.log(JSON.stringify(r)))"`;
      try {
        const result = execSync(cmd, { encoding: 'utf8', timeout: 120000 });
        const data = JSON.parse(result);
        
        let content = `📚 番茄小说作品列表（共${data.count}个）：\n\n`;
        data.works.forEach((w, i) => {
          content += `${i + 1}. ${w.title}\n`;
        });
        
        console.log(JSON.stringify({ type: 'text', content }));
        return;
      } catch (e) {
        console.log(JSON.stringify({ type: 'text', content: `❌ 获取失败: ${e.message}` }));
        return;
      }
    }
    
    if (msg.includes('状态') || msg.includes('登录')) {
      const cmd = `node -e "const t = require('${FANQIE_TASK}'); t.checkLogin().then(r => console.log(JSON.stringify(r)))"`;
      try {
        const result = execSync(cmd, { encoding: 'utf8', timeout: 60000 });
        const data = JSON.parse(result);
        
        const content = data.isLoggedIn 
          ? '✅ 番茄小说已登录' 
          : '❌ 番茄小说未登录';
        
        console.log(JSON.stringify({ type: 'text', content }));
        return;
      } catch (e) {
        console.log(JSON.stringify({ type: 'text', content: `❌ 检查失败: ${e.message}` }));
        return;
      }
    }
  }
  
  // 白梦指令（原有逻辑）
  if (msg.includes('白梦') || msg.includes('baimeng')) {
    console.log(JSON.stringify({ type: 'text', content: '白梦功能请使用原 website-automation' }));
    return;
  }
  
  // 帮助
  console.log(JSON.stringify({
    type: 'text',
    content: `🌐 网站自动化助手

支持:
• 白梦写作网
• 番茄小说

指令:
• "番茄作品" - 查看作品列表
• "番茄状态" - 检查登录状态
• "白梦作品" - 查看白梦作品`
  }));
}

main();
