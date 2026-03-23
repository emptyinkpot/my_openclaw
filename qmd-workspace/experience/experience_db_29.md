# 在OpenClaw原生界面添加经验积累入口

**ID**: db_29
**类型**: problem_solving
**难度**: 3/5
**经验值**: 150
**日期**: 2026-03-20

## 问题描述
用户要求将经验积累入口放在OpenClaw原生界面的自动化模组旁边。通过修改/usr/lib/node_modules/openclaw/dist/control-ui/index.html，在导航栏添加了经验积累按钮，并创建了独立的experience.html页面。

## 解决方案
1. 找到OpenClaw原生界面文件：/usr/lib/node_modules/openclaw/dist/control-ui/index.html
2. 在导航栏添加经验积累按钮，位于自动化模组和原生界面之间
3. 创建experience.html独立页面，包含等级系统、经验列表、添加功能
4. 更新路由指向新的页面

## 应用的经验
- 文件定位
- HTML/CSS布局
- iframe嵌入

## 获得的经验
- OpenClaw界面定制
- 多页面应用结构
- 独立功能模块设计

## 标签
`openclaw` `ui` `dashboard`

---
*从经验管理模块同步*
