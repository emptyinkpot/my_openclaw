#!/bin/bash

# 确保日志目录存在
mkdir -p /tmp/logs /app/work/logs/bypass

# 停止可能占用端口的进程
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 3001/tcp 2>/dev/null || true

sleep 1

# 启动小说管理 API 服务
echo "Starting Novel Manager API..."
cd /workspace/projects/extensions/novel-manager
NODE_ENV=production NOVEL_API_PORT=3001 node dist/server.js &
NOVEL_API_PID=$!
echo "Novel API PID: $NOVEL_API_PID"
cd /workspace/projects

# 启动 OpenClaw Gateway (通过 supervisor 管理，自动重启)
echo "Starting OpenClaw Gateway via supervisor..."
supervisorctl -s unix:///tmp/supervisor.sock status openclaw-gateway >/dev/null 2>&1 || \
  supervisorctl -s unix:///tmp/supervisor.sock add openclaw-gateway 2>/dev/null
supervisorctl -s unix:///tmp/supervisor.sock start openclaw-gateway 2>/dev/null

# 等待Gateway启动
sleep 3

# 小说管理已集成到 OpenClaw 插件
# 访问地址: http://localhost:5000/novel/
# API 地址: http://localhost:3001/novel/api

echo ""
echo "Services started:"
echo "- Novel Manager API: http://localhost:3001/novel/api"
echo "- OpenClaw Gateway: http://localhost:5000 (managed by supervisor)"
echo "- Novel Manager UI: http://localhost:5000/ (integrated)"
echo ""
echo "To check status: supervisorctl -s unix:///tmp/supervisor.sock status"
