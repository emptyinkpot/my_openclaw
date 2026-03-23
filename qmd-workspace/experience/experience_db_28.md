# OpenClaw 插件架构理解错误

**ID**: db_28
**类型**: problem_solving
**难度**: 4/5
**经验值**: 200
**日期**: 2026-03-20

## 问题描述
反复把功能加到 wrong 位置。小说管理模块在 apps/novel-manager 和 extensions/novel-manager 各有一份，但 OpenClaw 实际加载的是 extensions/novel-manager 插件版本。UI 上经验积累是一级模块，但后端 API 却在 novel-manager 插件里实现，导致混淆。

## 解决方案
1. 查看 openclaw.json 确认插件加载路径
2. 理解 OpenClaw 插件架构：插件注册在 extensions/，但由网关统一路由
3. 确认经验积累 API 实际在 novel-manager 插件 index.ts 中实现
4. 区分独立服务和插件的不同部署方式

## 应用的经验
- 架构分析
- 配置文件阅读

## 获得的经验
- OpenClaw 插件系统
- 微前端架构
- 网关路由机制

## 标签
`openclaw` `plugin` `architecture` `micro-frontend`

---
*从经验管理模块同步*
