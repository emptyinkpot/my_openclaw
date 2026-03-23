#!/bin/bash

# QMD 经验集成设置脚本
# 将经验管理模块与 QMD 工作区集成

set -e

echo "=== 设置 QMD 经验集成 ==="

# 配置
QMD_WORKSPACE="/workspace/projects/qmd-workspace"
EXPERIENCE_DIR="$QMD_WORKSPACE/experience"
SCRIPTS_DIR="$QMD_WORKSPACE/scripts"
API_PORT=3003

# 1. 创建目录结构
echo "1. 创建目录结构..."
mkdir -p "$EXPERIENCE_DIR"
mkdir -p "$SCRIPTS_DIR"

# 2. 启动本地 API 服务器（后台运行）
echo "2. 启动经验 API 服务器..."
cd "$QMD_WORKSPACE"
if ! pgrep -f "experience-api-wrapper.js server" > /dev/null; then
    node scripts/experience-api-wrapper.js server $API_PORT > /tmp/experience-api.log 2>&1 &
    echo "   API 服务器已启动 (端口: $API_PORT)"
    sleep 2
else
    echo "   API 服务器已在运行"
fi

# 3. 同步经验数据到 QMD
echo "3. 同步经验数据..."
cd "$QMD_WORKSPACE"
node scripts/experience-api-wrapper.js sync-qmd

# 4. 添加到 QMD 集合
echo "4. 添加到 QMD 集合..."
if command -v npx &> /dev/null; then
    # 检查是否已存在 experience 集合
    if ! npx @tobilu/qmd collection list 2>/dev/null | grep -q "experience"; then
        npx @tobilu/qmd collection add "$EXPERIENCE_DIR" --name experience 2>/dev/null || true
        echo "   已添加 experience 集合"
    else
        echo "   experience 集合已存在"
    fi
    
    # 生成嵌入向量
    echo "5. 生成嵌入向量..."
    npx @tobilu/qmd embed --incremental 2>/dev/null || true
else
    echo "   ⚠️  npx 不可用，跳过 QMD 集合设置"
fi

# 5. 创建使用说明
echo "6. 创建使用说明..."
cat > "$EXPERIENCE_DIR/USAGE.md" << 'EOF'
# QMD 经验集成使用指南

## 概述
此集成将经验管理模块的数据与 QMD 搜索工具连接，让你可以通过 QMD 搜索和查询积累的经验记录。

## 数据源
- **本地 API**: http://localhost:3003/api/experience
- **原始数据**: `/workspace/projects/extensions/plugins/experience-manager/data/experiences.json`
- **总记录**: 106 条经验记录

## 使用方法

### 1. 通过 QMD 搜索
```bash
# 基本搜索
npx @tobilu/qmd search "OpenClaw" -c experience --json

# 高级查询
npx @tobilu/qmd query "前端开发流程" --json --all --files --min-score 0.4

# 获取文档
npx @tobilu/qmd get "experience/experience_exp_1774149411555_bbpdasy97.md" --full
```

### 2. 通过 API 搜索
```bash
# 搜索经验
curl "http://localhost:3003/api/experience/search?q=问题排查"

# 按标签筛选
curl "http://localhost:3003/api/experience/tag/前端"

# 获取统计
curl http://localhost:3003/api/experience/stats
```

### 3. 使用脚本工具
```bash
# 搜索经验
cd /workspace/projects/qmd-workspace
node scripts/experience-integration.js search "bug修复"

# 同步数据
node scripts/experience-integration.js sync

# 查看统计
node scripts/experience-integration.js stats
```

### 4. 直接文件访问
所有经验记录已转换为 Markdown 文件：
```
/workspace/projects/qmd-workspace/experience/
├── experience_exp_1774149411555_bbpdasy97.md
├── experience_exp_1774147000000_openclaw_preview_fix.md
├── ...
└── README.md (索引文件)
```

## 集成架构
```
经验数据 (JSON) → 本地API服务器 → QMD集合 → 可搜索文档
      ↓
  脚本工具 → 直接访问/转换
```

## 自动化同步
要定期同步经验数据，可以设置定时任务：
```bash
# 每天凌晨同步一次
0 2 * * * cd /workspace/projects/qmd-workspace && node scripts/experience-integration.js sync
```

## 故障排除

### Q: 搜索返回空结果
1. 检查 API 服务器是否运行: `curl http://localhost:3003/api/experience/stats`
2. 检查 QMD 集合: `npx @tobilu/qmd collection list`
3. 重新生成嵌入: `npx @tobilu/qmd embed --force`

### Q: API 服务器未启动
```bash
cd /workspace/projects/qmd-workspace
node scripts/experience-api-wrapper.js server 3003 &
```

### Q: 数据不同步
```bash
# 手动同步
cd /workspace/projects/qmd-workspace
node scripts/experience-api-wrapper.js sync-qmd
```

## 扩展功能
如需添加更多功能，可以修改：
- `scripts/experience-integration.js` - 主集成脚本
- `scripts/experience-api-wrapper.js` - API 服务器
- `scripts/qmd-experience-plugin.js` - QMD 插件

---
*最后更新: $(date)*
EOF

echo "7. 测试集成..."
# 测试 API
if curl -s http://localhost:3003/api/experience/stats | grep -q "totalRecords"; then
    echo "   ✅ API 服务器测试通过"
else
    echo "   ❌ API 服务器测试失败"
fi

# 测试文件同步
if [ -f "$EXPERIENCE_DIR/experience_exp_1774149411555_bbpdasy97.md" ]; then
    echo "   ✅ 文件同步测试通过"
else
    echo "   ❌ 文件同步测试失败"
fi

echo ""
echo "=== 集成完成 ==="
echo ""
echo "🎉 QMD 经验集成已设置完成！"
echo ""
echo "可用命令:"
echo "1. 搜索经验: node scripts/experience-integration.js search \"关键词\""
echo "2. 同步数据: node scripts/experience-integration.js sync"
echo "3. 查看统计: node scripts/experience-integration.js stats"
echo "4. QMD 搜索: npx @tobilu/qmd search \"关键词\" -c experience --json"
echo ""
echo "详细使用说明: $EXPERIENCE_DIR/USAGE.md"
echo "API 服务器: http://localhost:3003/api/experience"