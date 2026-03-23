# 清理 apps/novel-manager 多余文件和独立服务入口

**ID**: db_39
**类型**: refactoring
**难度**: 3/5
**经验值**: 150
**日期**: 2026-03-20

## 问题描述
apps/novel-manager/src/ 是独立服务的入口层，与 extensions/novel-manager 的功能重复。删除后只保留核心模块，由插件层调用编译产物。

## 解决方案
1. 删除 apps/novel-manager/src/ 目录（独立服务入口层）
2. 删除 apps/novel-manager/server.ts（独立服务启动脚本）
3. 重写 index.ts，直接导出 core/services/utils
4. 更新 tsconfig.json，移除 src 引用
5. 更新 package.json，简化 scripts
6. 清理 dist 目录后重新编译

## 应用的经验
- 模块化清理
- 消除重复代码

## 获得的经验
- apps/novel-manager 现在只保留核心模块（core/services/utils），不再有独立服务入口
- OpenClaw 架构：extensions/ 是插件层（API+UI），apps/ 是核心模块（被插件调用）
- 删除重复功能层，保持单一职责
- 编译产物位置：apps/novel-manager/dist/，被 extensions/novel-manager 导入

## 标签
`refactoring` `cleanup` `architecture` `openclaw`

---
*从经验管理模块同步*
