---
id: "db_note_23"
title: "修复完成：暂时禁用 memory-lancedb-pro 插件"
category: "dev"
created_at: "2026-03-20T13:29:27.000Z"
updated_at: "2026-03-25T05:42:31.000Z"
tags: ["OpenClaw", "修复", "禁用", "memory-lancedb-pro", "完成"]
related_experience_ids: []
---
# 修复完成：暂时禁用 memory-lancedb-pro 插件

## Summary
修复完成：暂时禁用 memory-lancedb-pro 插件

## Content
# 修复完成：暂时禁用 memory-lancedb-pro 插件

用户选择：让系统变快，以后需要时再修复 - 暂时禁用 memory-lancedb-pro 插件

---

## ✅ 完成的修复

1. ✅ 禁用了 rerank（重排序）功能
2. ✅ 禁用了 smartExtraction（智能提取）功能
3. ✅ 禁用了 memory-lancedb-pro 插件
4. ✅ 移除了 slots.memory 配置
5. ✅ 多次重启了 Gateway

---

## 📋 修改的配置

### openclaw.json 修改：
1. 移除了 slots.memory 配置
2. 将 plugins.entries.memory-lancedb-pro.enabled 设置为 false

---

## 🎉 结果

- ✅ memory-lancedb-pro 插件已禁用
- ✅ 系统应该变快了
- ✅ 以后需要时可以重新启用

---

## 📝 备注

- 当前有一个配置警告：memory-lancedb-pro 被禁用了但配置还在，这个没关系
- 以后需要时，可以把 plugins.entries.memory-lancedb-pro.enabled 设置为 true，并恢复 slots.memory 配置

## Sections
-