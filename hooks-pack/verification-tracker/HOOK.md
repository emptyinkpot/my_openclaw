---
name: verification-tracker
description: "验证追踪器 - 追踪修改和验证次数，防止 AI 偷懒"
metadata:
  {
    "openclaw":
      {
        "emoji": "🔍",
        "events": ["gateway:startup"],
        "priority": 1
      }
  }
---

# Verification Tracker Hook

追踪文件修改次数和验证次数，每次 Gateway 启动时报告状态。

## 功能

- 记录文件修改次数
- 记录验证执行次数
- 启动时对比两者，发出警告
- 防止 AI "改了就报告完成" 的偷懒行为

## 使用方式

AI 应该在每次修改文件后调用：
```javascript
const tracker = require('/workspace/projects/hooks-pack/verification-tracker');
tracker.recordModification('文件路径');
```

每次验证后调用：
```javascript
tracker.recordVerification(1, '通过');  // 轮次, 结果
```

查看摘要：
```javascript
const summary = tracker.getSummary();
// { modifications: 3, verifications: 2, needsMoreVerification: true }
```
