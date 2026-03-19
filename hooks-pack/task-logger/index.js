/**
 * Task Logger Hook - 测试版
 * 监听 gateway:startup 和 command 事件
 */

const fs = require('fs');

const LOG_FILE = '/tmp/openclaw/hook-debug.log';

function debug(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [task-logger] ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.error(line.trim());
}

async function handler(event) {
  debug(`=== Handler 被调用 ===`);
  debug(`Event type: ${event?.type}`);
  debug(`Event action: ${event?.action}`);
  debug(`Event: ${JSON.stringify(event, null, 2)}`);
  
  return { proceed: true };
}

handler.getMetadata = () => ({
  name: 'task-logger',
  version: '1.0.0',
  description: '任务日志记录',
  openclaw: {
    emoji: '📋',
    // 使用确定会触发的事件
    events: ['gateway:startup', 'command:new', 'command:reset'],
    priority: 200,
  },
});

debug('Hook 模块加载完成 (监听 gateway:startup, command:new, command:reset)');

module.exports = handler;
