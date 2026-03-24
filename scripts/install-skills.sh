#!/bin/bash
# OpenClaw Skills 一键安装脚本
# 用法: ./install-skills.sh [套餐名]
# 套餐: core, dev, ai, monitor, browser, search, image, feishu, all

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查 ClawHub
check_clawhub() {
    if ! command -v npx &> /dev/null; then
        log_error "npx not found, please install Node.js first"
        exit 1
    fi
    log_info "ClawHub CLI ready"
}

# 安装 Skills
install_skills() {
    local skills=("$@")
    local failed=()
    
    for skill in "${skills[@]}"; do
        log_info "Installing: $skill"
        if npx clawhub install "$skill" --no-input 2>/dev/null; then
            log_success "Installed: $skill"
        else
            log_warn "Failed to install: $skill (may already exist or not found)"
            failed+=("$skill")
        fi
    done
    
    if [ ${#failed[@]} -gt 0 ]; then
        log_warn "Failed skills: ${failed[*]}"
    fi
}

# 套餐定义
install_core() {
    log_info "=== 安装核心套件 (P0 必备) ==="
    install_skills \
        "gh" \
        "elite-longterm-memory" \
        "agentpulse" \
        "ddg-web-search" \
        "code-review"
}

install_dev() {
    log_info "=== 安装开发套件 ==="
    install_skills \
        "gh" \
        "git-changelog" \
        "gh-action-gen" \
        "alex-session-wrap-up" \
        "code-review" \
        "astrai-code-review" \
        "code-stats" \
        "atris"
}

install_ai() {
    log_info "=== 安装 AI 增强套件 ==="
    install_skills \
        "elite-longterm-memory" \
        "smart-memory" \
        "memory-hygiene" \
        "agent-orchestrator" \
        "agent-autonomy-kit" \
        "astrai-inference-router"
}

install_monitor() {
    log_info "=== 安装成本监控套件 ==="
    install_skills \
        "agentpulse" \
        "agent-cost-monitor" \
        "claude-usage-checker"
}

install_browser() {
    log_info "=== 安装浏览器自动化套件 ==="
    install_skills \
        "browser-automation" \
        "browser-automation-stealth" \
        "2captcha" \
        "anycrawl"
}

install_search() {
    log_info "=== 安装搜索套件 ==="
    install_skills \
        "ddg-web-search" \
        "web-search-free" \
        "cn-web-search" \
        "arxiv-osiris" \
        "academic-deep-research"
}

install_image() {
    log_info "=== 安装图像生成套件 ==="
    install_skills \
        "fal-ai" \
        "eachlabs-image-generation" \
        "cheapest-image" \
        "canva-connect" \
        "figma"
}

install_feishu() {
    log_info "=== 安装飞书增强套件 ==="
    install_skills \
        "feishu-sheets" \
        "feishu-card" \
        "feishu-file-sender" \
        "lark-toolkit"
}

install_all() {
    log_info "=== 安装全部推荐 Skills ==="
    install_core
    install_dev
    install_ai
    install_monitor
    install_browser
    install_search
    install_image
    install_feishu
}

# 显示帮助
show_help() {
    echo "OpenClaw Skills 一键安装脚本"
    echo ""
    echo "用法: $0 [套餐名]"
    echo ""
    echo "套餐:"
    echo "  core     - 核心套件 (P0 必备): gh, memory, monitor, search, code-review"
    echo "  dev      - 开发套件: Git/GitHub, 代码审查, 代码分析"
    echo "  ai       - AI 增强套件: 记忆系统, 多代理编排, LLM 路由"
    echo "  monitor  - 成本监控套件: Token/成本追踪"
    echo "  browser  - 浏览器自动化套件: 网页操作, 爬虫"
    echo "  search   - 搜索套件: 网页搜索, 学术搜索"
    echo "  image    - 图像生成套件: AI 图像/视频生成"
    echo "  feishu   - 飞书增强套件: 表格, 卡片, 文件"
    echo "  all      - 安装全部推荐 Skills"
    echo ""
    echo "示例:"
    echo "  $0 core      # 只安装核心套件"
    echo "  $0 dev ai    # 安装开发套件和 AI 增强套件"
    echo "  $0 all       # 安装全部"
}

# 主函数
main() {
    check_clawhub
    
    if [ $# -eq 0 ]; then
        show_help
        exit 0
    fi
    
    for arg in "$@"; do
        case $arg in
            core) install_core ;;
            dev) install_dev ;;
            ai) install_ai ;;
            monitor) install_monitor ;;
            browser) install_browser ;;
            search) install_search ;;
            image) install_image ;;
            feishu) install_feishu ;;
            all) install_all ;;
            -h|--help) show_help; exit 0 ;;
            *) log_error "未知套餐: $arg"; show_help; exit 1 ;;
        esac
    done
    
    log_success "=== 安装完成 ==="
    log_info "运行 'openclaw skills list' 查看已安装 Skills"
    log_info "运行 'sh ./scripts/restart.sh' 重启 Gateway 应用更改"
}

main "$@"
