# MEMORY.md - Long-Term Memory

> 记录重要决策、经验教训、项目上下文

---

## 🎯 Auto-Scripts 项目

### 项目概述
- **用途**: 番茄小说和白梦写作平台的作品标题同步
- **扩展**: OpenClaw Hook 自动化任务调用
- **架构**: Node.js + Playwright + OpenClaw

### 核心目录
- `src/platforms/baimeng/` - 白梦平台模块
- `src/platforms/fanqie/` - 番茄平台模块
- `scripts/flows/` - 流程脚本
- `storage/` - 数据存储

### 关键经验

#### 数据保护
- 白梦浏览器数据在 `storage/platforms/baimeng/browser-data/`
- 番茄账户数据在 `storage/platforms/fanqie/accounts/`
- 删除前必须先备份，使用 `storage-protect.sh`

#### 代码规范
- 必须使用 `runTask()` 作为入口
- 从 `baimeng` 模块导入，不要直接用 playwright
- 选择器从 `docs/元素选择器字典.md` 查找

#### 常见陷阱
- `localStorage.clear()` 会导致白屏
- 硬编码选择器会在页面更新后失效
- URL 拼写错误：是 baimengxiezuo 不是 baimoxiezuo

---

## 📚 知识库位置

| 文件 | 用途 |
|------|------|
| `docs/已验证代码库.md` | 可复用的验证代码 |
| `docs/DEBUG_LOG.md` | 历史问题记录 |
| `docs/用户教导记录.md` | 用户教导 |
| `docs/元素选择器字典.md` | 选择器字典 |

---

## 🔧 维护系统

### 自我维护
- `/heal` - 自动修复
- `/diagnose` - 诊断问题
- `/learn` - 从经验学习

### 定时任务
- 每小时: 健康检查
- 每天: 清理缓存
- 每周: 依赖检查

---

## 📝 重要决策记录

### 2026-03-16: Storage 目录重构
- 合并重叠目录到 `platforms/` 和 `works/`
- 创建兼容性软链接
- 添加数据保护系统

### 2026-03-16: 自我维护系统
- 创建 self-heal Hook
- 创建 code-guard Hook
- 创建经验积累系统

---

## ⚠️ 注意事项

- 数据文件已纳入 Git 追踪
- 软链接删除不影响实际数据
- 受保护路径删除会移入回收站

---

## 🦞 OpenClaw Hook 配置

### 目录结构
```
/workspace/projects/
├── workspace/
│   ├── hooks/          # Hook 源代码（开发用）
│   └── lib/            # 共享库
└── hooks-pack/         # OpenClaw 加载目录
    ├── package.json    # 定义所有 hooks
    ├── lib/            # 依赖库副本
    ├── code-guard/
    │   ├── HOOK.md     # JSON 格式 metadata
    │   └── index.js
    └── ...（其他 hooks）
```

### HOOK.md 格式要求
**必须使用 JSON 格式，不能用 YAML：**
```yaml
---
name: my-hook
description: "描述"
metadata:
  {
    "openclaw":
      {
        "emoji": "🛡️",
        "events": ["tool:complete"],
        "priority": 5
      }
  }
---
```

### 配置要点
1. `hooks.internal.load.extraDirs` 必须指向 hooks-pack
2. hooks-pack 需要包含 lib 依赖副本
3. package.json 需要 `openclaw.hooks` 字段

### 自检命令
```bash
openclaw hooks list        # 查看 Hook 状态
openclaw gateway status    # 查看 Gateway 状态
openclaw doctor            # 检查配置健康
```

### 常见问题
| 问题 | 解决方案 |
|------|----------|
| Hook 不显示 | 检查 extraDirs 配置 |
| 找不到模块 | 复制 lib 到 hooks-pack |
| 事件不触发 | 检查 HOOK.md JSON 格式 |
| systemd 错误 | 容器环境正常，可忽略 |

### 2026-03-18: Hook 路径修复经验

#### 问题
Hook 加载失败，日志显示 `Cannot find module '../../lib/config'`

#### 根本原因
- hooks-pack 目录结构与 workspace/hooks 不同
- hooks-pack/lib 是 lib 的副本，在同级目录
- 原 Hook 文件使用 `../../lib` 路径（适用于 workspace/hooks），不适用于 hooks-pack

#### 解决方案
```javascript
// 错误
const { config } = require('../../lib/config');

// 正确（hooks-pack 目录结构）
const { config } = require('../lib/config');
```

#### 关键经验
1. **多轮验证必要性**：修复后必须进行 3+ 轮验证才能确认完成
2. **路径一致性**：所有 Hook 文件的 require 路径必须适配 hooks-pack 目录
3. **经验积累**：修复问题后立即记录到 MEMORY.md，避免重复踩坑

