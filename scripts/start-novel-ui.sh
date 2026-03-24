#!/bin/bash

cd /workspace/projects/web-ui
nohup node server.js > /tmp/novel-ui.log 2>&1 &
echo "Novel Web UI started on port 3000"
