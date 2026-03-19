---
name: novel-status
description: 查询小说更新和发布状态。当用户说"查询更新"、"更新状态"、"status"、"今日发布"、"可发布章节"时使用此技能。
metadata: { "openclaw": { "emoji": "📚", "requires": { "bins": ["node"] } } }
---

# 小说更新状态查询

查询白梦和番茄作品的更新、发布状态。

## 用法

用户可以通过飞书发送以下命令查询：

- "查询更新" / "更新状态" / "status" - 查看所有作品的整体状态（白梦+番茄）
- "查询 {作品名}" - 查看指定作品的章节详情
- "今日操作" - 查看今日操作记录
- "可发布章节" - 查看待发布的章节

## 执行命令

### 查询整体状态（包含白梦+番茄）
```bash
node {baseDir}/index.js status
```

### 查询作品详情
```bash
node {baseDir}/index.js detail "作品名"
```

### 查询今日操作
```bash
node {baseDir}/index.js today
```

### 查询可发布章节
```bash
node {baseDir}/index.js pending
```
