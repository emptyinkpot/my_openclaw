#!/bin/bash

# 确保日志目录存在
mkdir -p /tmp/logs /app/work/logs/bypass /tmp/openclaw

# 停止旧进程
pkill -f "openclaw gateway" 2>/dev/null || true
sleep 2

# 启动 OpenClaw Gateway (直接后台启动)
echo "Starting OpenClaw Gateway..."
nohup openclaw gateway --force > /tmp/gateway.log 2>&1 &
echo "Gateway PID: $!"

# 等待启动
sleep 5

# 检查状态
echo ""
echo "Services started:"
echo "- OpenClaw Gateway: http://localhost:5000"
echo "- Novel Manager UI: http://localhost:5000/"
echo ""
netstat -tlnp 2>/dev/null | grep -E "5000" || ss -tlnp 2>/dev/null | grep -E "5000"
