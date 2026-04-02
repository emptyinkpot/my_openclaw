---
id: "db_note_7"
title: "OpenClaw 插件系统完全指南"
category: "dev"
created_at: "2026-03-20T12:53:40.000Z"
updated_at: "2026-03-25T05:42:32.000Z"
tags: ["OpenClaw", "插件系统", "架构设计", "开发指南"]
related_experience_ids: []
---
# OpenClaw 插件系统完全指南

## Summary
OpenClaw 插件系统完全指南

## Content
## 什么是 OpenClaw 插件
OpenClaw 插件是扩展 OpenClaw 功能的模块化组件，每个插件独立运行，通过注册机制与 OpenClaw 主程序交互。

## OpenClaw 插件注册步骤（3步）

1. 准备插件目录结构
2. 编写 openclaw.plugin.json
3. 编写入口文件 index.ts

## 为什么要注册插件

1. 标识身份 - 告诉 OpenClaw 这是个插件
2. 注册 HTTP 路由 - 提供页面和 API 访问
3. 生命周期管理 - register() 初始化，activate() 启动

## 插件文件关联关系

- openclaw.plugin.json - 插件元数据（营业执照）
- index.ts - 插件入口（店长）
- src/, services/ - 功能实现（员工）
- public/ - 静态资源（菜单）

## 重要原则

- 插件入口文件（index.ts）不能移动
- 每个插件应该有独立的目录
- 插件之间应该低耦合
- 静态资源可以统一管理

## Sections
-