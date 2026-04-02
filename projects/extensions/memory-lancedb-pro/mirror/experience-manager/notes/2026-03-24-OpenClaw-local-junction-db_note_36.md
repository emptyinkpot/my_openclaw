---
id: "db_note_36"
title: "OpenClaw 运行态收口到项目目录：.local 真源、junction 兼容和显示/运行分离"
category: "dev"
created_at: "2026-03-24T13:40:00.000Z"
updated_at: "2026-03-25T05:42:32.000Z"
tags: ["OpenClaw", "architecture", "runtime", "ollama", "junction", "self-contained", "frontend"]
related_experience_ids: []
---
# OpenClaw 运行态收口到项目目录：.local 真源、junction 兼容和显示/运行分离

## Summary
OpenClaw 运行态收口到项目目录：.local 真源、junction 兼容和显示/运行分离

## Content
# OpenClaw 运行态收口到项目目录：.local 真源、junction 兼容和显示/运行分离

## 目标

把 OpenClaw 的运行态、Ollama 模型仓库和本地 AI 相关状态都收口到项目目录下，减少对用户目录的直接依赖，同时保留旧路径兼容，避免改完功能回退。

## 这次的落点

- 真源目录：`E:/Auto/projects/.local/openclaw`
- Ollama 模型仓库：`E:/Auto/projects/.local/ollama`
- 兼容入口：
  - `C:/Users/ASUS-KL/.openclaw` -> `E:/Auto/projects/.local/openclaw`
  - `C:/Users/ASUS-KL/.ollama` -> `E:/Auto/projects/.local/ollama`
  - `E:/Auto/.local/openclaw` -> `E:/Auto/projects/.local/openclaw`
  - `E:/Auto/.local/ollama` -> `E:/Auto/projects/.local/ollama`

## 架构原则

1. **项目内单一真源**：实际运行态和模型数据都放进项目目录，避免用户目录和项目目录双份状态互相打架。
2. **旧路径只做兼容**：`junction` 只负责兼容老入口，不再作为长期维护目标。
3. **UI 显示与运行连接分离**：数据库地址在页面上展示原始 hostname，但运行时继续走稳定的 IP。
4. **启动器优先项目内路径**：`start-openclaw.bat` 先找 `projects/.local/openclaw`，再回退到旧路径。

## 验证清单

- `Get-Item` 检查四个 junction 的目标是否都指向项目目录。
- `openclaw health` 能正常通过，且不再因为路径或插件发现失败。
- `Get-NetTCPConnection -LocalPort 5000,11434` 能看到 gateway 与 Ollama 都在监听。
- UI 中数据库输入框显示的是原始 hostname，但后端连接仍然稳定走 IP。

## 经验结论

当项目开始同时维护“代码”、“运行态”和“模型仓库”时，最稳的做法不是继续往用户目录堆，而是把可变状态整体收口到项目内，再用兼容链接托住旧入口。这样既能保持独立性，也能最大限度减少迁移带来的行为变化。

## Sections
-