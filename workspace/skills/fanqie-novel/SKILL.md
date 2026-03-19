---
name: fanqie-novel
description: 查询番茄小说作品列表。当用户说"番茄"、"番茄小说"、"fanqie"、"番茄作品"时使用此技能。
metadata: { "openclaw": { "emoji": "🍅", "requires": { "bins": ["node"] } } }
---

# 番茄小说作品查询

## 执行命令

```bash
node {baseDir}/scripts/get-works.js
```

## 说明

- 使用统一的 lib 模块
- 自动恢复登录状态
- 返回 JSON 格式作品列表
