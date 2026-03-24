#!/bin/bash
# =============================================================================
# 快捷命令执行器 - 简化版
# =============================================================================
# 用法：
#   ./scripts/run.sh <命令>              # 默认 60s 超时
#   ./scripts/run.sh 30 <命令>           # 指定 30s 超时
#   ./scripts/run.sh bg <命令>           # 后台运行（不阻塞）
#
# 示例：
#   ./scripts/run.sh node tasks/test.js
#   ./scripts/run.sh 120 npm run build
#   ./scripts/run.sh bg "node server.js &"
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# 解析参数
MODE="fg"
TIMEOUT=60

while [[ $# -gt 0 ]]; do
  case "$1" in
    bg|background)
      MODE="bg"
      shift
      ;;
    [0-9]*)
      TIMEOUT=$1
      shift
      ;;
    *)
      break
      ;;
  esac
done

if [ -z "$1" ]; then
  cat << EOF
用法:
  $0 <命令>              # 前台运行，默认 60s 超时
  $0 <秒数> <命令>       # 前台运行，指定超时
  $0 bg <命令>           # 后台运行（不阻塞）

示例:
  $0 node tasks/test.js
  $0 120 npm run build
  $0 bg "node server.js"
EOF
  exit 0
fi

COMMAND="$@"

if [ "$MODE" = "bg" ]; then
  echo "🚀 后台执行: $COMMAND"
  (nohup bash -c "$COMMAND" > /tmp/openclaw/run-bg.log 2>&1 &)
  echo "📋 日志: /tmp/openclaw/run-bg.log"
  echo "✅ 已启动（不阻塞）"
else
  echo "⏱️  执行 (超时 ${TIMEOUT}s): $COMMAND"
  echo "----------------------------------------"
  timeout --preserve-status --signal=TERM --kill-after=5s $TIMEOUT bash -c "$COMMAND"
  EXIT_CODE=$?
  echo "----------------------------------------"
  [ $EXIT_CODE -eq 124 ] && echo "❌ 超时" || echo "✅ 完成 (退出码: $EXIT_CODE)"
  exit $EXIT_CODE
fi
