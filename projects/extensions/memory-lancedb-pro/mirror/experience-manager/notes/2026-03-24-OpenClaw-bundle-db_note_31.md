---
id: "db_note_31"
title: "OpenClaw bundle 黑屏调试方法"
category: "dev"
created_at: "2026-03-24T10:00:00.000Z"
updated_at: "2026-03-25T05:42:30.000Z"
tags: ["OpenClaw", "Control UI", "bundle", "syntax", "debug", "methodology"]
related_experience_ids: []
---
# OpenClaw bundle 黑屏调试方法

## Summary
OpenClaw bundle 黑屏调试方法

## Content
# OpenClaw bundle ??????

核心观念：先看 bundle 是否能解析，再看 customElements 是否注册成功。

- 先用 parser 查语法
- 再用 customElements.get('openclaw-app') 看主组件
- 最后才去看 token 与路由

## Sections
-