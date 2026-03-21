#!/bin/bash
# AI模型管理中心启动脚本

echo "🚀 启动AI模型管理中心..."

# 检查是否在正确的目录
if [ ! -f "openclaw.plugin.json" ]; then
    echo "❌ 请在ai-model-hub目录中运行此脚本"
    exit 1
fi

# 安装Node依赖（如果未安装）
if [ ! -d "node_modules" ]; then
    echo "📦 安装Node依赖..."
    pnpm install
fi

# 编译TypeScript
echo "🔨 编译TypeScript..."
npx tsc

# 启动服务
echo "🎯 启动服务..."
node dist/index.js
