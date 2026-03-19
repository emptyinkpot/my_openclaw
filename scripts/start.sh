#!/bin/bash

# 确保日志目录存在
mkdir -p /tmp/logs /app/work/logs/bypass

# 停止可能占用端口的进程
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 3001/tcp 2>/dev/null || true

sleep 1

# 启动 OpenClaw Gateway (通过 supervisor 管理，自动重启)
echo "Starting OpenClaw Gateway via supervisor..."
supervisorctl -s unix:///tmp/supervisor.sock status openclaw-gateway >/dev/null 2>&1 || \
  supervisorctl -s unix:///tmp/supervisor.sock add openclaw-gateway 2>/dev/null
supervisorctl -s unix:///tmp/supervisor.sock start openclaw-gateway 2>/dev/null

# 等待Gateway启动
sleep 3

# 启动小说数据管理 Web UI
echo "Starting Novel Manager on port 3001..."
cd /workspace/projects/apps/novel-manager
nohup pnpm start > /tmp/novel-manager.log 2>&1 &

echo ""
echo "Services started:"
echo "- OpenClaw Gateway: http://localhost:5000 (managed by supervisor)"
echo "- Novel Manager: http://localhost:3001"
echo ""
echo "To check status: supervisorctl -s unix:///tmp/supervisor.sock status"
