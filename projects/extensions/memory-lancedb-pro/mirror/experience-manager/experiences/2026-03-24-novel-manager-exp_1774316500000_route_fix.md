---
id: "exp_1774316500000_route_fix"
title: "修复 novel-manager 插件加载失败和导航路由问题"
type: "problem_solving"
date: "2026-03-24T01:41:40.000Z"
updated_at: "2026-03-25T05:42:23.000Z"
difficulty: 3
xp_gained: 150
tags: ["OpenClaw", "插件加载", "路由问题", "Git 恢复", "问题排查"]
source_project: ""
source_file: ""
---
# 修复 novel-manager 插件加载失败和导航路由问题

## Summary
用户反馈在原生 Control UI 点击小说管理等导航链接无法跳转，跳转到外部域名拒绝连接。通过排查发现是 novel-manager 插件加载失败导致路由未注册，最终通过恢复 git 历史版本解决问题。

## Problem
在原生controlui页面点小说管理进去是380cdf5c-c0a6-420a-acbf-3b2e64d0d9cf.dev.coze.site 拒绝连接。你看看是不是路由的问题

## Solution
## 问题排查与修复过程

### 1. 问题现象
- 点击导航栏链接（小说管理、自动化等）跳转到外部域名，拒绝连接
- OpenClaw 状态显示 novel-manager 插件加载失败

### 2. 错误信息
```
[plugins] novel-manager failed to load from /workspace/projects/extensions/plugins/novel-manager/index.ts: Error: ParseError: Missing initializer in const declaration.
 /workspace/projects/extensions/plugins/novel-manager/index.ts:1154:29
```
随后错误变为 core/database/daily-plan/index.ts 的语法错误

### 3. 解决方案
- 查看 git log，找到最近能正常工作的提交：b7ccf5c9
- 将 extensions/plugins/novel-manager/ 恢复到该提交
- 将 extensions/core/database/ 也恢复到该提交
- 重启 OpenClaw Gateway 服务：./scripts/restart.sh
- 验证插件加载成功：[novel-manager] Plugin registered
- 验证路由正常：curl -I http://localhost:5000/novel/ 返回 HTTP/1.1 200 OK

### 4. 关键经验
- 插件加载失败会导致路由未注册，从而导航失效
- 遇到插件语法错误时，优先从 git 历史恢复能正常工作的版本
- 修改 TypeScript 插件代码后要立即验证插件是否加载成功
- openclaw status --all 是快速检查插件状态的好工具

## Applied
- OpenClaw 插件加载排查
- Git 历史恢复
- 路由验证

## Gained
- 插件加载失败会直接导致路由未注册，导航功能失效
- 遇到 TypeScript 语法错误时，优先从 git 历史恢复能正常工作的版本
- 修改插件代码后要立即用 openclaw status --all 验证插件是否加载成功
- curl -I 是快速验证 HTTP 路由是否正常的好方法
- ./scripts/restart.sh 是重启 OpenClaw 服务的可靠方式

## Verification
-

## Source
- project: 
- branch: 
- file: 
- url: 