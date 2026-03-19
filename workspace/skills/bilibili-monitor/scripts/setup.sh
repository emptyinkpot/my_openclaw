#!/bin/bash
# 安装依赖脚本

echo "📦 安装B站舆情监控Skill依赖..."

# 检查Python3
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3未安装"
    exit 1
fi

# 安装Python依赖
echo "🐍 安装Python包..."
pip3 install -q bilibili-api-python jieba aiosqlite aiohttp

# 检查安装
if python3 -c "import bilibili_api; import jieba; import aiosqlite" 2>/dev/null; then
    echo "✅ 依赖安装成功"
else
    echo "⚠️ 部分依赖可能安装失败，请手动检查"
fi

# 初始化数据库
echo "🗄️ 初始化数据库..."
cd "$(dirname "$0")/.."
python3 scripts/skill_runner.py init

echo ""
echo "🎉 安装完成!"
echo ""
echo "使用方法:"
echo "  1. 分析视频: python3 scripts/skill_runner.py analyze BV1xx411c7mD"
echo "  2. 添加监控: python3 scripts/skill_runner.py monitor 123456 'UP主名称'"
echo "  3. 启动守护: python3 scripts/monitor_daemon.py"
