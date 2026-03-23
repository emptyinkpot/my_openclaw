# 番茄扫描功能集成：调用正确的扫描器

**ID**: db_35
**类型**: bug_fix
**难度**: 4/5
**经验值**: 200
**日期**: 2026-03-20

## 问题描述
NovelService.scanFanqieWorks() 原本返回模拟数据，未调用真实的 FanqieScanner。需要动态导入 FanqieScanner 并调用 scan() 方法。

## 解决方案
1. 动态导入 FanqieScanner：const { getFanqieScanner } = require('../core/pipeline/FanqieScanner')
2. 调用 scanner.scan({ accountId, headed: false })
3. 扫描结果保存到数据库时，将 account_1 转换为数字 1
4. 扫描失败时尝试读取缓存文件

## 应用的经验
- 动态导入
- Playwright 扫描
- 缓存机制

## 获得的经验
- FanqieScanner 使用 Playwright 扫描番茄作者后台
- 扫描结果自动缓存到 cache/fanqie-{accountId}-works.json
- 数据库 account_id 是 INT 类型，需要将 account_1 转换为 1
- 动态导入 require() 比 import 更灵活，避免编译时依赖

## 标签
`fanqie` `scanner` `playwright` `integration`

---
*从经验管理模块同步*
