---
id: "exp_1774352200000_runtime_project_local"
title: "OpenClaw 运行态收口到项目目录：project-local .local + 显示/运行分离"
type: "architecture"
date: "2026-03-24T11:36:40.000Z"
updated_at: "2026-03-25T05:42:29.000Z"
difficulty: 4
xp_gained: 220
tags: ["OpenClaw", "architecture", "runtime", "ollama", "junction", "frontend", "debugging", "experience"]
source_project: ""
source_file: ""
---
# OpenClaw 运行态收口到项目目录：project-local .local + 显示/运行分离

## Summary
把 OpenClaw 的运行态、Ollama 模型仓库和本地 AI 相关状态整体收口到 E:/Auto/projects/.local 下，同时保留旧用户目录的 junction 兼容入口；UI 上展示原始数据库 hostname，但实际连接继续走稳定 IP。

## Problem
如何在不影响功能的情况下，把 OpenClaw / Ollama 迁到项目目录下，做到低耦合、自包含，并且让数据库配置在 UI 上显示原始 hostname 但运行时仍走 IP？

## Solution
1. 将 OpenClaw 运行态搬到 E:/Auto/projects/.local/openclaw，Ollama 模型仓库搬到 E:/Auto/projects/.local/ollama。
2. 用 junction 让 C:/Users/ASUS-KL/.openclaw、C:/Users/ASUS-KL/.ollama、E:/Auto/.local/openclaw、E:/Auto/.local/ollama 全部回指项目内真源。
3. 启动器优先读 projects/.local/openclaw，再回退旧路径，保证迁移后还能启动。
4. UI 层把数据库输入框恢复显示原始 hostname，但保持后台连接配置使用稳定 IP。
5. 重新执行 openclaw health 和端口检查，确认 gateway、Ollama 和页面都还能跑通。

## Applied
- 项目内单一真源
- junction 兼容迁移
- 显示/运行分离
- 启动器优先项目路径
- 健康检查验证

## Gained
- 运行态和模型仓库不应该继续分散在用户目录与项目目录之间，统一到项目内最容易维护。
- 旧路径最好只做 junction 兼容，不要再作为主路径来写新配置。
- 页面上展示原始 hostname 和实际连接 IP 可以同时成立，关键是把显示层和执行层分开。
- 迁移类改动必须用 health、端口监听、UI DOM 三类验证同时确认，避免只改配置没改链路。

## Verification
-

## Source
- project: 
- branch: 
- file: 
- url: 