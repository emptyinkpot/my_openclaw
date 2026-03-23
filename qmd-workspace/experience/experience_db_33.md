# API 认证统一：Bearer Token 封装

**ID**: db_33
**类型**: feature_dev
**难度**: 2/5
**经验值**: 100
**日期**: 2026-03-20

## 问题描述
所有 API 请求使用统一的认证方式：Authorization: Bearer <token>。前端封装 api() 函数自动携带 token，避免每次请求重复写 header。

## 解决方案
1. 前端定义 GATEWAY_TOKEN 常量
2. 封装 api(endpoint, options) 函数，自动添加 Authorization header
3. 所有 API 调用使用 api() 函数，不直接用 fetch

## 应用的经验
- API 封装
- 认证机制

## 获得的经验
- OpenClaw Gateway 使用 Token 认证模式
- Token 在 openclaw.json 的 gateway.auth.token 配置
- 前端请求必须携带 Authorization: Bearer <token>
- 封装 api() 函数可以统一处理认证、错误、超时等逻辑

## 标签
`api` `authentication` `token` `frontend`

---
*从经验管理模块同步*
