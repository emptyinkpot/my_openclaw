---
id: "exp_1774000003_api_auth"
title: "API 认证统一：Bearer Token 封装"
type: "feature_dev"
date: "2026-03-20T09:46:40.003Z"
updated_at: "2026-03-25T05:42:24.000Z"
difficulty: 2
xp_gained: 100
tags: ["api", "authentication", "token", "frontend"]
source_project: ""
source_file: ""
---
# API 认证统一：Bearer Token 封装

## Summary
所有 API 请求使用统一的认证方式：Authorization: Bearer <token>。前端封装 api() 函数自动携带 token，避免每次请求重复写 header。

## Problem
API返回401 Unauthorized

## Solution
1. 前端定义 GATEWAY_TOKEN 常量
2. 封装 api(endpoint, options) 函数，自动添加 Authorization header
3. 所有 API 调用使用 api() 函数，不直接用 fetch

## Applied
- API 封装
- 认证机制

## Gained
- OpenClaw Gateway 使用 Token 认证模式
- Token 在 openclaw.json 的 gateway.auth.token 配置
- 前端请求必须携带 Authorization: Bearer <token>
- 封装 api() 函数可以统一处理认证、错误、超时等逻辑

## Verification
-

## Source
- project: 
- branch: 
- file: 
- url: 