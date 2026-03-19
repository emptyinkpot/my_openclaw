# OpenClaw Hooks 触发机制

本文档说明自定义 Hooks 的触发时机和使用方法。

---

## 一、触发事件总览

| 事件 | 触发时机 | 可拦截 | 监听的 Hook |
|------|----------|--------|-------------|
| `tool:call` | 工具调用**前** | ✅ 是 | code-guard, storage-protect, pre-write-check |
| `tool:complete` | 工具调用**后** | ❌ 否 | task-logger |
| `message:received` | 用户发送消息 | ❌ 否 | message-received-check-state, sender-trigger |
| `command` | 执行命令时 | ❌ 否 | task-logger |
| `task:complete` | 任务完成时 | ❌ 否 | self-heal |
| `error` | 发生错误时 | ❌ 否 | self-heal |

---

## 二、关键 Hook 说明

### 1. code-guard（代码规范守护）

```
触发时机：write_file / edit_file 调用前
触发条件：写入 .js 或 .ts 文件
可拦截：✅ 是

禁止模式（阻止写入）：
- localStorage.clear() → 会导致白屏

警告模式（允许写入但警告）：
- require('playwright') → 应使用平台模块
```

**拦截示例**：
```javascript
// AI 尝试写入包含 localStorage.clear() 的代码
// code-guard 检测到违规，返回 blocked: true
// 代码不会被写入，AI 收到错误消息
```

### 2. pre-write-check（写入前检查）

```
触发时机：修改 auto-scripts 项目代码前
触发条件：修改 /auto-scripts/src/ 或 /auto-scripts/scripts/
可拦截：❌ 否（只提醒，不阻止）

功能：
- 提醒 AI 检查知识库
- 提醒 AI 检查已验证代码
- 提醒 AI 检查历史问题
```

### 3. storage-protect（存储保护）

```
触发时机：delete_file / remove_file 调用前
触发条件：删除受保护路径下的文件
可拦截：✅ 是

受保护路径：
- accounts/
- platforms/baimeng/
- platforms/fanqie/
```

---

## 三、拦截机制

Hook 可以通过返回值控制是否继续执行：

```javascript
// 允许继续
return { proceed: true };

// 阻止执行
return { 
  blocked: true, 
  message: '阻止原因' 
};

// 允许但给出反馈
return { 
  proceed: true, 
  feedback: { type: 'warning', message: '警告信息' }
};
```

---

## 四、优先级

优先级数字越小越先执行：

| Hook | 优先级 | 说明 |
|------|--------|------|
| pre-write-check | 1 | 最高，先提醒 |
| storage-protect | 5 | 高，保护数据 |
| code-guard | 5 | 高，保护代码 |
| message-received-check-state | 100 | 中，记录状态 |
| sender-trigger | 50 | 中，触发任务 |
| task-logger | 200 | 低，记录日志 |
| self-heal | 150 | 低，自我修复 |

---

## 五、自定义命令

通过消息触发 Hook 功能：

| 命令 | Hook | 功能 |
|------|------|------|
| `/heal` | self-heal | 执行自我修复 |
| `/diagnose <关键词>` | self-heal | 诊断问题 |
| `/report` | self-heal | 生成运行报告 |
| `/protect status` | storage-protect | 查看保护状态 |
| `/protect list` | storage-protect | 查看回收站 |
| `/check` | code-guard | 检查最近代码 |

---

## 六、架构说明

所有 Hook 继承自 `lib/base-hook.js`，使用共享配置 `lib/config.js`。

```javascript
// 创建新 Hook
const { BaseHook } = require('../../lib');

class MyHook extends BaseHook {
  constructor() {
    super({
      name: 'my-hook',
      version: '1.0.0',
      events: ['tool:call'],
      priority: 100,
    });
  }
  
  async handle(event) {
    return this.response(true);
  }
}

module.exports = new MyHook();
```

详见 `docs/ARCHITECTURE.md`。
