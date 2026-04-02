---
id: "db_37"
title: "合并 knowledge 到 experience-manager"
type: "refactoring"
date: "2026-03-20T02:43:21.000Z"
updated_at: "2026-03-25T05:42:25.000Z"
difficulty: 2
xp_gained: 100
tags: ["refactoring", "knowledge", "experience"]
source_project: ""
source_file: ""
---
# 合并 knowledge 到 experience-manager

## Summary
将根目录的 knowledge/ 静态知识库合并到 extensions/experience-manager/knowledge/，统一管理知识与经验。

## Problem
knowledge 这个干啥的，为啥不集成到 experience-manager 里

## Solution
直接 mv knowledge/ extensions/experience-manager/knowledge/

## Applied
- 目录结构简化

## Gained
- knowledge/ 是静态知识库（手写 Markdown 文档），experience-manager/data/ 是动态经验记录（JSON）
- 两者职责不同但可以放在同一个插件下统一管理
- experience-manager 现在包含：data/experiences.json（动态经验）+ knowledge/（静态知识）

## Verification
-

## Source
- project: 
- branch: 
- file: 
- url: 