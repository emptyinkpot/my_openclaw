#!/bin/bash
# QMD 包装脚本，解决安装问题

QMD_CMD="npx @tobilu/qmd"

# 检查是否在项目目录中
if [ -f "/workspace/projects/package.json" ]; then
    # 尝试使用项目本地安装
    if [ -f "/workspace/projects/node_modules/.bin/qmd" ]; then
        QMD_CMD="/workspace/projects/node_modules/.bin/qmd"
    fi
fi

# 执行 QMD 命令
$QMD_CMD "$@"