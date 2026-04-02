---
id: "db_4"
title: "Express 服务添加 SSE 路由支持"
type: "bug_fix"
date: "2026-03-20T02:41:56.000Z"
updated_at: "2026-03-25T05:42:28.000Z"
difficulty: 3
xp_gained: 150
tags: ["express", "sse", "server", "websocket-alternative"]
source_project: ""
source_file: ""
---
# Express 服务添加 SSE 路由支持

## Summary
server.ts 是独立的 Express 服务，缺少 SSE 路由定义导致 SSE 请求返回 404。需要添加 SSE 端点处理，包括连接注册、心跳保活、客户端断开清理。

## Problem
SSE 请求返回 Cannot GET /novel/sse/progress/xxx

## Solution
1. 添加 app.get("/novel/sse/progress/:progressId", ...) 路由
2. 设置 SSE 响应头：Content-Type: text/event-stream, Cache-Control: no-cache, Connection: keep-alive
3. 立即发送连接确认消息：res.write("data: {JSON}\n\n")
4. 导入 ProgressManager.registerClient() 注册客户端
5. 设置心跳定时器每 15 秒发送 : heartbeat\n\n
6. req.on("close") 时清理心跳和注销客户端

## Applied
- Express 路由
- SSE 协议
- 连接管理

## Gained
- SSE 响应头必须包含 Content-Type: text/event-stream
- SSE 消息格式：data: {content}\n\n，注释格式：: {comment}\n\n
- 心跳保活防止连接被代理或防火墙关闭
- req.on("close") 是客户端断开的可靠检测方式
- Express 和 OpenClaw Gateway 可以共享相同的 ProgressManager

## Verification
-

## Source
- project: 
- branch: 
- file: 
- url: 