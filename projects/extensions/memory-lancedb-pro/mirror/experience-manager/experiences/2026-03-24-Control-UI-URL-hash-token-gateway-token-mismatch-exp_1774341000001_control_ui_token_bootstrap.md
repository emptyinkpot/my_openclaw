---
id: "exp_1774341000001_control_ui_token_bootstrap"
title: "Control UI 登录态修复：用 URL hash 预热 token，解决 gateway token mismatch"
type: "bug_fix"
date: "2026-03-24T08:04:24.671Z"
updated_at: "2026-03-25T05:42:23.000Z"
difficulty: 5
xp_gained: 260
tags: ["OpenClaw", "Control UI", "token", "sessionStorage", "登录调试", "gateway token mismatch"]
source_project: ""
source_file: ""
---
# Control UI 登录态修复：用 URL hash 预热 token，解决 gateway token mismatch

## Summary
控制 UI 主页已经切到正确的 `control-ui-custom`，但仍频繁停在登录页并提示 `unauthorized: gateway token mismatch`。根因不是插件没加载，而是 token 在 `launch.html -> index.html -> chat` 的跳转链路里丢失，前端读取的 sessionStorage key 与启动器写入的 key 不一致。

## Problem
主页是对了，但是还没登录进去；为什么总是 gateway token mismatch？

## Solution
1. 启动器不再把 token 放在 query 中，而是打开 `control-ui-custom/launch.html#token=<token>&gatewayUrl=ws://127.0.0.1:5000`，用 hash 传递登录态。\n2. `launch.html` 在跳转到 `index.html` 前，先把 token 写入 `localStorage`、`sessionStorage`、`window.name` 和 `openclaw.control.settings.v1`，并覆盖根路径、control-ui 路径、当前页面路径三类 token key。\n3. `index.html` 在应用 bundle 加载前再次执行同样的 bootstrap，作为二次兜底；同时补一个 `Storage.getItem` fallback，当 UI 读取 `openclaw.control.token.v1:*` 失败时回退到 bootstrap token。\n4. 跳转时保留 hash，确保 token 不会在 `launch.html -> index.html -> chat?session=main` 的路由切换中丢失。

## Applied
- 浏览器存储调试
- OpenClaw Control UI 启动链路排查
- 会话令牌一致性修复

## Gained
- OpenClaw Control UI 的登录态不只依赖一个 token 字段，而是依赖 gatewayUrl 派生出的多组 sessionStorage key。
- query 参数在多段前端路由里更容易丢失，hash 作为启动桥更稳。
- 只改 launch 页不够，index 页在 bundle 加载前做二次 bootstrap 才能稳住登录态。
- 遇到 token mismatch 时，要同时检查页面最终 URL、gatewayUrl、sessionStorage key 和 window.name。

## Verification
-

## Source
- project: 
- branch: 
- file: 
- url: 