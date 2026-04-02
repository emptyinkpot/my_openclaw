---
id: "exp_1774347225416_bundle_debug_method"
title: "Control UI 黑屏调试方法：先查 bundle 语法再查 customElements"
type: "learning"
date: "2026-03-24T10:13:45.416Z"
updated_at: "2026-03-25T05:42:22.000Z"
difficulty: 4
xp_gained: 240
tags: ["OpenClaw", "Control UI", "black screen", "debugging", "bundle", "syntax"]
source_project: ""
source_file: ""
---
# Control UI 黑屏调试方法：先查 bundle 语法再查 customElements

## Summary
OpenClaw Control UI 之前一度黑屏，根因在 minified bundle 语法损坏，不是缺页面文件。

## Problem
Control UI 黑屏的时候，应该先查什么，为什么有时候页面连主组件都起不来？

## Solution
1. 先检查 token 与启动链路，再检查 bundle 是否还能解析。
2. 用 customElements.get('openclaw-app') 判断主组件是否真正注册成功。
3. launch.html 和 index.html 都要参与 bootstrap，避免路由切换把登录态丢掉。
4. 任何 dist 副本改动都要同步验证，不能只改源文件。
5. 对 minified JS 的修复要尽量最小化，并及时做 parser 校验。

## Applied
- bundle 调试
- 语法检查
- customElements 验证
- dist 同步
- token bootstrap

## Gained
- 黑屏问题经常不是页面缺失，而是 bundle 解析阶段就失败了。
- 主组件是否真正起来，customElements.get('openclaw-app') 是很直接的判拣。
- launch.html 与 index.html 需要双重 bootstrap，才能把 token 稳住。
- 修改 minified bundle 必须做 parser 校验，不能考眼勇。

## Verification
-

## Source
- project: 
- branch: 
- file: 
- url: 