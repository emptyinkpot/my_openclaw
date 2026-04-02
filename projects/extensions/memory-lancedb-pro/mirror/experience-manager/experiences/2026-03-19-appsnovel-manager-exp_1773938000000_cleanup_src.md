---
id: "exp_1773938000000_cleanup_src"
title: "清理 apps/novel-manager 多余文件和独立服务入口"
type: "refactoring"
date: "2026-03-19T16:33:20.000Z"
updated_at: "2026-03-25T05:42:28.000Z"
difficulty: 3
xp_gained: 150
tags: ["refactoring", "cleanup", "architecture", "openclaw"]
source_project: ""
source_file: ""
---
# 清理 apps/novel-manager 多余文件和独立服务入口

## Summary
apps/novel-manager/src/ 是独立服务的入口层，与 extensions/novel-manager 的功能重复。删除后只保留核心模块，由插件层调用编译产物。

## Problem
apps/novel-manager/src 这个用来干啥的，删除

## Solution
1. 删除 apps/novel-manager/src/ 目录（独立服务入口层）
2. 删除 apps/novel-manager/server.ts（独立服务启动脚本）
3. 重写 index.ts，直接导出 core/services/utils
4. 更新 tsconfig.json，移除 src 引用
5. 更新 package.json，简化 scripts
6. 清理 dist 目录后重新编译

## Applied
- 模块化清理
- 消除重复代码

## Gained
- apps/novel-manager 现在只保留核心模块（core/services/utils），不再有独立服务入口
- OpenClaw 架构：extensions/ 是插件层（API+UI），apps/ 是核心模块（被插件调用）
- 删除重复功能层，保持单一职责
- 编译产物位置：apps/novel-manager/dist/，被 extensions/novel-manager 导入

## Verification
-

## Source
- project: 
- branch: 
- file: 
- url: 