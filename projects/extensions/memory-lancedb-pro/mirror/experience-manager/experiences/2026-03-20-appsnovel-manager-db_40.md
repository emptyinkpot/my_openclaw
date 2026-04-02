---
id: "db_40"
title: "番茄扫描功能自包含重构：apps/novel-manager 核心模块化"
type: "refactoring"
date: "2026-03-20T02:43:21.000Z"
updated_at: "2026-03-25T05:42:25.000Z"
difficulty: 4
xp_gained: 200
tags: ["openclaw", "architecture", "refactoring", "self-contained", "playwright", "fanqie"]
source_project: ""
source_file: ""
---
# 番茄扫描功能自包含重构：apps/novel-manager 核心模块化

## Summary
将番茄扫描功能从 extensions/ 插件层移入 apps/novel-manager/core/pipeline/，实现核心业务逻辑自包含。extensions/ 只作为薄 API 层调用核心模块。

## Problem
apps/novel-manager 这个里面的要做到自包含，core/ContentPipeline.ts 和 core/pipeline 里面要有扫描的功能

## Solution
1. 创建 apps/novel-manager/core/pipeline/FanqieScanner.ts，使用 Playwright 扫描番茄作品列表
2. ContentPipeline 添加 scanFanqieWorks() 方法，调用 FanqieScanner
3. 简化 extensions/novel-manager/index.ts 的 FanqieScanService，改为调用 ContentPipeline
4. 删除多余的 apps/novel-manager/views/ 目录（未被任何代码引用）
5. 架构：用户浏览器 → extensions/(API层) → apps/novel-manager/dist/(核心逻辑)

## Applied
- 模块化设计
- 关注点分离
- 自包含原则

## Gained
- OpenClaw 架构分层：extensions/ = 插件层(API+静态文件)，apps/ = 核心业务模块(可独立运行)
- 扫描功能位置：apps/novel-manager/core/pipeline/FanqieScanner.ts
- UI 文件位置：extensions/novel-manager/public/*.html
- views 目录多余：apps/novel-manager/views/ 未被引用，实际使用 extensions/novel-manager/public/
- 调用链：前端 → extensions API → apps/novel-manager/dist 编译产物

## Verification
-

## Source
- project: 
- branch: 
- file: 
- url: 