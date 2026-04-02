---
id: "db_note_10"
title: "OpenClaw 完整流程详解 - 从访问到显示"
category: "dev"
created_at: "2026-03-20T13:05:41.000Z"
updated_at: "2026-03-25T05:42:31.000Z"
tags: ["OpenClaw", "完整流程", "前端后端", "路由原理"]
related_experience_ids: []
---
# OpenClaw 完整流程详解 - 从访问到显示

## Summary
OpenClaw 完整流程详解 - 从访问到显示

## Content
# OpenClaw 完整流程详解

用"参观公司"的比喻，完整讲解从访问到显示的全过程！

## 第一步：你来到公司大门
- 浏览器输入：http://localhost:5000
- 你来到"localhost 大街 5000 号"
- 大门是 Gateway（网关），门牌号 5000

## 第二步：Gateway（大门保安）检查
- Gateway 看 openclaw.json 配置
- 发现管理后台开门，位置在 /usr/lib/node_modules/openclaw/dist/control-ui

## 第三步：插件注册流程（启动时完成）

### 3.1 OpenClaw 扫描插件目录
- 看 openclaw.json 里的 plugins.load.paths
- 按地址找外包团队：extensions/apps/novel-manager 等

### 3.2 找到插件目录，读取营业执照
- 读取 openclaw.plugin.json
- 知道这是"小说数据管理"团队

### 3.3 加载插件入口文件 index.ts
- 找到外包联系人 index.ts
- 联系人登记负责的区域：
  - / → 公司首页
  - /novel → 小说管理页
  - /auto.html → 自动化页
  - /experience.html → 经验页
  - /api/novel/* → 所有小说 API

### 3.4 完成路由注册
- OpenClaw 把这些记录在"路由表"里

## 第四步：访问页面的完整流程

### 场景 1：访问 http://localhost:5000/novel/
1. 浏览器 → Gateway
2. Gateway 查路由表：/novel → novel-manager
3. Gateway 调用 handleNovelPage
4. handleNovelPage 看 pageMap：/novel → index.html
5. getPageHtml 读取 extensions/public/index.html
6. 返回 HTML（里面有导航栏！）
7. 你看到：小说管理界面！

### 场景 2：点击导航栏的"经验"
1. 你点击：<a href="/experience.html">
2. 浏览器 → /experience.html
3. Gateway 查路由表 → novel-manager
4. handleNovelPage 看 pageMap → experience.html
5. getPageHtml 读取 extensions/public/experience.html
6. 返回 HTML（也有导航栏！）
7. 你看到：经验积累中心！

### 场景 3：前端调用后端 API
1. 前端：fetch(/api/novel/notes)
2. 浏览器 → /api/novel/notes
3. Gateway 查路由表 → novel-manager
4. Gateway 调用 handleNovelApi
5. handleNovelApi 处理，调用 NovelService
6. 返回 JSON 数据
7. 前端显示笔记列表！

## 关键要点
1. Gateway 是大门 - 所有请求先到 Gateway
2. 插件注册路由 - 启动时就告诉 Gateway 管哪些 URL
3. 路由表匹配 - Gateway 查路由表找插件
4. 前端页面在 extensions/public/ - 有导航栏的 HTML 都在这
5. 前后端通过 API 通信 - 前端 fetch，后端返回 JSON

## 需要的文件
- openclaw.json - 公司总章程
- extensions/apps/novel-manager/openclaw.plugin.json - 插件执照
- extensions/apps/novel-manager/index.ts - 插件入口，注册路由
- extensions/public/*.html - 前端页面
- extensions/apps/novel-manager/services/*.ts - 后端业务逻辑

## Sections
-