#!/bin/bash

# 绠€鍗曟祴璇曟祦姘寸嚎

TOKEN="CHANGE_ME_GATEWAY_TOKEN"
BASE_URL="http://localhost:5000"

echo "=== 娴佹按绾挎祴璇?==="
echo ""

# 1. 娴嬭瘯鐣寗浣滃搧鍒楄〃
echo "1. 鑾峰彇鐣寗浣滃搧..."
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/novel/fanqie/works" | jq '.data | length'

# 2. 鑾峰彇鏈湴浣滃搧
echo ""
echo "2. 鑾峰彇鏈湴浣滃搧..."
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/novel/works" | jq '.data | length'

# 3. 娴嬭瘯鍙戝竷 (dryRun)
echo ""
echo "3. 娴嬭瘯鍙戝竷娴佺▼..."
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

# 4. 璁㈤槄 SSE (浣跨敤 timeout 闄愬埗鏃堕棿)
echo ""
echo "4. 璁㈤槄 SSE 杩涘害 (鏈€澶氱瓑寰?15 绉?..."
timeout 15 curl -s -N \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/novel/sse/progress/$PROGRESS_ID?token=$TOKEN" 2>&1 | head -20

echo ""
echo "=== 娴嬭瘯瀹屾垚 ==="

