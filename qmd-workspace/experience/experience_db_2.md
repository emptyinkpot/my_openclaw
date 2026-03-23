# ContentPipeline 自动检测番茄最新章节发布下一章

**ID**: db_2
**类型**: feature_dev
**难度**: 4/5
**经验值**: 200
**日期**: 2026-03-20

## 问题描述
发布流水线原本需要手动指定起始章节号，现在改为自动检测番茄最新章节，然后发布下一章。核心逻辑：1. 从番茄获取最新章节号 2. 从数据库获取 latestChapter + 1 的章节 3. 发布到番茄

## 解决方案
1. ContentPipeline.publishToFanqie 先调用 FanqiePublisher.getLatestChapter() 获取番茄最新章节
2. 从数据库查询 chapterNumber = latestChapter + 1 的章节
3. 如果没有下一章，返回没有待发布章节
4. 发布成功后更新本地章节状态

## 应用的经验
- Playwright 自动化
- 数据库查询
- 流水线编排

## 获得的经验
- 番茄发布器可以通过 FanqiePublisher.getLatestChapter() 获取已发布最新章节
- 发布流程应该是幂等的：先查询远程状态，再决定发布内容
- 流水线进度通过 ProgressManager.broadcastProgress() 推送到 SSE
- 发布日志保存在 /app/work/logs/bypass/dev.log

## 标签
`fanqie` `pipeline` `publish` `automation` `playwright`

---
*从经验管理模块同步*