#### 验证流程
```bash
# 每轮验证执行：
sh /workspace/projects/scripts/restart.sh
openclaw gateway status
openclaw hooks list
# 检查日志无错误
```

---

## 2026-03-18: Hook 事件配置问题

### 问题
Hook 已注册显示 ready，但 handler 从未被调用。

### 根本原因
1. **HOOK.md 的 events 配置是关键** - OpenClaw 从 HOOK.md 读取 metadata，**不是**从 index.js 的 getMetadata()
2. **`tool:complete` 不是 Internal hooks 支持的事件** - 它可能是 Plugin hooks 的事件

### Internal hooks 支持的事件
从 bundled hooks 确认的事件：
- `gateway:startup` - Gateway 启动时
- `command:new` - 用户执行 /new
- `command:reset` - 用户执行 /reset  
- `command` - 任何命令
- `message:received` - 收到消息

### 正确配置方式
```yaml
# HOOK.md
---
name: my-hook
description: "描述"
metadata:
  {
    "openclaw":
      {
        "emoji": "📋",
        "events": ["gateway:startup", "command:new"],
        "priority": 200
      }
  }
---
```

### 验证 Hook 是否工作
1. 在 index.js 中添加 console.error 日志
2. 重启 Gateway
3. 检查日志是否有 handler 被调用的记录

### 关键经验
- **HOOK.md 和 index.js 必须同步** - events 配置以 HOOK.md 为准
- **验证要彻底** - 不只看 ready 状态，要验证 handler 真的被调用
- **使用确定会触发的事件测试** - 如 gateway:startup


---

## 2026-03-18: 验证追踪机制（防止 AI 偷懒）

### 问题
AI 可能报告"完成"但实际验证不充分，甚至根本没验证。

### 解决方案：verification-tracker Hook

创建了一个强制追踪机制：

```
┌─────────────────────────────────────────────────────┐
│              verification-tracker                    │
├─────────────────────────────────────────────────────┤
│  记录修改 → recordModification(file)                │
│  记录验证 → recordVerification(round, result)       │
│  查看状态 → cat /tmp/openclaw/verification-status.json │
│  Hook 启动时自动报告状态                             │
└─────────────────────────────────────────────────────┘
```

### 使用方式

**修改文件后**：
```bash
node -e "require('/workspace/projects/hooks-pack/verification-tracker').recordModification('文件路径')"
```

**验证后**：
```bash
node -e "require('/workspace/projects/hooks-pack/verification-tracker').recordVerification(1, '通过')"
```

**查看状态**：
```bash
cat /tmp/openclaw/verification-status.json
```

### 验证规则
- 验证次数 ≥ 3
- 验证次数 ≥ 修改次数
- 不满足条件：Hook 报告 ⚠️ 警告
- 满足条件：Hook 报告 ✅ 验证充分

### 用户监督
用户可随时查看状态文件，确认 AI 是否真的完成了验证。

### 关键经验
1. **Hook 在 gateway:startup 时自动执行**，AI 无法跳过
2. **状态文件持久化**，重启后仍可读取
3. **用户可见**，可主动监督 AI 行为


---

## 2026-03-18: 项目 Bug 全面检查与修复

### 发现的问题

| 问题 | 严重程度 | 解决方案 |
|------|---------|----------|
| wecom 插件 ID 不匹配 | ⚠️ 中 | 删除未使用的插件目录和配置 |
| Hook 用了不支持的事件 (tool:complete) | ❌ 高 | 更新为支持的事件 |
| workspace/hooks 和 hooks-pack 配置不一致 | ⚠️ 中 | 同步配置文件 |

### 修复内容

1. **移除 wecom 插件**
   - 删除 `/workspace/projects/extensions/wecom` 目录
   - 从 `openclaw.json` 移除相关配置

2. **修复 Hook 事件配置**
   - `code-guard`: tool:complete → command
   - `knowledge-check`: tool:complete → agent:bootstrap
   - `pre-write-check`: tool:complete → command
   - `self-heal`: tool:complete, command → command, gateway:startup
   - `storage-protect`: tool:complete → command

3. **同步配置**
   - 将 hooks-pack 的 HOOK.md 同步到 workspace/hooks

### Internal Hooks 支持的事件

```
✅ 支持：
- gateway:startup - Gateway 启动时
- command:new - 用户执行 /new
- command:reset - 用户执行 /reset
- command - 任何命令
- message:received - 收到消息
- agent:bootstrap - Agent 引导时

❌ 不支持：
- tool:complete - 这是 Plugin hooks 的事件
- tool:call - 同上
```

### 验证结果

- 修改次数: 3
- 验证次数: 8
- 所有 Hooks ready (13/13)
- Gateway 正常运行
- 无配置警告

