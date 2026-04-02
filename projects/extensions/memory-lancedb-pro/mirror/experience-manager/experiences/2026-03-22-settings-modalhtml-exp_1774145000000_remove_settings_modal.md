---
id: "exp_1774145000000_remove_settings_modal"
title: "清理不再需要的 settings-modal.html 文件和路由"
type: "bug_fix"
date: "2026-03-22T02:03:20.000Z"
updated_at: "2026-03-25T05:42:23.000Z"
difficulty: 2
xp_gained: 100
tags: ["代码清理", "导航栏", "设置弹窗", "路由优化", "bug 修复"]
source_project: ""
source_file: ""
---
# 清理不再需要的 settings-modal.html 文件和路由

## Summary
既然 settings-modal 的完整内容已经硬编码到 nav-bar.html 中，删除单独的 settings-modal.html 文件和对应的路由，避免任何可能的访问导致旧导航栏重叠问题。

## Problem
经验里面的笔记栏点击之后会有旧的导航栏重叠，这个问题过往的经验里面有对应的解决方案，你去查看一下过往的经验，然后用那个方案修复这个问题

## Solution
## 完成的工作

### 1. 从 novel-manager 插件的 pageMap 中移除路由
- 删除 '/settings-modal.html': 'settings-modal.html' 映射
- 保留 nav-bar.html 和 nav-bar.js 路由

### 2. 删除单独的 settings-modal.html 文件
- 删除 extensions/public/settings-modal.html 文件
- 该文件内容已完全硬编码到 nav-bar.html 中

### 3. 确保完全避免 fetch 动态加载
- 所有页面现在都使用 nav-bar.html 中硬编码的设置弹窗
- 不再依赖任何网络请求或路由匹配来加载设置弹窗

## Applied
- 过往经验 exp_1774135313784
- 导航栏统一管理
- 代码清理优化

## Gained
- 完成硬编码后，应该及时清理不再需要的文件和路由
- 避免遗留代码导致潜在问题
- 保持项目结构简洁，减少维护成本

## Verification
-

## Source
- project: 
- branch: 
- file: 
- url: 