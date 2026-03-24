#!/bin/bash
echo "测试 QMD 功能..."
echo "=================="

# 测试版本
echo "1. 测试 QMD 版本:"
npx @tobilu/qmd --version

echo -e "\n2. 测试帮助命令:"
npx @tobilu/qmd --help 2>&1 | head -20

echo -e "\n3. 测试搜索功能（简单查询）:"
npx @tobilu/qmd search "test" --json 2>&1 | head -5

echo -e "\n4. 创建测试文档:"
mkdir -p /tmp/qmd-test
echo "# 测试文档" > /tmp/qmd-test/test1.md
echo "这是一个测试文档，用于验证 QMD 功能。" >> /tmp/qmd-test/test1.md
echo "文档创建完成: /tmp/qmd-test/test1.md"

echo -e "\n5. 测试集合添加（可能会失败，因为 better-sqlite3 问题）:"
npx @tobilu/qmd collection add /tmp/qmd-test --name test-collection 2>&1 | head -10

echo -e "\n=================="
echo "测试完成"