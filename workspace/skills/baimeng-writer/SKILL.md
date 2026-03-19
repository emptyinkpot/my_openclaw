---
name: baimeng-writer
description: 白梦写作网自动化操作。当用户说"白梦"、"白梦作品"、"查看白梦"时使用此技能。
metadata: { "openclaw": { "emoji": "📝", "requires": { "bins": ["node"] } } }
---

# 白梦写作网自动化

## 执行命令

### 查看作品列表
```bash
node {baseDir}/scripts/controller.js list
```

### 进入作品
```bash
node {baseDir}/scripts/controller.js enter 2
```

### 检查登录状态
```bash
node {baseDir}/scripts/controller.js check
```

## 说明

- 使用统一的 lib 模块
- 自动恢复登录状态
- 返回 JSON 格式结果
