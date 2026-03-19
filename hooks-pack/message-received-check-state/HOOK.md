---
name: message-received-check-state
description: "用户发送消息时自动检测对话状态"
metadata:
  {
    "openclaw":
      {
        "emoji": "🔍",
        "events": ["message:received"],
        "priority": 100
      }
  }
---

# Message Received Check State Hook

在用户发送消息时自动检测对话状态，记录消息上下文。

## 功能

- 检测消息类型（命令、意图、问题、确认等）
- 识别关键词并建议后续操作
- 记录消息状态到日志文件

## 配置

可在 `index.js` 中修改以下配置：

- `CONFIG.logDir` - 日志存储目录
- `CONFIG.maxLogDays` - 最大日志保留天数
- `CONFIG.rules.keywords` - 关键词触发规则
- `CONFIG.rules.channels` - 渠道特定配置
