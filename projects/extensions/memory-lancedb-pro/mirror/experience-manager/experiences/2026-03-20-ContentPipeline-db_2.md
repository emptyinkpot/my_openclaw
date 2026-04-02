---
id: "db_2"
title: "ContentPipeline 自动检测番茄最新章节发布下一章"
type: "feature_dev"
date: "2026-03-20T02:41:27.000Z"
updated_at: "2026-03-25T05:42:28.000Z"
difficulty: 4
xp_gained: 200
tags: ["fanqie", "pipeline", "publish", "automation", "playwright"]
source_project: ""
source_file: ""
---
# ContentPipeline 自动检测番茄最新章节发布下一章

## Summary
发布流水线原本需要手动指定起始章节号，现在改为自动检测番茄最新章节，然后发布下一章。核心逻辑：1. 从番茄获取最新章节号 2. 从数据库获取 latestChapter + 1 的章节 3. 发布到番茄

## Problem
修复发布流程，先查番茄最新章节再发布下一章

## Solution
1. ContentPipeline.publishToFanqie 先调用 FanqiePublisher.getLatestChapter() 获取番茄最新章节
2. 从数据库查询 chapterNumber = latestChapter + 1 的章节
3. 如果没有下一章，返回没有待发布章节
4. 发布成功后更新本地章节状态

## Applied
- Playwright 自动化
- 数据库查询
- 流水线编排

## Gained
- 番茄发布器可以通过 FanqiePublisher.getLatestChapter() 获取已发布最新章节
- 发布流程应该是幂等的：先查询远程状态，再决定发布内容
- 流水线进度通过 ProgressManager.broadcastProgress() 推送到 SSE
- 发布日志保存在 /app/work/logs/bypass/dev.log

## Verification
-

## Source
- project: 
- branch: 
- file: 
- url: 