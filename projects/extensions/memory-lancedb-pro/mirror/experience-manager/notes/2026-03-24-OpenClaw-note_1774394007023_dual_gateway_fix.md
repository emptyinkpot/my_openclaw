---
id: "note_1774394007023_dual_gateway_fix"
title: "OpenClaw 双网关问题专题"
category: "debug"
created_at: "2026-03-24T15:13:27.000Z"
updated_at: "2026-03-24T15:13:27.000Z"
tags: ["OpenClaw", "gateway", "scheduled-task", "launcher", "stability"]
related_experience_ids: ["exp_1774394007023_dual_gateway_fix"]
---
# OpenClaw 双网关问题专题

## Summary
把旧计划任务降级为无害 stub，统一桌面启动器为唯一真实入口，避免双网关与锁冲突。

## Content
# OpenClaw 双网关问题专题

## 设计原则

- 只保留一个真实启动入口。
- 旧计划任务如果无法立即删除，就把它降级成无害兼容壳。
- 入口的唯一职责是拉起一个健康网关，不做重复监督。

## 架构图

- 旧路径：Windows 计划任务 -> C:\Users\ASUS-KL\.openclaw\gateway.cmd -> 旧网关。
- 新路径：桌面快捷方式 -> start-openclaw.bat -> openclaw-gateway-run.ps1 -> openclaw gateway run。
- 处理策略：把旧的 gateway.cmd 变成 no-op stub，保留任务但阻断重复起网关。

## 验证清单

- schtasks /Query 确认旧任务仍在，但不会再起第二份网关。
- Get-NetTCPConnection 只看到一个 127.0.0.1:5000 监听。
- 经验中心和 UI 都从同一个网关拿数据。
- 重新登录不会再出现锁冲突或 gateway already running 的重复报错。

## Sections

### designPrinciples
[
  "只保留一个真实启动入口",
  "旧任务无法删除时先降级为无害壳",
  "入口只负责拉起一个健康网关"
]

### architecture
[
  "计划任务 -> gateway.cmd stub",
  "桌面快捷方式 -> start-openclaw.bat -> gateway-run",
  "单一 127.0.0.1:5000 监听"
]

### verification
[
  "schtasks 仍可见，但不再起第二份网关",
  "仅一个监听进程",
  "UI 和经验模块从同一网关取数"
]