#!/bin/bash

echo "=========================================="
echo "         OpenClaw 服务健康检查"
echo "=========================================="

echo ""
echo "【Supervisor 管理的服务】"
supervisorctl -s unix:///tmp/supervisor.sock status 2>/dev/null

echo ""
echo "【端口监听状态】"
echo -n "Gateway (5000): "
ss -tlnp 2>/dev/null | grep -q ":5000" && echo "✅ 监听中" || echo "❌ 未监听"
echo -n "Novel Manager (3001): "
ss -tlnp 2>/dev/null | grep -q ":3001" && echo "✅ 监听中" || echo "❌ 未监听"

echo ""
echo "【服务健康检查】"
echo -n "Gateway: "
GATEWAY_STATUS=$(curl -s --max-time 3 http://127.0.0.1:5000/health 2>/dev/null)
if [ "$GATEWAY_STATUS" = '{"ok":true,"status":"live"}' ]; then
  echo "✅ 正常"
else
  echo "❌ 异常"
fi

echo -n "Novel Manager: "
NOVEL_STATUS=$(curl -s --max-time 3 http://127.0.0.1:3001/health 2>/dev/null)
if echo "$NOVEL_STATUS" | grep -q '"status":"ok"'; then
  echo "✅ 正常"
else
  echo "❌ 异常"
fi

echo ""
echo "【预览链接】"
echo "HTTPS: https://380cdf5c-c0a6-420a-acbf-3b2e64d0d9cf.dev.coze.site"
echo ""
