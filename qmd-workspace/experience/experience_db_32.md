# MySQL 字符集不兼容导致数据插入失败

**ID**: db_32
**类型**: bug_fix
**难度**: 3/5
**经验值**: 150
**日期**: 2026-03-20

## 问题描述
番茄扫描结果保存到数据库时报错：`Conversion from collation utf8mb4_unicode_ci into latin1_swedish_ci impossible`。原因是表创建时未显式指定字符集，导致使用默认的 latin1 字符集，无法存储中文。

## 解决方案
1. 删除旧表：DROP TABLE IF EXISTS fanqie_works
2. 创建新表时显式指定字符集：DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
3. 每个文本字段也要指定字符集：VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci

## 应用的经验
- 数据库字符集配置
- MySQL 表创建规范

## 获得的经验
- MySQL 默认字符集是 latin1，无法存储中文
- 创建表时必须显式指定 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
- 字符串字段也需单独指定字符集，避免继承表级默认值
- 错误信息 'Conversion from collation' 表示字符集不兼容

## 标签
`mysql` `charset` `utf8mb4` `bug` `database`

---
*从经验管理模块同步*
