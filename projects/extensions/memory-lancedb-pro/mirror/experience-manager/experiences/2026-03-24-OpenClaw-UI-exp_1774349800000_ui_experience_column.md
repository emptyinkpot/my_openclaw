---
id: "exp_1774349800000_ui_experience_column"
title: "OpenClaw UI 经验专栏：共享导航、入口分流与验证"
type: "learning"
date: "2026-03-24T10:56:40.000Z"
updated_at: "2026-03-25T05:42:29.000Z"
difficulty: 4
xp_gained: 220
tags: ["OpenClaw", "Control UI", "shared-nav", "file-manager", "launcher", "architecture", "debugging"]
source_project: ""
source_file: ""
---
# OpenClaw UI 经验专栏：共享导航、入口分流与验证

## Summary
把 OpenClaw UI 的共享导航、文件管理入口、原生界面入口和验证方法整理成可复用的经验专栏。

## Problem
把导航栏统一、入口分流和验证思路整理成一篇经验专栏，并写清楚架构和验证清单。

## Solution
1. 将导航统一到 `/shared/nav-bar.html`，避免各页面各改各的。
2. 把入口拆清楚：文件管理 -> `/file-manager`，原生界面 -> `/control-ui-custom/launch.html`，主 UI -> `/control-ui-custom/index.html`。
3. 保留 `launch.html` 和 `index.html` 双重 bootstrap，确保 token / gatewayUrl 不丢。
4. 用 `nav-bar-behavior.js` 做共享导航注入与 active 状态修正。
5. 用真实页面与 RPC probe 验证，而不是只看源码。

## Applied
- 共享导航统一
- 入口分流
- token bootstrap
- 文件管理路由
- 实际 DOM 验证

## Gained
- 导航栏统一管理的关键不是文件放在一起，而是所有页面最终读取同一份共享来源。
- 原生界面和文件管理必须分路由：一个回启动页，一个回独立文件管理页，不能都落到根路径。
- 静态页面最容易被缓存和旧副本误导，必须同时检查 served 资源、bundle 和真实 DOM。
- 双重 bootstrap 可以显著降低 token 在跳转链路中丢失的概率。
- 经验模块最适合记录设计原则 + 验证清单，方便下次直接复用。

## Verification
-

## Source
- project: 
- branch: 
- file: 
- url: 