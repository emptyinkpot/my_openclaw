---
id: "db_61"
title: "OpenClaw control-ui框架集成"
type: "optimization"
date: "2026-03-20T05:35:26.000Z"
updated_at: "2026-03-25T05:42:24.000Z"
difficulty: 3
xp_gained: 150
tags: ["OpenClaw", "control-ui", "路由配置", "框架集成", "降级策略"]
source_project: ""
source_file: ""
---
# OpenClaw control-ui框架集成

## Summary
修改路由配置，让所有页面都嵌入到OpenClaw原生的control-ui框架中

## Problem
OpenClaw control-ui让所有页面都嵌入到原生界面的框架里

## Solution
1. 分析发现/usr/lib/node_modules/openclaw/dist/control-ui/目录已有完整框架；2. 修改novel-manager插件的getPageHtml函数；3. 建立页面映射：/→index.html, /novel/→novel-home.html等；4. 添加降级机制，control-ui读取失败时使用插件页面；5. 重启服务使配置生效

## Applied
- 路由配置
- 框架集成
- 降级策略

## Gained
- OpenClaw插件架构
- control-ui框架使用
- 路由映射设计
- 降级机制实现

## Verification
-

## Source
- project: 
- branch: 
- file: 
- url: 