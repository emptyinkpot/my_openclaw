---
id: "db_note_4"
title: "OpenClaw 原生界面与目录结构"
category: "dev"
created_at: "2026-03-20T12:36:01.000Z"
updated_at: "2026-03-25T05:42:32.000Z"
tags: ["OpenClaw", "原生界面", "目录结构", "control-ui"]
related_experience_ids: []
---
# OpenClaw 原生界面与目录结构

## Summary
OpenClaw 原生界面与目录结构

## Content
# OpenClaw 原生界面与目录结构

## 📍 两个重要目录

### 1. 项目根目录
```
/workspace/projects/
```
- 这是你的项目文件目录
- 包含：extensions/、openclaw.json、workspace/ 等
- 你可以在这里修改你的插件和项目文件

### 2. OpenClaw 系统目录
```
/usr/lib/node_modules/openclaw/
```
- 这是 OpenClaw 安装的系统目录
- 包含：control-ui/、core/、cli/ 等
- 这是系统目录，修改后可能会在 OpenClaw 更新时被覆盖

## 🎨 原生界面位置

### control-ui 目录
```
/usr/lib/node_modules/openclaw/dist/control-ui/
```
- 这是 OpenClaw 原生 Control UI 的目录
- 包含：index.html、auto.html、experience.html、feishu.html 等
- 这里的文件是 OpenClaw 原生界面的文件

## ⚠️ 修改原生界面的注意事项

### 方式 1：直接修改系统目录（不推荐）
- 可以直接修改 `/usr/lib/node_modules/openclaw/dist/control-ui/` 下的文件
- ❌ 问题：OpenClaw 更新时，这些文件会被覆盖
- ✅ 优点：快速直接

### 方式 2：通过插件覆盖（推荐）
- 在 `extensions/novel-manager/index.ts` 里修改 `getPageHtml` 函数
- 让它返回你自定义的 HTML，而不是系统的
- ✅ 优点：不会被 OpenClaw 更新覆盖，更规范

## 📝 如何判断你之前修改过原生界面

看 `/usr/lib/node_modules/openclaw/dist/control-ui/` 目录下有没有 `.bak` 备份文件：
- `auto.html.bak`、`auto.html.bak2` ...
- `cache.html.bak`、`cache.html.bak2` ...
- `experience.html.bak`、`experience.html.bak2` ...
- 如果有，说明你之前确实修改过原生界面！

---
**最后更新**：2026-03-20

## Sections
-