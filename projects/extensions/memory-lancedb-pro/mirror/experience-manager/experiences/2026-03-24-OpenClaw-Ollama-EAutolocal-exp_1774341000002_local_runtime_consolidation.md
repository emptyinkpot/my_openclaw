---
id: "exp_1774341000002_local_runtime_consolidation"
title: "本地运行态收口：将 OpenClaw 与 Ollama 统一到 E:\\Auto\\.local"
type: "optimization"
date: "2026-03-24T08:04:24.670Z"
updated_at: "2026-03-25T05:42:23.000Z"
difficulty: 4
xp_gained: 210
tags: ["OpenClaw", "Ollama", "本地模型", "路径迁移", "Windows", "配置统一"]
source_project: ""
source_file: ""
---
# 本地运行态收口：将 OpenClaw 与 Ollama 统一到 E:\Auto\.local

## Summary
用户机器上同时存在用户目录下的 `.openclaw`、`.ollama` 和仓库内的运行目录，导致配置路径、模型目录、工作区位置和插件路径容易分叉。为避免出现“有两个 OpenClaw”“模型到底从哪里读”的问题，最终把实际运行态统一收口到 `E:\Auto\.local`。

## Problem
把我本地的 OpenClaw 和 Ollama 模型都移动合并到这个文件夹下，保证只有一个 OpenClaw 和本地 AI 模型。

## Solution
1. 将实际 OpenClaw 运行目录迁移到 `E:/Auto/.local/openclaw`，将 Ollama 模型目录迁移到 `E:/Auto/.local/ollama`。\n2. 保留 `C:/Users/<user>/.openclaw` 与 `C:/Users/<user>/.ollama` 作为 junction，指向新的实际目录，兼容旧路径。\n3. 更新 `openclaw.json`：`agents.defaults.workspace` 指向 `E:/Auto/.local/openclaw/workspace`，`models.providers.ollama.baseUrl` 保持本地 `127.0.0.1:11434`，`gateway.controlUi.root` 指向 `E:/Auto/projects/control-ui-custom`，插件路径明确指向 `E:/Auto/projects/extensions/plugins/*`。\n4. 启动器优先从 `.local/openclaw/openclaw.json` 读配置，只在缺失时才回退到 `projects/openclaw.json`。这样主仓库、运行态和模型目录的职责边界稳定下来。

## Applied
- Windows 路径迁移
- 本地 AI 模型目录管理
- OpenClaw 配置归一化

## Gained
- OpenClaw 代码仓库和运行态应分离，但路径要通过单一配置入口收口。
- 保留用户目录 junction 可以兼容依赖旧路径的软件，同时避免磁盘上出现重复副本。
- 统一 `openclaw.json` 的 workspace、controlUi.root、plugin path 和 Ollama baseUrl 后，定位问题会简单很多。
- 涉及本地模型迁移时，先保证 Ollama 服务端口与模型 manifests/blobs 路径一致，再动上层 UI。

## Verification
-

## Source
- project: 
- branch: 
- file: 
- url: 