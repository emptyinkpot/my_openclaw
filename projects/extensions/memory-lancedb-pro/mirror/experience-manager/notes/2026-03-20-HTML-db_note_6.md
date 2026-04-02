---
id: "db_note_6"
title: "文件移动和路径更新 - HTML 文件统一管理"
category: "dev"
created_at: "2026-03-20T12:53:12.000Z"
updated_at: "2026-03-25T05:42:32.000Z"
tags: ["文件管理", "路径更新", "静态资源", "重构"]
related_experience_ids: []
---
# 文件移动和路径更新 - HTML 文件统一管理

## Summary
文件移动和路径更新 - HTML 文件统一管理

## Content
## 任务概述
将分散在各个插件目录下的 HTML 文件统一移动到 extensions/public/ 目录下，便于统一管理。

## 移动的文件
- index.html - 小说管理主页
- auto.html - 自动化页面
- experience.html - 经验积累中心
- cache.html - 缓存管理页面
- feishu.html - 飞书集成页面

## 源路径和目标路径
- 源路径: extensions/novel-manager/public/
- 目标路径: extensions/public/

## 修改的文件
- extensions/novel-manager/index.ts
  - getNovelHtml() 函数：从 path.join(__dirname, "public", "index.html") 改为 path.join(__dirname, "../public", "index.html")
  - getPageHtml() 函数：从 path.join(__dirname, "public", pageName) 改为 path.join(__dirname, "../public", pageName)

## 注意事项
1. HTML 文件中的链接都是绝对路径（如 /experience.html），无需修改
2. novel-manager/index.ts 和 experience-manager/index.ts 是 OpenClaw 插件入口文件，不能移动
3. OpenClaw 插件需要独立的目录结构和 openclaw.plugin.json 配置
4. extensions/public 目录专门用于存放静态 HTML 文件

## 验证
- 检查所有 HTML 文件链接是否正常工作
- 验证插件功能是否正常
- 确认 OpenClaw 能正常加载插件

## Sections
-