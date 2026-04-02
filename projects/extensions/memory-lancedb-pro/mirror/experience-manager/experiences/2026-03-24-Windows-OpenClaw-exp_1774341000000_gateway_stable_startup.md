---
id: "exp_1774341000000_gateway_stable_startup"
title: "Windows 本地 OpenClaw 启动稳定化：复用健康网关并绕开失效服务态"
type: "problem_solving"
date: "2026-03-24T08:04:24.672Z"
updated_at: "2026-03-25T05:42:22.000Z"
difficulty: 4
xp_gained: 220
tags: ["OpenClaw", "Gateway", "Windows", "启动调试", "健康检查", "control-ui-custom"]
source_project: ""
source_file: ""
---
# Windows 本地 OpenClaw 启动稳定化：复用健康网关并绕开失效服务态

## Summary
在 Windows 本地环境中，OpenClaw 主 UI 时好时坏，常见现象包括快捷方式打开后卡在登录页、5000 端口未真正可用、旧的 Gateway 计划任务与新进程互相干扰。通过梳理启动链路，最终将入口统一为先检查网关健康，再按需拉起前台 gateway 进程，并明确不再依赖陈旧的服务态。

## Problem
为什么之前成功过一次，之后又变成 TCP connect failed、卡登录页、像是没开网关？

## Solution
1. 用 `openclaw gateway status --require-rpc --timeout 3000 --url ws://127.0.0.1:5000 --token <token>` 作为唯一健康判据，而不是只看端口是否监听。\n2. 启动器先复用健康网关；如果不健康，则执行 `openclaw gateway stop` 清理残留态，然后从新进程启动 `openclaw gateway run --port 5000 --force --token <token>`。\n3. 避免把 `~/.openclaw/gateway.cmd` 对应的旧计划任务当作主启动路径；它容易留下 stale state，导致 lock timeout、already running、token mismatch 这类假状态。\n4. 启动脚本只做三件事：装载本地配置、等待 RPC probe 成功、打开控制 UI。这样冷启动和重复启动都稳定。

## Applied
- Windows 进程与端口排查
- OpenClaw Gateway 健康检查
- 启动链路最小化

## Gained
- 判断 OpenClaw 网关是否可用，应该以 RPC probe 成功为准，而不是只看 5000 端口是否被监听。
- 旧的计划任务或 gateway.cmd 兼容入口容易留下脏状态，正常启动链路应尽量绕开。
- 稳定的 Windows 启动器应该只负责复用健康网关或拉起新网关，不要混入多套 service/uninstall 逻辑。
- 启动问题和 control-ui-custom 本身无关时，先把网关健康与 token 一致性确认清楚。

## Verification
-

## Source
- project: 
- branch: 
- file: 
- url: 