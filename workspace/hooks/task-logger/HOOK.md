---
name: task-logger
description: "AI 完成任务后自动记录并执行预设任务"
metadata:
  {
    "openclaw":
      {
        "emoji": "📋",
        "events": ["gateway:startup", "command:new", "command:reset"],
        "priority": 200
      }
  }
---

# Task Logger Hook

测试版 - 监听 gateway:startup, command:new, command:reset 事件。

## 功能

- 在 Gateway 启动时记录日志
- 在用户执行 /new 或 /reset 命令时触发
