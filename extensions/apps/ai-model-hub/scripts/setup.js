#!/usr/bin/env node
/**
 * AI模型管理中心安装脚本
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 安装AI模型管理中心...\n');

// 检查Python环境
console.log('🔍 检查Python环境...');
try {
  const pythonVersion = execSync('python3 --version', { encoding: 'utf8' }).trim();
  console.log(`  ✅ ${pythonVersion}`);
} catch {
  console.error('  ❌ Python3未安装，请先安装Python 3.8+');
  process.exit(1);
}

// 安装Python依赖
console.log('\n📦 安装Python依赖...');
const pythonPackages = [
  'unsloth',
  'transformers',
  'datasets',
  'peft',
  'accelerate',
  'bitsandbytes',
  'trl',
  'torch'
];

try {
  execSync(`pip install ${pythonPackages.join(' ')}`, {
    stdio: 'inherit',
    timeout: 600000 // 10分钟超时
  });
  console.log('  ✅ Python依赖安装完成');
} catch (err) {
  console.warn('  ⚠️ 部分Python依赖安装失败，可稍后手动安装');
}

// 检查Ollama
console.log('\n🦙 检查Ollama...');
try {
  execSync('which ollama');
  console.log('  ✅ Ollama已安装');
} catch {
  console.log('  ⚠️ Ollama未安装');
  console.log('     安装命令: curl -fsSL https://ollama.com/install.sh | sh');
}

// 检查Docker
console.log('\n🐳 检查Docker...');
try {
  execSync('docker --version');
  console.log('  ✅ Docker已安装');
} catch {
  console.log('  ⚠️ Docker未安装（可选，用于沙盒隔离）');
}

// 创建目录
console.log('\n📁 创建模型目录...');
const dirs = [
  './models/fine-tuned',
  './models/local',
  './data/datasets'
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`  ✅ ${dir}`);
  }
});

console.log('\n✅ 安装完成！');
console.log('\n使用说明:');
console.log('  1. 启动Ollama: ollama serve');
console.log('  2. 访问管理界面: http://localhost:5100');
console.log('  3. 或在OpenClaw中点击 🤖 AI模型管理 导航项');
