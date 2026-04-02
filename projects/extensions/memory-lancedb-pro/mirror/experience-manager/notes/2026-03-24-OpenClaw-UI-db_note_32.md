---
id: "db_note_32"
title: "OpenClaw UI 导航栏统一与编码排查"
category: "dev"
created_at: "2026-03-24T10:30:00.000Z"
updated_at: "2026-03-25T05:42:30.000Z"
tags: ["OpenClaw", "Control UI", "encoding", "cache", "debug", "static files"]
related_experience_ids: []
---
# OpenClaw UI 导航栏统一与编码排查

## Summary
OpenClaw UI 导航栏统一与编码排查

## Content
# OpenClaw UI 导航栏统一与编码排查

导航栏的共享源、本地副本和缓存版本号必须一起对。

## 检查

- 看真实 DOM
- 看 served 路径
- 看 shared/nav-bar.html 是否被正确读取
- 看 cache busting 版本号

## Sections
-