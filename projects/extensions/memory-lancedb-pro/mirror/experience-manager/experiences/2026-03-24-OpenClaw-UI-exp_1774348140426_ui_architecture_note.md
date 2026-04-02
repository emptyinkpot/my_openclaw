---
id: "exp_1774348140426_ui_architecture_note"
title: "OpenClaw UI 设计与架构专题"
type: "learning"
date: "2026-03-24T10:29:00.426Z"
updated_at: "2026-03-25T05:42:22.000Z"
difficulty: 4
xp_gained: 220
tags: ["OpenClaw", "UI design", "architecture", "launcher", "shared source of truth", "experience"]
source_project: ""
source_file: ""
---
# OpenClaw UI 设计与架构专题

## Summary
整理 OpenClaw UI 的共享导航、启动预热、入口分流和验证方法，形成可复用的经验专栏。

## Problem
把 OpenClaw UI 的设计原则、架构和验证方法整理成一篇可复用的专题。

## Solution
1. 启动器 -> gateway health -> launch.html 预热 token -> index.html -> openclaw-app。
2. 导航栏统一抽到 shared/nav-bar.html，避免多份页面各改各的。
3. UI 设计先保证主路径稳定，再谈视觉和装饰。
4. 验证优先看真实 DOM、真实路由和 customElements 注册结果。
5. 专题内容同步到 experiences.json，再同步到 memory-lancedb / experience-sync.jsonl。
6. 通过专题笔记沉淀可复用的 UI 设计方法。

## Applied
- UI 设计
- 共享导航
- token bootstrap
- 入口分流
- DOM 验证
- 经验沉淀

## Gained
- UI 设计不只是视觉，而是启动链路、入口分流和验证链路一起成立。
- 共享导航的关键是所有页面最终都读取同一份源，而不是看起来像统一。
- launch.html 与 index.html 的双重 bootstrap 可以稳住 token 与 gatewayUrl。
- 经验模块最适合沉淀设计原则、架构图和验证清单。
- 真实 DOM 与路由验证比源码肉眼检查更可靠。

## Verification
-

## Source
- project: 
- branch: 
- file: 
- url: 