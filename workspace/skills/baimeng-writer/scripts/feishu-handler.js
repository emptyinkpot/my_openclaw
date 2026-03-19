#!/usr/bin/env node
/**
 * 飞书消息处理器 - 白梦写作网（简化版）
 * 
 * 用法: node feishu-handler.js "<消息内容>"
 */

const { execSync } = require('child_process');
const path = require('path');

const CONTROLLER_PATH = path.join(__dirname, 'controller.js');

function runCommand(args) {
  try {
    const result = execSync(`node "${CONTROLLER_PATH}" ${args} 2>/dev/null`, {
      encoding: 'utf8',
      timeout: 120000
    });
    
    if (!result || result.trim() === '') {
      return { success: false, error: '命令返回空结果' };
    }
    
    return JSON.parse(result);
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  const message = process.argv[2] || '';
  
  if (!message) {
    console.log(JSON.stringify({
      type: 'text',
      content: '📝 白梦写作网控制助手\n\n可用指令：\n• 作品列表 - 查看所有作品\n• 进入作品 <编号> - 进入指定作品\n• 白梦帮助 - 查看帮助'
    }));
    return;
  }
  
  const msg = message.trim();
  const msgLower = msg.toLowerCase();
  
  // 进入作品（先检查，避免被"作品列表"拦截）
  const enterMatch = msg.match(/(?:进入|打开).*作品\s*(\d+)/i);
  if (enterMatch) {
    const workId = enterMatch[1].trim();
    const result = runCommand(`enter "${workId}"`);
    
    if (result.success) {
      console.log(JSON.stringify({
        type: 'text',
        content: `✅ 已进入作品: ${result.work.title}`,
        screenshot: result.screenshot
      }));
    } else {
      console.log(JSON.stringify({
        type: 'text',
        content: '❌ 进入作品失败: ' + result.error
      }));
    }
    return;
  }
  
  // 查看作品列表
  if (msgLower.includes('列表') || msgLower.includes('list') || 
      (msgLower.includes('作品') && !msgLower.includes('进入'))) {
    const result = runCommand('list');
    
    if (result.success) {
      let content = '📚 作品列表（共' + result.count + '个）：\n';
      result.works.forEach((work, index) => {
        content += `${index + 1}. ${work.title}\n`;
      });
      content += '\n💡 回复"进入作品 <编号>"查看详情';
      
      console.log(JSON.stringify({
        type: 'text',
        content: content,
        screenshot: result.screenshot
      }));
    } else {
      console.log(JSON.stringify({
        type: 'text',
        content: '❌ 获取作品列表失败: ' + result.error
      }));
    }
    return;
  }
  
  // 帮助
  if (msgLower.includes('帮助') || msgLower.includes('help')) {
    console.log(JSON.stringify({
      type: 'text',
      content: '📝 白梦写作网控制助手\n\n📚 查看作品列表:\n  "作品列表"\n\n📖 进入指定作品:\n  "进入作品 2" (按编号)\n\n截图会自动保存'
    }));
    return;
  }
  
  // 默认回复
  console.log(JSON.stringify({
    type: 'text',
    content: '🤖 收到: ' + msg + '\n\n发送"白梦帮助"查看可用指令'
  }));
}

main();
