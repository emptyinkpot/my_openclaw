---
id: "exp_1774353600000_contentcraft_json_fallback"
title: "Content Craft 章节生成故障：文本字段误当 JSON 解析"
type: "debugging"
date: "2026-03-24T12:00:00.000Z"
updated_at: "2026-03-25T05:42:29.000Z"
difficulty: 3
xp_gained: 180
tags: ["Content Craft", "JSON parse", "debugging", "database", "chapter generation", "experience"]
source_project: ""
source_file: ""
---
# Content Craft 章节生成故障：文本字段误当 JSON 解析

## Summary
章节生成链路在读取人物、细纲和背景字段时，默认假设数据库里存的是 JSON 数组；一旦字段里保存的是纯文本（例如“海津孝、小红”），JSON.parse 就会直接抛错，导致整章失败。

## Problem
排查章节生成日志里 Unexpected token '海' / '琉' / '满' 的原因，并修复为可继续生成的容错逻辑。

## Solution
1. 在 content-craft 中增加 safeJsonParse 与 parseStringList 两个容错工具。
2. 人物别名、性格、章节出场人物等列表字段改为兼容 JSON 数组和分隔文本。
3. related-chapters、consistency-checker、story-state-manager 一并改成安全解析，避免单条脏数据拖垮整章。
4. 经验层面记录为：数据库字段格式不可信时，先做兼容解析，再逐步清洗存量数据。

## Applied
- 容错解析
- 文本/JSON 双格式兼容
- 章节生成稳定性
- 数据库脏数据兜底
- 最小侵入式修复

## Gained
- 生成链路里最危险的不是模型输出，而是数据库输入假设。
- 只要字段可能来自人工录入或历史迁移，就不能默认它一定是 JSON。
- 对章节生成这种批处理流程，最重要的是‘不中断整批’，次要才是单条数据的完美格式。
- 安全解析要尽量贴近调用点，避免某个模块修了、另一个模块还在直接 JSON.parse。
- 修完后应回头补一条经验，明确下次看到类似日志先查哪一层。

## Verification
-

## Source
- project: 
- branch: 
- file: 
- url: 