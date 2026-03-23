# 页面切换函数被重写问题

**ID**: exp_showSubPage_1742474000000
**类型**: bug_fix
**难度**: 2/5
**经验值**: 150
**日期**: 2025-03-20

## 问题描述
添加控制面板页面时，只修改了原始 showSubPage 函数，但代码库中有另一个地方重写了该函数，导致修改无效

## 解决方案
1. 用 grep 搜索整个代码库，发现有两个 showSubPage 函数；2. 在两个函数里都添加了 control-panel 的配置；3. 确保 pageIdMap、btnTextMap、isSubPageBtn、navPageMap 都更新了

## 应用的经验
- 代码搜索技巧
- 多位置修改检查

## 获得的经验
- 添加功能前先搜索代码库
- 检查函数是否被重写
- 完全照着现有功能抄

## 标签
`javascript` `function-override` `debug` `showSubPage`

---
*从经验管理模块同步*
