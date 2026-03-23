# 合并 knowledge 到 experience-manager

**ID**: exp_1773942000000_merge_knowledge
**类型**: refactoring
**难度**: 2/5
**经验值**: 50
**日期**: 2026-03-19

## 问题描述
将根目录的 knowledge/ 静态知识库合并到 extensions/experience-manager/knowledge/，统一管理知识与经验。

## 解决方案
直接 mv knowledge/ extensions/experience-manager/knowledge/

## 应用的经验
- 目录结构简化

## 获得的经验
- knowledge/ 是静态知识库（手写 Markdown 文档），experience-manager/data/ 是动态经验记录（JSON）
- 两者职责不同但可以放在同一个插件下统一管理
- experience-manager 现在包含：data/experiences.json（动态经验）+ knowledge/（静态知识）

## 标签
`refactoring` `knowledge` `experience`

---
*从经验管理模块同步*
