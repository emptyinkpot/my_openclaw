---
id: "exp_1773940000000_merge_apps"
title: "合并 apps 到 extensions：简化 OpenClaw 项目结构"
type: "refactoring"
date: "2026-03-19T17:06:40.000Z"
updated_at: "2026-03-25T05:42:28.000Z"
difficulty: 3
xp_gained: 200
tags: ["refactoring", "architecture", "openclaw", "plugin", "directory-structure"]
source_project: ""
source_file: ""
---
# 合并 apps 到 extensions：简化 OpenClaw 项目结构

## Summary
将 apps/novel-manager 和 apps/experience-manager 合并到 extensions/，每个模块保持独立分离。删除 apps 目录，所有功能模块统一放在 extensions/ 下。

## Problem
apps 和 extensions 这俩是不是要建一个大文件夹容纳，还是合并

## Solution
1. 把 apps/novel-manager/core、services、utils、dist 移动到 extensions/novel-manager/
2. 把 apps/experience-manager 整体移动到 extensions/experience-manager/
3. 更新 extensions/novel-manager/index.ts 的引用路径（../../apps/novel-manager/dist → ./dist）
4. 合并 package.json 依赖
5. 为 experience-manager 添加 openclaw.plugin.json
6. 更新 openclaw.json 插件配置，添加 experience-manager 加载路径
7. 删除 apps/ 目录

## Applied
- 项目结构简化
- OpenClaw 插件架构

## Gained
- OpenClaw 插件完全可以包含完整功能，不需要强行分离 apps 和 extensions
- 每个插件独立分离：extensions/novel-manager、extensions/experience-manager
- 插件结构：core/（核心逻辑）+ services/（服务层）+ public/（UI）+ index.ts（入口）+ openclaw.plugin.json
- 减少跨目录引用，路径更清晰
- openclaw.json 的 plugins.load.paths 指定插件加载路径

## Verification
-

## Source
- project: 
- branch: 
- file: 
- url: 