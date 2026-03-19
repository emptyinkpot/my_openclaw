---
name: knowledge-check
description: "知识库检查验证 - 验证 AI 是否声明已检查知识库"
metadata:
  {
    "openclaw":
      {
        "emoji": "📚",
        "events": ["agent:bootstrap"],
        "priority": 10
      }
  }
---

# Knowledge Check Hook

在 Agent 引导时触发，验证 AI 是否检查了知识库。

## 功能

- 验证 AI 是否阅读了必要的知识库文件
- 检查 AI 是否遵守项目规范
