#!/bin/bash
# 自动更新所有文档

PROJECT_DIR="/workspace/projects"
LOG_FILE="$PROJECT_DIR/output/auto-docs.log"

# 创建日志目录
mkdir -p "$PROJECT_DIR/output"

echo "========================================" >> "$LOG_FILE"
echo "文档自动更新开始: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

cd "$PROJECT_DIR/docs/tools"

# 1. 生成通用文档
echo "[1/3] 生成通用文档..." >> "$LOG_FILE"
node generate-docs.js >> "$LOG_FILE" 2>&1

# 2. 生成 API 文档
echo "[2/3] 生成 API 文档..." >> "$LOG_FILE"
node auto-generate-api.js >> "$LOG_FILE" 2>&1

# 3. 更新飞书指令文档
echo "[3/3] 更新飞书指令文档..." >> "$LOG_FILE"
node update-feishu-docs.js >> "$LOG_FILE" 2>&1

echo "文档更新完成: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# 清理旧日志（保留30天）
find "$PROJECT_DIR/output" -name "auto-docs.log" -mtime +30 -delete 2>/dev/null
