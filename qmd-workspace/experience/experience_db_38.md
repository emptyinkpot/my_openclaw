# 合并 apps 到 extensions：简化 OpenClaw 项目结构

**ID**: db_38
**类型**: refactoring
**难度**: 3/5
**经验值**: 150
**日期**: 2026-03-20

## 问题描述
将 apps/novel-manager 和 apps/experience-manager 合并到 extensions/，每个模块保持独立分离。删除 apps 目录，所有功能模块统一放在 extensions/ 下。

## 解决方案
1. 把 apps/novel-manager/core、services、utils、dist 移动到 extensions/novel-manager/
2. 把 apps/experience-manager 整体移动到 extensions/experience-manager/
3. 更新 extensions/novel-manager/index.ts 的引用路径（../../apps/novel-manager/dist → ./dist）
4. 合并 package.json 依赖
5. 为 experience-manager 添加 openclaw.plugin.json
6. 更新 openclaw.json 插件配置，添加 experience-manager 加载路径
7. 删除 apps/ 目录

## 应用的经验
- 项目结构简化
- OpenClaw 插件架构

## 获得的经验
- OpenClaw 插件完全可以包含完整功能，不需要强行分离 apps 和 extensions
- 每个插件独立分离：extensions/novel-manager、extensions/experience-manager
- 插件结构：core/（核心逻辑）+ services/（服务层）+ public/（UI）+ index.ts（入口）+ openclaw.plugin.json
- 减少跨目录引用，路径更清晰
- openclaw.json 的 plugins.load.paths 指定插件加载路径

## 标签
`refactoring` `architecture` `openclaw` `plugin` `directory-structure`

---
*从经验管理模块同步*
