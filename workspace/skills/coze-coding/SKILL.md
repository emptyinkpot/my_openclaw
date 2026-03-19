---
name: coze-coding
description: 打开扣子编程页面。当用户说"打开扣子"、"扣子编程"、"打开coze"时使用此技能。
metadata: { "openclaw": { "emoji": "🦾", "requires": { "bins": ["node"] } } }
---

# 扣子编程

## 执行命令

```bash
node {baseDir}/scripts/open-coze.js
```

## 操作流程

1. 先访问 `https://www.coze.cn` 设置登录状态
2. 再跳转到 `https://code.coze.cn/home`

## 说明

- 自动恢复登录状态
- 浏览器窗口保持打开
