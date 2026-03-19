---
name: self-heal
description: "自我维护系统 - 自动监控、诊断、修复、学习"
metadata:
  {
    "openclaw":
      {
        "emoji": "🔧",
        "events": ["command", "gateway:startup"],
        "priority": 150
      }
  }
---

# Self-heal Hook

自我维护系统，在命令执行和 Gateway 启动时触发。

## 功能

- 自动监控项目状态
- 诊断问题
- 执行修复
- 学习经验
