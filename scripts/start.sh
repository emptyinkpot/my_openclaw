#!/bin/bash

# 确保日志目录存在
mkdir -p /tmp/logs /app/work/logs/bypass /tmp/openclaw

# 停止旧进程
pkill -f "node dist/server.js" 2>/dev/null || true
pkill -f "openclaw gateway" 2>/dev/null || true
sleep 2

# 启动小说管理 API 服务
echo "Starting Novel Manager API..."
cd /workspace/projects/extensions/novel-manager
NODE_ENV=production NOVEL_API_PORT=3001 nohup node dist/server.js > /tmp/novel-api.log 2>&1 &
echo "Novel API PID: $!"
cd /workspace/projects

# 启动 OpenClaw Gateway (直接后台启动)
echo "Starting OpenClaw Gateway..."
nohup openclaw gateway --force > /tmp/gateway.log 2>&1 &
echo "Gateway PID: $!"

# 等待启动
sleep 5

# 检查状态
echo ""
echo "Services started:"
echo "- Novel Manager API: http://localhost:3001/novel/api"
echo "- OpenClaw Gateway: http://localhost:5000"
echo "- Novel Manager UI: http://localhost:5000/"
echo ""
netstat -tlnp 2>/dev/null | grep -E "5000|3001" || ss -tlnp 2>/dev/null | grep -E "5000|3001"
