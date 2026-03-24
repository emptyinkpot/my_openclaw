#!/bin/bash
# =============================================================================
# 通用命令执行包装器 - 解决 exec_shell 超时卡住问题
# =============================================================================
# 用法：
#   ./scripts/run-with-timeout.sh <超时秒数> <命令...>
#   ./scripts/run-with-timeout.sh 60 node tasks/test.js
#   ./scripts/run-with-timeout.sh 120 "cd /app && npm run build"
#
# 特性：
#   - 默认超时 60 秒（防止 exec_shell 卡住）
#   - 超时后自动终止进程
#   - 返回清晰的退出码
# =============================================================================

set -e

# 默认超时时间（秒）
DEFAULT_TIMEOUT=60

# 解析参数
if [[ "$1" =~ ^[0-9]+$ ]]; then
  TIMEOUT=$1
  shift
else
  TIMEOUT=$DEFAULT_TIMEOUT
fi

if [ -z "$1" ]; then
  echo "用法: $0 [超时秒数] <命令>"
  echo "示例: $0 60 node tasks/test.js"
  echo "      $0 npm run build  # 使用默认 60 秒超时"
  exit 1
fi

COMMAND="$@"

echo "⏱️  执行命令 (超时: ${TIMEOUT}s): $COMMAND"
echo "----------------------------------------"

# 使用 timeout 命令执行
# --preserve-status: 保留子进程的退出码
# --signal=TERM: 超时后先发送 TERM 信号
# --kill-after=5s: 5秒后还没结束就发送 KILL 信号
timeout --preserve-status --signal=TERM --kill-after=5s $TIMEOUT bash -c "$COMMAND"
EXIT_CODE=$?

echo "----------------------------------------"

if [ $EXIT_CODE -eq 124 ]; then
  echo "❌ 命令超时 (超过 ${TIMEOUT}s)"
elif [ $EXIT_CODE -eq 0 ]; then
  echo "✅ 命令完成 (退出码: 0)"
else
  echo "⚠️ 命令失败 (退出码: $EXIT_CODE)"
fi

exit $EXIT_CODE
