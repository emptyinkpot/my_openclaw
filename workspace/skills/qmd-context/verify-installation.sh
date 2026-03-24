#!/bin/bash
echo "验证 QMD 安装和配置"
echo "======================"
echo ""

# 1. 检查 QMD 版本
echo "1. QMD 版本:"
npx @tobilu/qmd --version
echo ""

# 2. 检查状态
echo "2. QMD 状态:"
npx @tobilu/qmd status --json 2>/dev/null | python3 -m json.tool 2>/dev/null || npx @tobilu/qmd status
echo ""

# 3. 检查集合
echo "3. 现有集合:"
npx @tobilu/qmd collection list 2>/dev/null || echo "无法列出集合"
echo ""

# 4. 测试搜索
echo "4. 测试搜索功能:"
TEST_RESULT=$(npx @tobilu/qmd search "测试" --json 2>/dev/null)
if [ -n "$TEST_RESULT" ]; then
    echo "✅ 搜索功能正常"
    echo "搜索结果示例:"
    echo "$TEST_RESULT" | python3 -m json.tool 2>/dev/null || echo "$TEST_RESULT" | head -5
else
    echo "❌ 搜索功能异常"
fi
echo ""

# 5. 测试高级查询
echo "5. 测试高级查询:"
QUERY_RESULT=$(npx @tobilu/qmd query "测试文档" --json 2>/dev/null | head -3)
if [ -n "$QUERY_RESULT" ]; then
    echo "✅ 高级查询正常"
else
    echo "⚠️  高级查询可能需要更多文档或嵌入生成"
fi
echo ""

# 6. 检查工作区
echo "6. 工作区结构:"
ls -la /workspace/projects/qmd-workspace/ 2>/dev/null || echo "工作区目录不存在"
echo ""

# 7. 创建示例文档（如果工作区为空）
if [ ! -f "/workspace/projects/qmd-workspace/projects/plan.md" ]; then
    echo "7. 创建示例文档..."
    mkdir -p /workspace/projects/qmd-workspace/{notes,meetings,docs,projects}
    
    cat > /workspace/projects/qmd-workspace/projects/plan.md << EOF
# OpenClaw 集成项目计划
## 目标
完成 QMD 上下文管理系统的集成

## 任务列表
1. ✅ 安装 QMD
2. ✅ 配置基本集合
3. ⏳ 创建 OpenClaw 技能
4. ⏳ 测试搜索功能
5. ⏳ 部署到生产环境

## 时间线
- 2026-03-23: 开始项目
- 2026-03-24: 完成测试
- 2026-03-25: 部署上线
EOF
    
    echo "✅ 示例文档已创建: /workspace/projects/qmd-workspace/projects/plan.md"
else
    echo "7. 示例文档已存在"
fi
echo ""

# 8. 添加项目集合（如果不存在）
echo "8. 配置项目集合:"
if ! npx @tobilu/qmd collection list 2>/dev/null | grep -q "projects"; then
    npx @tobilu/qmd collection add /workspace/projects/qmd-workspace/projects --name projects 2>&1 | tail -3
    echo "✅ 项目集合已添加"
else
    echo "✅ 项目集合已存在"
fi
echo ""

# 9. 添加上下文
echo "9. 添加上下文描述:"
npx @tobilu/qmd context add qmd://projects "OpenClaw 集成项目文档和计划" 2>/dev/null && echo "✅ 上下文已添加" || echo "⚠️  上下文添加失败或已存在"
echo ""

# 10. 生成嵌入（增量）
echo "10. 生成嵌入向量:"
npx @tobilu/qmd embed --incremental 2>&1 | tail -5
echo ""

# 11. 最终测试
echo "11. 最终功能测试:"
echo "搜索 'OpenClaw 集成':"
npx @tobilu/qmd search "OpenClaw 集成" --json 2>/dev/null | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if data:
        print(f'✅ 找到 {len(data)} 个相关文档')
        for doc in data[:2]:
            print(f'  • {doc[\"file\"]} (分数: {doc[\"score\"]:.2f})')
    else:
        print('⚠️  未找到相关文档（可能需要等待嵌入完成）')
except:
    print('❌ 解析结果失败')
"
echo ""
echo "======================"
echo "验证完成！"
echo ""
echo "下一步建议："
echo "1. 添加更多文档到 /workspace/projects/qmd-workspace/"
echo "2. 定期运行 'npx @tobilu/qmd embed --incremental'"
echo "3. 在 OpenClaw 中使用 exec 工具调用 QMD"
echo "4. 考虑设置定时任务自动更新索引"