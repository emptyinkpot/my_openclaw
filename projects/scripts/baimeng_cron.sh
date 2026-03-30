#!/bin/bash
# 白梦写作网 - 定时任务脚本
# 可添加到 crontab 或 OpenClaw 定时任务中

# 配置
WORK_DIR="/workspace/projects"
LOG_FILE="/workspace/projects/output/baimeng_cron.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# 记录开始
echo "[$DATE] 开始执行白梦写作网自动化任务" >> "$LOG_FILE"

# 进入工作目录
cd "$WORK_DIR" || exit 1

# 运行自动化任务（查看作品列表）
node scripts/baimeng_cron.js >> "$LOG_FILE" 2>&1

# 记录结束
echo "[$DATE] 任务执行完成" >> "$LOG_FILE"
echo "----------------------------------------" >> "$LOG_FILE"
