---
name: sender-trigger
description: "特定发送者的消息触发任务（即时）"
metadata:
  {
    "openclaw":
      {
        "emoji": "🎯",
        "events": ["message:received"],
        "priority": 50
      }
  }
---

# Sender Trigger Hook

特定发送者的消息触发任务（即时）。

## 功能

- 只处理配置的特定发送者
- 收到消息后立刻执行，不等 AI 完成
- 支持每条消息都触发或关键词触发

## 配置方法

```javascript
// 编辑 index.js 中的 CONFIG.senderRules

senderRules: {
  'wxid_xxx': {                    // 发送者 ID
    name: '老板',                   // 显示名称
    triggers: {
      always: false,               // 是否每条消息都触发
      keywords: ['紧急', '重要'],   // 关键词触发
    },
    actions: ['sync-titles'],      // 要执行的任务
  },
}
```
