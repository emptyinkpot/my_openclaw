#!/bin/bash
# OpenClaw 系统定期自检脚本
# 可手动执行或通过心跳机制调用

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查结果统计
ISSUES=0
FIXES=0

echo "============================================"
echo "   OpenClaw 系统健康检查 $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"
echo ""

# ========================================
# 1. Gateway 状态检查
# ========================================
echo "【1】Gateway 状态检查"
echo "--------------------------------------------"

if pgrep -f "openclaw-gateway" > /dev/null; then
    log_info "Gateway 进程运行中"
else
    log_error "Gateway 进程未运行"
    ISSUES=$((ISSUES + 1))
fi

if curl -s http://localhost:5000 > /dev/null 2>&1; then
    log_info "端口 5000 响应正常"
else
    log_error "端口 5000 无响应"
    ISSUES=$((ISSUES + 1))
fi

echo ""

# ========================================
# 2. Hook 加载状态检查
# ========================================
echo "【2】Hook 加载状态检查"
echo "--------------------------------------------"

HOOK_ERRORS=$(tail -200 /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log 2>/dev/null | grep "Failed to load hook" | wc -l)

if [ "$HOOK_ERRORS" -eq 0 ]; then
    HOOK_COUNT=$(tail -200 /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log 2>/dev/null | grep "Registered hook" | tail -7 | wc -l)
    log_info "所有 Hook 加载成功 ($HOOK_COUNT 个)"
else
    log_error "有 $HOOK_ERRORS 个 Hook 加载失败"
    tail -200 /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log | grep "Failed to load hook"
    ISSUES=$((ISSUES + HOOK_ERRORS))
fi

echo ""

# ========================================
# 3. 配置文件完整性检查
# ========================================
echo "【3】配置文件完整性检查"
echo "--------------------------------------------"

CONFIG_FILES=(
    "/workspace/projects/openclaw.json"
    "/workspace/projects/workspace/AUTO_SCRIPTS.md"
    "/workspace/projects/workspace/lib/index.js"
    "/workspace/projects/workspace/lib/config.js"
    "/workspace/projects/workspace/lib/base-hook.js"
    "/workspace/projects/workspace/lib/base-controller.js"
)

for file in "${CONFIG_FILES[@]}"; do
    if [ -f "$file" ]; then
        log_info "$(basename $file) 存在"
    else
        log_error "$(basename $file) 缺失"
        ISSUES=$((ISSUES + 1))
    fi
done

echo ""

# ========================================
# 4. 共享库加载测试
# ========================================
echo "【4】共享库加载测试"
echo "--------------------------------------------"

if node -e "
const lib = require('/workspace/projects/workspace/lib');
const required = ['config', 'BaseHook', 'BaseController', 'createHookExport'];
const missing = required.filter(k => !lib[k]);
if (missing.length > 0) {
    console.error('缺失导出:', missing.join(', '));
    process.exit(1);
}
console.log('✅ 共享库导出正常:', Object.keys(lib).length, '个');
" 2>&1; then
    log_info "共享库加载正常"
else
    log_error "共享库加载失败"
    ISSUES=$((ISSUES + 1))
fi

echo ""

# ========================================
# 5. 残留锁文件检查
# ========================================
echo "【5】残留锁文件检查"
echo "--------------------------------------------"

LOCK_FILES=$(find /workspace/projects/browser -name "SingletonLock" 2>/dev/null || true)

if [ -z "$LOCK_FILES" ]; then
    log_info "无残留锁文件"
    LOCK_COUNT=0
else
    LOCK_COUNT=$(echo "$LOCK_FILES" | wc -l)
    log_warn "发现 $LOCK_COUNT 个残留锁文件"
    echo "$LOCK_FILES"
    
    if [ "$1" = "--fix" ]; then
        echo "$LOCK_FILES" | xargs rm -f 2>/dev/null || true
        log_info "已清理锁文件"
        FIXES=$((FIXES + LOCK_COUNT))
    else
        log_warn "使用 --fix 参数自动清理"
        ISSUES=$((ISSUES + LOCK_COUNT))
    fi
fi

echo ""

# ========================================
# 6. 僵尸浏览器进程检查
# ========================================
echo "【6】浏览器进程检查"
echo "--------------------------------------------"

BROWSER_COUNT=$(pgrep -c "chromium|chrome|firefox" 2>/dev/null || echo "0")

if [ "$BROWSER_COUNT" -lt 10 ]; then
    log_info "浏览器进程数正常 ($BROWSER_COUNT)"
else
    log_warn "浏览器进程数较多 ($BROWSER_COUNT)，可能存在僵尸进程"
    if [ "$1" = "--fix" ]; then
        pkill -9 -f "chromium.*--headless" 2>/dev/null || true
        log_info "已清理无头浏览器进程"
        FIXES=$((FIXES + 1))
    fi
fi

echo ""

# ========================================
# 7. 日志文件大小检查
# ========================================
echo "【7】日志文件大小检查"
echo "--------------------------------------------"

LOG_SIZE=$(du -sm /tmp/openclaw/ 2>/dev/null | cut -f1 || echo "0")
LARGE_LOGS=$(find /workspace/projects -name "*.log" -size +10M 2>/dev/null | wc -l)

if [ "$LOG_SIZE" -lt 100 ]; then
    log_info "日志目录大小正常 (${LOG_SIZE}MB)"
else
    log_warn "日志目录较大 (${LOG_SIZE}MB)"
fi

if [ "$LARGE_LOGS" -eq 0 ]; then
    log_info "无超大日志文件"
else
    log_warn "发现 $LARGE_LOGS 个超大日志文件 (>10MB)"
    if [ "$1" = "--fix" ]; then
        find /workspace/projects -name "*.log" -size +10M -delete 2>/dev/null || true
        log_info "已清理超大日志文件"
        FIXES=$((FIXES + LARGE_LOGS))
    fi
fi

echo ""

# ========================================
# 8. Skills 完整性检查
# ========================================
echo "【8】Skills 完整性检查"
echo "--------------------------------------------"

SKILL_DIR="/workspace/projects/workspace/skills"
SKILL_COUNT=0
MISSING_MD=0

for skill in "$SKILL_DIR"/*/; do
    if [ -d "$skill" ]; then
        SKILL_COUNT=$((SKILL_COUNT + 1))
        SKILL_NAME=$(basename "$skill")
        if [ ! -f "$skill/SKILL.md" ]; then
            log_warn "$SKILL_NAME 缺少 SKILL.md"
            MISSING_MD=$((MISSING_MD + 1))
        fi
    fi
done

if [ "$MISSING_MD" -eq 0 ]; then
    log_info "所有 Skills 完整 ($SKILL_COUNT 个)"
else
    log_warn "$MISSING_MD 个 Skills 缺少 SKILL.md"
    ISSUES=$((ISSUES + MISSING_MD))
fi

echo ""

# ========================================
# 汇总
# ========================================
echo "============================================"
echo "   检查完成"
echo "============================================"
echo ""

if [ "$ISSUES" -eq 0 ]; then
    log_info "系统状态: 健康 ✅"
else
    log_warn "发现问题: $ISSUES 个"
    [ "$FIXES" -gt 0 ] && log_info "已修复: $FIXES 个"
    log_warn "建议: 运行 $0 --fix 自动修复"
fi

# 返回状态码
[ "$ISSUES" -eq 0 ] && exit 0 || exit 1
