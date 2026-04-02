---
id: "db_note_2"
title: "OpenClaw 项目核心文件清单（不要随意删改）"
category: "dev"
created_at: "2026-03-20T12:09:30.000Z"
updated_at: "2026-03-25T05:42:32.000Z"
tags: ["OpenClaw", "项目结构", "核心文件", "文件管理"]
related_experience_ids: []
---
# OpenClaw 项目核心文件清单（不要随意删改）

## Summary
OpenClaw 项目核心文件清单（不要随意删改）

## Content
# 🏗️ OpenClaw 项目底层核心文件（不能随意修改删除）

## 1️⃣ OpenClaw 核心配置文件

| 文件/目录 | 作用 | 是否可删改 |
|----------|------|-----------|
| `openclaw.json` | OpenClaw 主配置文件 | ❌ **绝对不能删**，改之前要备份 |
| `.coze` | 沙箱环境配置 | ❌ **不能删改** |
| `agents/` | Agent 配置 | ⚠️ 谨慎修改 |
| `hooks-pack/` | OpenClaw Hooks 包 | ❌ **不能删** |
| `lib/` | OpenClaw 核心库 | ❌ **绝对不能删** |
| `node_modules/` | Node.js 依赖 | ❌ **不能删**（删了要重新 `pnpm install`） |

## 2️⃣ 项目构建和依赖文件

| 文件/目录 | 作用 | 是否可删改 |
|----------|------|-----------|
| `package.json` | 根项目配置 | ⚠️ 谨慎修改（依赖配置） |
| `pnpm-lock.yaml` | 根锁文件 | ❌ **不能删**，提交 Git |
| `pnpm-workspace.yaml` | pnpm 工作区配置 | ❌ **不能删** |
| `tsconfig.base.json` | TypeScript 基础配置 | ⚠️ 谨慎修改 |

## 3️⃣ 版本控制文件

| 文件/目录 | 作用 | 是否可删改 |
|----------|------|-----------|
| `.git/` | Git 仓库 | ❌ **绝对不能删**（删了就没版本历史了） |

## 4️⃣ 脚本目录

| 文件/目录 | 作用 | 是否可删改 |
|----------|------|-----------|
| `scripts/` | 项目启动/重启/停止脚本 | ❌ **不能删**（这些是你之前用的 `./scripts/start.sh` 等） |

# 📦 数据和运行时目录（可以清理但不能删）

| 目录 | 作用 | 是否可删改 |
|------|------|-----------|
| `workspace/` | 运行时数据（截图、缓存） | ✅ 可以清理内容，但不要删目录 |
| `logs/` | 日志文件 | ✅ 可以清理 |
| `storage/` | 数据存储 | ⚠️ 谨慎清理（可能有重要数据） |
| `backups/` | 备份文件 | ✅ 可以清理旧备份 |

# 🎨 插件和扩展（可以按需修改）

| 目录 | 作用 | 是否可删改 |
|------|------|-----------|
| `extensions/` | OpenClaw 插件 | ✅ 可以修改你自己的插件（如 `novel-manager`） |
| `packages/` | 共享包 | ⚠️ 取决于具体包 |
| `auto-scripts/` | 自动脚本 | ✅ 可以修改 |
| `utils/` | 工具脚本 | ✅ 可以修改 |

# ⚠️ 临时和测试文件（可以删除）

| 文件 | 说明 |
|------|------|
| `test-*.js` / `test-*.ts` | 测试文件 |
| `run-*.js` / `run-*.ts` | 临时运行脚本 |
| `check-work-7.js` | 临时检查脚本 |
| `openclaw.json.bak*` | 配置备份（如果确认没问题可以删旧的） |

# 📋 总结：绝对不能动的文件

```
❌ 绝对不能删除：
├── .git/
├── .coze
├── openclaw.json
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── lib/
├── hooks-pack/
├── node_modules/
└── scripts/

⚠️ 谨慎修改：
├── agents/
├── packages/
└── extensions/ 里的非自己开发的插件

✅ 可以清理：
├── workspace/ （内容，不要删目录）
├── logs/
├── backups/
└── 临时测试文件
```

## Sections
-