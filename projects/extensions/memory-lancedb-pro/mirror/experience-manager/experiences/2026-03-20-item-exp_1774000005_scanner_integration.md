---
id: "exp_1774000005_scanner_integration"
title: "番茄扫描功能集成：调用正确的扫描器"
type: "bug_fix"
date: "2026-03-20T09:46:40.005Z"
updated_at: "2026-03-25T05:42:24.000Z"
difficulty: 4
xp_gained: 200
tags: ["fanqie", "scanner", "playwright", "integration"]
source_project: ""
source_file: ""
---
# 番茄扫描功能集成：调用正确的扫描器

## Summary
NovelService.scanFanqieWorks() 原本返回模拟数据，未调用真实的 FanqieScanner。需要动态导入 FanqieScanner 并调用 scan() 方法。

## Problem
扫描不到作品，脚本是能用的

## Solution
1. 动态导入 FanqieScanner：const { getFanqieScanner } = require('../core/pipeline/FanqieScanner')
2. 调用 scanner.scan({ accountId, headed: false })
3. 扫描结果保存到数据库时，将 account_1 转换为数字 1
4. 扫描失败时尝试读取缓存文件

## Applied
- 动态导入
- Playwright 扫描
- 缓存机制

## Gained
- FanqieScanner 使用 Playwright 扫描番茄作者后台
- 扫描结果自动缓存到 cache/fanqie-{accountId}-works.json
- 数据库 account_id 是 INT 类型，需要将 account_1 转换为 1
- 动态导入 require() 比 import 更灵活，避免编译时依赖

## Verification
-

## Source
- project: 
- branch: 
- file: 
- url: 