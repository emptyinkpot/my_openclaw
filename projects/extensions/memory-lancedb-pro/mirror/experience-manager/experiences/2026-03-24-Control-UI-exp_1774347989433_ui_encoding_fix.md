---
id: "exp_1774347989433_ui_encoding_fix"
title: "Control UI 乱码修复：导航栏与正文编码恢复"
type: "bug_fix"
date: "2026-03-24T10:26:29.433Z"
updated_at: "2026-03-25T05:42:22.000Z"
difficulty: 3
xp_gained: 180
tags: ["OpenClaw", "Control UI", "UI乱码", "cache busting", "static assets"]
source_project: ""
source_file: ""
---
# Control UI 乱码修复：导航栏与正文编码恢复

## Summary
Control UI 的中文按钮、导航栏和部分正文在 served 页面里出现乱码，最终需要同时检查真实 DOM、共享导航源和缓存版本号。

## Problem
为什么经验中心和 Control UI 里有些中文都变成乱码了？

## Solution
1. 先看真实 DOM 里的 navbar-container 和页面正文，不只看源码文件。
2. 让页面统一读取 /shared/nav-bar.html，避免本地副本和 shared 副本各写各的。
3. 同步更新 index.html 里的 bootstrap.js / nav-bar-behavior.js 版本号，强制浏览器重新拉取。
4. 只修最小字符级损坏，避免把 minified bundle 改坏。

## Applied
- 编码排查
- 共享导航同步
- 缓存刷新
- 真实 DOM 验证

## Gained
- 页面乱码不一定是源码本身坏了，很多时候是 served 副本或缓存没更新。
- 共享导航要同步到实际读取的页面路径，不能只改一份文件。
- 字符级修复后要立刻做缓存刷新，否则浏览器还是会显示旧内容。
- 验证 UI 文案时，浏览器里看到的 DOM 比文件内容更重要。

## Verification
-

## Source
- project: 
- branch: 
- file: 
- url: 