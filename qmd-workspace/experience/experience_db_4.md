# Express 服务添加 SSE 路由支持

**ID**: db_4
**类型**: bug_fix
**难度**: 3/5
**经验值**: 150
**日期**: 2026-03-20

## 问题描述
server.ts 是独立的 Express 服务，缺少 SSE 路由定义导致 SSE 请求返回 404。需要添加 SSE 端点处理，包括连接注册、心跳保活、客户端断开清理。

## 解决方案
1. 添加 app.get("/novel/sse/progress/:progressId", ...) 路由
2. 设置 SSE 响应头：Content-Type: text/event-stream, Cache-Control: no-cache, Connection: keep-alive
3. 立即发送连接确认消息：res.write("data: {JSON}\n\n")
4. 导入 ProgressManager.registerClient() 注册客户端
5. 设置心跳定时器每 15 秒发送 : heartbeat\n\n
6. req.on("close") 时清理心跳和注销客户端

## 应用的经验
- Express 路由
- SSE 协议
- 连接管理

## 获得的经验
- SSE 响应头必须包含 Content-Type: text/event-stream
- SSE 消息格式：data: {content}\n\n，注释格式：: {comment}\n\n
- 心跳保活防止连接被代理或防火墙关闭
- req.on("close") 是客户端断开的可靠检测方式
- Express 和 OpenClaw Gateway 可以共享相同的 ProgressManager

## 标签
`express` `sse` `server` `websocket-alternative`

---
*从经验管理模块同步*
