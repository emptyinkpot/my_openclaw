---
id: "db_note_15"
title: "Hooks 统一管理完整解释"
category: "dev"
created_at: "2026-03-20T13:13:44.000Z"
updated_at: "2026-03-25T05:42:31.000Z"
tags: ["OpenClaw", "Hooks", "统一管理", "hooks-pack", "管理"]
related_experience_ids: []
---
# Hooks 统一管理完整解释

## Summary
Hooks 统一管理完整解释

## Content
# Hooks 统一管理完整解释

用户询问：hooks 好像都散乱分布，能不能统一管理？

---

## 回答

### 1️⃣ 当前 hooks 的分布情况

其实你的 hooks **已经是统一管理**的了！让我给你展示一下：

---

#### 📂 文件夹结构

```
/workspace/projects/
├── hooks-pack/                    # 👈 这就是统一的 hooks 文件夹！
│   ├── code-guard/               # 代码守卫 hook
│   ├── knowledge-check/          # 知识检查 hook
│   ├── message-received-check-state/  # 消息检查 hook
│   ├── pre-write-check/          # 写前检查 hook
│   ├── self-heal/                # 自我修复 hook
│   ├── sender-trigger/           # 发送触发器 hook
│   ├── storage-protect/          # 存储保护 hook
│   ├── task-logger/              # 任务日志 hook
│   ├── verification-tracker/     # 验证追踪 hook
│   ├── lib/                      # 公共库
│   └── package.json              # hooks-pack 配置
│
├── openclaw.json                 # 配置文件
```

---

#### ⚙️ 配置文件里的设置

看你的 openclaw.json 配置：

```json
"hooks": {
  "internal": {
    "enabled": true,
    "entries": {
      "message-received-check-state": { "enabled": true },
      "task-logger": { "enabled": true },
      "storage-protect": { "enabled": true },
      "code-guard": { "enabled": true },
      "self-heal": { "enabled": true },
      "knowledge-check": { "enabled": true },
      "pre-write-check": { "enabled": true },
      "sender-trigger": { "enabled": true }
    },
    "load": {
      "extraDirs": [
        "/workspace/projects/hooks-pack"  // 👈 加载这个文件夹！
      ]
    },
    "installs": {
      "workspace-hooks-pack": {
        "source": "path",
        "sourcePath": "/workspace/projects/hooks-pack",
        "installPath": "/workspace/projects/hooks-pack"
      }
    }
  }
}
```

---

### 2️⃣ 所以，你的 hooks 已经是统一管理的了！

| 方面 | 现状 |
|------|------|
| 📂 文件夹位置 | ✅ 统一在 hooks-pack/ 文件夹里 |
| ⚙️ 配置位置 | ✅ 统一在 openclaw.json 里配置 |
| 🎛️ 启用/禁用 | ✅ 可以在配置里统一控制 |
| 📦 安装管理 | ✅ 通过 installs 统一管理 |

---

### 3️⃣ 每个 hook 文件夹的内容

每个 hook 文件夹里都有：

```
hooks-pack/code-guard/
├── HOOK.md          # hook 的说明文档
└── index.js         # hook 的代码
```

---

### 4️⃣ 如何管理 hooks？

#### ✅ 查看所有 hooks
```bash
ls -la /workspace/projects/hooks-pack/
```

#### ✅ 启用/禁用某个 hook
在 openclaw.json 里修改：
```json
"hooks": {
  "internal": {
    "entries": {
      "code-guard": { "enabled": false }  // 禁用
    }
  }
}
```

#### ✅ 添加新的 hook
1. 在 hooks-pack/ 里创建新文件夹
2. 编写 index.js 和 HOOK.md
3. 在 openclaw.json 里配置启用

---

### 5️⃣ 总结

| 问题 | 答案 |
|------|------|
| hooks 散乱分布吗？ | ❌ 不！已经统一在 hooks-pack/ 文件夹里了！ |
| 能统一管理吗？ | ✅ 当然！已经是统一管理的了！ |
| 在哪里管理？ | 📂 hooks-pack/ 文件夹 + ⚙️ openclaw.json 配置 |

---

### 6️⃣ 你可能觉得"散乱"的原因？

可能是因为：
1. 每个 hook 有自己的独立文件夹
2. 配置文件里也有对应的配置
3. 但这其实是**有组织的统一管理**，不是散乱！

## Sections
-