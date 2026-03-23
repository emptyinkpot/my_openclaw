# SSE 通过 Gateway 代理频繁重连问题

**ID**: db_1
**类型**: bug_fix
**难度**: 3/5
**经验值**: 150
**日期**: 2026-03-20

## 问题描述
前端 SSE 连接通过 Gateway 代理时频繁断开重连，日志显示 [SSE] 正在重连... 每隔约 3 秒触发一次。原因是 Gateway 代理 SSE 请求时有超时限制，导致长连接被中断。

## 解决方案
1. 分析问题：SSE 通过 Gateway 代理时有超时限制
2. 测试验证：直接连接 Novel API 端口 3001，SSE 稳定
3. 修改前端 SSE URL：从 /novel/sse/progress/ 改为 http://localhost:3001/novel/sse/progress/
4. 绕过 Gateway 代理的超时限制

## 应用的经验
- SSE 长连接机制
- Gateway 代理超时
- 问题定位方法

## 获得的经验
- SSE 是长连接，不适合通过有超时限制的代理
- Gateway 代理默认有 3 秒左右的超时限制
- 可以通过直接连接后端服务绕过代理超时
- curl -sN 可以测试 SSE 连接稳定性
- EventSource onerror 时 readyState=0 表示正在重连，不是真正错误

## 标签
`sse` `gateway` `timeout` `proxy` `eventsource`

---
*从经验管理模块同步*
