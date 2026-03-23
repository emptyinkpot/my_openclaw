# 经验数据源迁移：从数据库到 JSON 文件

**ID**: db_25
**类型**: feature_dev
**难度**: 3/5
**经验值**: 150
**日期**: 2026-03-20

## 问题描述
经验记录原本存储在 MySQL 数据库，现在迁移到 experience-manager 插件的 JSON 文件。NovelService.getExperienceRecords() 先尝试读数据库，失败后读取 JSON 文件。

## 解决方案
1. 经验数据存储在 extensions/experience-manager/data/experiences.json
2. NovelService.getExperienceRecords() 先尝试从数据库读取
3. 数据库无数据或出错时，读取 JSON 文件
4. 使用 fs.existsSync() 检查文件是否存在

## 应用的经验
- 数据源切换
- JSON 文件存储
- 降级策略

## 获得的经验
- JSON 文件适合小规模数据存储，无需数据库连接
- 降级策略：先尝试主数据源，失败后使用备用数据源
- 文件路径使用绝对路径避免相对路径问题
- JSON.parse() 后直接访问 .records 字段

## 标签
`data-migration` `json` `experience` `fallback`

---
*从经验管理模块同步*
