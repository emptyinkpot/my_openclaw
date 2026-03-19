/**
 * Verification Tracker Hook
 * 强制追踪验证次数，防止 AI 偷懒
 * 
 * 触发时机：gateway:startup（每次重启时报告状态）
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = '/tmp/openclaw/verification-tracker.log';
const STATUS_FILE = '/tmp/openclaw/verification-status.json';

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.error(`[verification-tracker] ${msg}`);
}

function getStatus() {
  try {
    return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
  } catch {
    return { modifications: 0, verifications: 0, lastModify: null, lastVerify: null };
  }
}

function saveStatus(status) {
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
}

async function handler(event) {
  const status = getStatus();
  
  log('========================================');
  log('验证追踪状态报告');
  log('========================================');
  log(`文件修改次数: ${status.modifications}`);
  log(`验证执行次数: ${status.verifications}`);
  
  if (status.modifications > 0 && status.verifications === 0) {
    log('⚠️ 警告：有修改但未验证！');
  }
  
  if (status.verifications < status.modifications) {
    log(`⚠️ 警告：验证次数 (${status.verifications}) < 修改次数 (${status.modifications})`);
    log('请 AI 执行更多验证！');
  }
  
  if (status.verifications >= 3 && status.verifications >= status.modifications) {
    log('✅ 验证充分');
  }
  
  log('========================================');
  
  return { proceed: true, status };
}

// 导出函数供外部调用
handler.recordModification = function(file) {
  const status = getStatus();
  status.modifications++;
  status.lastModify = { file, time: new Date().toISOString() };
  saveStatus(status);
  log(`📝 记录修改: ${file} (总计: ${status.modifications})`);
};

handler.recordVerification = function(round, result) {
  const status = getStatus();
  status.verifications++;
  status.lastVerify = { round, result, time: new Date().toISOString() };
  saveStatus(status);
  log(`✓ 记录验证: 第 ${round} 轮 - ${result} (总计: ${status.verifications})`);
};

handler.getSummary = function() {
  const status = getStatus();
  return {
    modifications: status.modifications,
    verifications: status.verifications,
    ratio: status.modifications > 0 ? (status.verifications / status.modifications).toFixed(2) : 'N/A',
    needsMoreVerification: status.verifications < Math.max(3, status.modifications)
  };
};

handler.reset = function() {
  saveStatus({ modifications: 0, verifications: 0, lastModify: null, lastVerify: null });
  log('已重置验证追踪');
};

handler.getMetadata = () => ({
  name: 'verification-tracker',
  version: '1.0.0',
  description: '验证追踪器 - 防止 AI 偷懒',
  openclaw: {
    emoji: '🔍',
    events: ['gateway:startup'],
    priority: 1,
  },
});

module.exports = handler;
