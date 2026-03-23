# SSE 连接反复断开问题排查与修复

**ID**: db_63
**类型**: bug_fix
**难度**: 3/5
**经验值**: 150
**日期**: 2026-03-21

## 问题描述
用户反馈前端点击按钮后，SSE 连接反复建立又断开，readyState 一直是 0（CONNECTING）

## 解决方案
## 问题定位
1. 先用 curl 直接测试后端 SSE 路由，验证后端是否正常
2. 发现后端完全正常！curl -v -N <SSE_URL> 能稳定连接并接收所有进度
3. 定位到问题出在前端

## 修复内容
### 后端
- 修复 handleSse 函数：从 async function 改为普通 function（async function 会导致 SSE 连接异常）

### 前端
- 移除 SSE URL 中 token 的 encodeURIComponent（token 不需要编码）
- 添加更详细的日志，用 ====== 标记关键节点
- onerror 中不做额外操作，让 EventSource 自动处理重连

## 验证
- 强制刷新浏览器（Ctrl+Shift+R）
- 点击按钮，SSE 连接稳定，进度实时显示

## 应用的经验
无

## 获得的经验
- 区分前端/后端问题
- 先验证后端再看前端
- 用 curl -v -N 直接测试 SSE
- handleSse 不能是 async
- EventSource 默认自动重连

## 标签
`SSE` `debug` `OpenClaw` `前端` `后端`

---
*从经验管理模块同步*
