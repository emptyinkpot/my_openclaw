#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
SOURCE_ROOT="$PROJECT_ROOT/shared"
FILES=(
  "nav-bar.html"
  "nav-bar-behavior.js"
)
TARGET_ROOTS=(
  "$PROJECT_ROOT/control-ui-custom/assets"
  "$PROJECT_ROOT/control-ui-custom/shared"
)

echo "======================================"
echo "OpenClaw 导航栏同步"
echo "======================================"
echo ""
echo "脚本目录: $SCRIPT_DIR"
echo "项目根目录: $PROJECT_ROOT"
echo ""

for file in "${FILES[@]}"; do
  source="$SOURCE_ROOT/$file"
  if [ ! -f "$source" ]; then
    echo "错误：源文件不存在：$source"
    exit 1
  fi

  echo "源文件：$source"
  for target_root in "${TARGET_ROOTS[@]}"; do
    target="$target_root/$file"
    target_dir="$(dirname "$target")"
    mkdir -p "$target_dir"
    cp "$source" "$target"
    echo "已同步：$target"
  done
  echo ""
done

echo "同步完成。"
