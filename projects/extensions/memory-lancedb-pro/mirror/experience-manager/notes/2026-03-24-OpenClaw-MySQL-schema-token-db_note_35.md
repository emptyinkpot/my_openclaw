---
id: "db_note_35"
title: "OpenClaw 云端 MySQL 读取可见化：真实 schema、真实路由、真实 token"
category: "dev"
created_at: "2026-03-24T13:00:00.000Z"
updated_at: "2026-03-25T05:42:32.000Z"
tags: ["OpenClaw", "MySQL", "cloud database", "visibility", "debugging", "frontend", "experience"]
related_experience_ids: []
---
# OpenClaw 云端 MySQL 读取可见化：真实 schema、真实路由、真实 token

## Summary
OpenClaw 云端 MySQL 读取可见化：真实 schema、真实路由、真实 token

## Content
# OpenClaw 云端 MySQL 读取可见化：真实 schema、真实路由、真实 token

## 问题本质

这次不是“数据库根本没连上”，而是“前端没有把真实读取结果展示出来”。后端 MySQL 实际可用，但页面里存在三类误导：

1. 旧主机名在本机默认 DNS 下无法解析，只有直接 IP 才稳定可连。
2. 某些页面还在用旧路径或假按钮，点击后看起来像测试，实际上没有真正命中后端 schema 接口。
3. 部分页面硬编码了旧 token，或者没有读取启动器注入的 bootstrap token，导致读库请求在不同入口下行为不一致。

## 真实结论

- 真正可用的数据库主机是 `124.220.245.121:22295`。
- 真正应该读取的 schema 接口是 `/api/novel/db/schema`。
- 真正应该判断健康状态的接口是 `/api/novel/db/health`。
- 页面要让人“看见读库”，不能只靠 console log，必须在 DOM 里直接显示：
  - 当前正在读取
  - 已加载多少张表
  - 失败时的错误原因

## 架构思路

- 启动器负责把 token 注入到浏览器可读的位置。
- 页面负责从 bootstrap token 中取认证信息。
- 所有 MySQL 可见性页面都走同一套后端接口：`/api/novel/db/schema`。
- 数据库主机展示、重置、状态提示都统一成真实 IP，而不是历史域名。

## 验证方法

1. 用 `curl.exe` 带 `Authorization` 头请求 `/api/novel/db/health`。
2. 用 `curl.exe` 带 `Authorization` 头请求 `/api/novel/db/schema`。
3. 在页面中观察是否出现：
   - “正在从 MySQL 读取 schema...”
   - “已读取 MySQL schema，共 N 张表”
4. 检查页面中的数据库主机是否已经统一成 `124.220.245.121`。
5. 检查 `extensions/public` 页面是否不再依赖硬编码 token。

## 经验结论

> 真实可用 ≠ 界面看起来能点。

云端 MySQL 的调试要同时看三层：

- 网络是否能直连
- 后端 API 是否真返回 schema
- 前端有没有把读到的结果展示给人看

只要其中任何一层仍然“假装成功”，用户就会以为数据库没读出来。

## Sections
-