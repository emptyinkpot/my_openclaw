# 统一导航栏架构：插件化页面路由

**ID**: db_34
**类型**: feature_dev
**难度**: 4/5
**经验值**: 200
**日期**: 2026-03-20

## 问题描述
所有页面（原生界面、小说管理、自动化、经验、缓存）通过插件注册路由，统一导航栏样式和跳转逻辑。导航栏使用固定定位，当前页面高亮显示。

## 解决方案
1. 在插件入口 index.ts 注册所有页面路由：/、/novel/、/auto.html、/experience.html、/cache.html
2. 所有路由使用 auth: 'plugin' 模式（无需登录）
3. 每个页面 HTML 添加统一导航栏：<div class="nav-bar">...
4. 当前页面链接添加 class="on" 实现高亮
5. 导航项使用 href 跳转，不使用 JavaScript

## 应用的经验
- OpenClaw 插件架构
- 前端组件化
- 路由统一管理

## 获得的经验
- OpenClaw 页面路由通过插件注册，不是静态文件服务
- auth: 'plugin' 表示无需认证，auth: 'token' 需要 Bearer Token
- 导航栏固定定位：position:fixed; top:0; z-index:9999
- 页面内容需要 margin-top:40px 避开导航栏
- 当前页面高亮使用特定 class（如 .on），CSS 定义样式

## 标签
`openclaw` `plugin` `navigation` `ui` `architecture`

---
*从经验管理模块同步*
