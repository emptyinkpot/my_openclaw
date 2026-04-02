#!/bin/bash

# 简单测试流水线

TOKEN="e1647cdb-1b80-4eee-a975-7599160cc89b"
BASE_URL="http://localhost:5000"

echo "=== 流水线测试 ==="
echo ""

# 1. 测试番茄作品列表
echo "1. 获取番茄作品..."
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/novel/fanqie/works" | jq '.data | length'

# 2. 获取本地作品
echo ""
echo "2. 获取本地作品..."
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/novel/works" | jq '.data | length'

# 3. 测试发布 (dryRun)
echo ""
echo "3. 测试发布流程..."
PROGRESS_ID="test_$(date +%s)"
echo "Progress ID: $PROGRESS_ID"

curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "$BASE_URL/api/novel/fanqie/publish" \
  -d "{
    \"workId\": \"7600575059215780926\",
    \"dryRun\": true,
    \"headless\": true,
    \"skipAudit\": true,
    \"progressId\": \"$PROGRESS_ID\"
  }" | jq '.'

# 4. 订阅 SSE (使用 timeout 限制时间)
echo ""
echo "4. 订阅 SSE 进度 (最多等待 15 秒)..."
timeout 15 curl -s -N \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/novel/sse/progress/$PROGRESS_ID?token=$TOKEN" 2>&1 | head -20

echo ""
echo "=== 测试完成 ==="
