#!/bin/bash

# 导航栏同步脚本
# 用途：同步 extensions/public/nav-bar.html 到 control-ui-custom/nav-bar.html
# 使用方法：./sync-nav-bar.sh

echo "======================================"
echo "OpenClaw 导航栏同步脚本"
echo "======================================"
echo ""

SOURCE="extensions/public/nav-bar.html"
TARGET="control-ui-custom/nav-bar.html"

if [ ! -f "$SOURCE" ]; then
  echo "❌ 错误：源文件不存在：$SOURCE"
  exit 1
fi

echo "📂 源文件: $SOURCE"
echo "📂 目标文件: $TARGET"
echo ""

cp "$SOURCE" "$TARGET"

if [ $? -eq 0 ]; then
  echo "✅ 同步成功！"
  echo "ℹ️  修改 extensions/public/nav-bar.html 后，运行此脚本即可同步到原生 Control UI"
else
  echo "❌ 同步失败！"
  exit 1
fi

echo ""
echo "======================================"
