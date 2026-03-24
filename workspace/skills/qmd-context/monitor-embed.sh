#!/bin/bash
echo "QMD 嵌入生成监控"
echo "=================="
echo "开始时间: $(date)"
echo ""

# 检查进程状态
echo "1. 检查嵌入进程:"
ps aux | grep "qmd embed" | grep -v grep

echo -e "\n2. 检查日志文件:"
if [ -f "/tmp/qmd-embed.log" ]; then
    echo "日志文件大小: $(wc -l /tmp/qmd-embed.log | awk '{print $1}') 行"
    echo "最后10行:"
    tail -10 /tmp/qmd-embed.log
else
    echo "日志文件不存在"
fi

echo -e "\n3. 检查模型目录:"
if [ -d "$HOME/.cache/qmd/models" ]; then
    echo "模型目录内容:"
    ls -la "$HOME/.cache/qmd/models/" 2>/dev/null | head -10
    echo ""
    echo "模型文件大小:"
    du -sh "$HOME/.cache/qmd/models/" 2>/dev/null
else
    echo "模型目录不存在"
fi

echo -e "\n4. 检查数据库状态:"
if [ -f "$HOME/.cache/qmd/index.sqlite" ]; then
    echo "数据库大小: $(du -h "$HOME/.cache/qmd/index.sqlite" | awk '{print $1}')"
    echo "修改时间: $(stat -c %y "$HOME/.cache/qmd/index.sqlite" 2>/dev/null || echo "未知")"
else
    echo "数据库文件不存在"
fi

echo -e "\n5. 当前状态摘要:"
npx @tobilu/qmd status 2>/dev/null | grep -A 5 "Documents" || echo "无法获取状态"

echo -e "\n=================="
echo "监控时间: $(date)"
echo ""

# 建议
echo "建议操作:"
echo "1. 如果进程卡住超过30分钟，按 Ctrl+C 中断"
echo "2. 然后运行: npx @tobilu/qmd embed --verbose 查看详细进度"
echo "3. 或检查网络连接和磁盘空间"
echo "4. 嵌入完成后运行验证脚本"