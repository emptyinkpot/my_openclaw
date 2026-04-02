---
id: "db_note_38"
title: "Content Craft 章节生成故障：文本字段误当 JSON 解析"
category: "dev"
created_at: "2026-03-24T21:50:00.000Z"
updated_at: "2026-03-25T05:42:32.000Z"
tags: ["Content Craft", "JSON parse", "chapter generation", "debugging", "database", "experience"]
related_experience_ids: []
---
# Content Craft 章节生成故障：文本字段误当 JSON 解析

## Summary
Content Craft 章节生成故障：文本字段误当 JSON 解析

## Content
# Content Craft 章节生成故障：文本字段误当 JSON 解析

## 问题现象

章节生成日志出现了 `Unexpected token '海'`、`Unexpected token '琼'`、`Unexpected token '满'`。
这说明代码把数据库里的普通文本当成了 JSON 去解析。
像“海津孝、小红”这种值并不是 JSON 数组，但生成链路里却直接执行了 `JSON.parse(...)`，于是整章失败。

## 根因

- 历史数据里同一字段可能同时存在 JSON 字符串和普通分隔文本。
- 生成管线默认假设所有相关字段都一定是 JSON。
- 相关章节、一致性检查、故事状态等辅助模块也存在同类直接解析问题，脏数据因此会在多处传播。

## 处理方式

1. 增加容错解析层：`safeJsonParse` 与 `parseStringList`。
2. 对字符串列表字段做兼容：优先识别 JSON，失败后按常见分隔符切分。
3. 对对象数组和结构化字段使用安全解析，失败时回退到空数组或默认值。
4. 把同类修复同步到相关章节、一致性检查和故事状态模块，避免只修一处。

## 经验总结

- 数据库字段只要可能来自历史迁移或人工编辑，就不能默认它一定是 JSON。
- 批处理流程最重要的是不中断整批，宁可局部降级，也不要整章失败。
- 安全解析要尽量贴近调用点，减少脏数据从一个模块扩散到多个模块。
- 遇到 `Unexpected token`，第一时间要看输入格式假设，而不是先怀疑模型或渲染层。

## 适用场景

- 章节细纲里的人物字段、人物关系、时间线字段。
- 历史遗留的 JSON / 文本混合数据。
- 批量生成、批量审核、批量同步等任务。
- 任何不能因为单条脏数据而整体停摆的工作流。

## Sections
-