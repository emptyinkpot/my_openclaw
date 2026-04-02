---
id: "exp_1774350400000_mysql_visibility_read"
title: "OpenClaw 云端 MySQL 读取可见化"
type: "problem_solving"
date: "2026-03-24T11:06:40.000Z"
updated_at: "2026-03-25T05:42:29.000Z"
difficulty: 4
xp_gained: 210
tags: ["OpenClaw", "MySQL", "cloud database", "frontend", "visibility", "debugging", "experience"]
source_project: ""
source_file: ""
---
# OpenClaw 云端 MySQL 读取可见化

## Summary
云端 MySQL 实际可用，但前端页面需要把 schema 读取结果、认证状态和数据库主机展示出来，避免看起来像没读库。

## Problem
为什么其他页面明明能连云端 MySQL，却看起来没在读取？

## Solution
1. 统一所有 MySQL 读取都走 `/api/novel/db/schema` 和 `/api/novel/db/health`。
2. 前端按钮不再假装测试，而是直接把 schema 数量和状态写进 DOM。
3. 页面认证优先读取启动器注入的 bootstrap token，再回退到旧 token。
4. 数据库主机展示统一成 `124.220.245.121`，避免旧域名误导。
5. `extensions/public` 不再只依赖硬编码 token，SSE/API 都改为动态 token 读取。
6. 任何 MySQL 可见性页面都要有明确的“正在读取 / 已读取 / 失败”状态。

## Applied
- MySQL schema 可见化
- bootstrap token
- 统一后端路由
- 状态提示写入 DOM
- 真实 IP 代替旧域名

## Gained
- 后端能连上不等于前端看得见，必须把 schema 数量、表名和错误写到页面上。
- 数据库调试时，路由、token 和主机名三者必须同时统一。
- 假按钮和假状态会制造最强的误判，尤其是 MySQL 这类高频入口。
- 云端数据库页面最好的验证不是 console 日志，而是 curl + DOM 双验证。

## Verification
-

## Source
- project: 
- branch: 
- file: 
- url: 