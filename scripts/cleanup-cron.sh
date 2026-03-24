#!/bin/bash
# 项目清理定时任务脚本
# 每天凌晨 2 点执行清理

PROJECT_DIR="/workspace/projects"
LOG_FILE="$PROJECT_DIR/output/cleanup-cron.log"

# 创建日志目录
mkdir -p "$PROJECT_DIR/output"

# 记录开始时间
echo "========================================" >> "$LOG_FILE"
echo "清理任务开始: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# 执行清理
cd "$PROJECT_DIR" && node scripts/cleanup.js --all >> "$LOG_FILE" 2>&1

# 记录结束时间
echo "清理任务结束: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# 清理旧日志（保留最近 30 天）
find "$PROJECT_DIR/output" -name "cleanup-cron.log" -mtime +30 -delete 2>/dev/null
