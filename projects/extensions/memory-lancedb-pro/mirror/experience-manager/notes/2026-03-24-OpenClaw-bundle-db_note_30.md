---
id: "db_note_30"
title: "OpenClaw bundle 字符损坏修复"
category: "dev"
created_at: "2026-03-24T09:30:00.000Z"
updated_at: "2026-03-25T05:42:30.000Z"
tags: ["OpenClaw", "Control UI", "bundle", "syntax", "debug"]
related_experience_ids: []
---
# OpenClaw bundle 字符损坏修复

## Summary
OpenClaw bundle 字符损坏修复

## Content
# OpenClaw bundle ??????

在 minified bundle 里，一个字符错了就能让 UI 直接黑屏。修复时要用 parser 定位最小修改，不要作大范围重写。

## Sections
-