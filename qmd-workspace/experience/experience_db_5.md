# 前端 API_BASE 路径配置策略

**ID**: db_5
**类型**: feature_dev
**难度**: 2/5
**经验值**: 100
**日期**: 2026-03-20

## 问题描述
前端 API_BASE 需要根据部署环境选择正确的路径。本地开发时直接连接后端服务端口，通过 Gateway 时代理到插件路由。

## 解决方案
1. 本地开发：API_BASE = "http://localhost:3001/novel/api"
2. 通过 Gateway 代理：API_BASE = "/api/novel"，Gateway 会路由到插件
3. 检查 Gateway 是否注册了对应路由：api.registerHttpRoute({ path: "/api/novel", match: "prefix", ... })
4. SSE 等长连接建议直接连接后端服务，避免代理超时

## 应用的经验
- API 路由设计
- Gateway 代理
- 环境配置

## 获得的经验
- Gateway 代理 API 请求到插件，路径前缀必须匹配注册的路由
- 短请求（CRUD）可以通过 Gateway 代理，长连接（SSE）建议直连后端
- 开发环境使用 localhost:port 直连，生产环境可能需要通过 Gateway
- curl 测试 API 时注意检查认证 Token

## 标签
`api` `gateway` `routing` `frontend` `deployment`

---
*从经验管理模块同步*
