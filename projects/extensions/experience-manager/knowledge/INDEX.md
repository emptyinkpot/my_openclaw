# 知识库索引

> 快速导航到所需文档

---

## 快速导航

### 我想了解架构

| 文档 | 内容 |
|------|------|
| [ARCHITECTURE_V2.md](../novel-sync/docs/ARCHITECTURE_V2.md) | 项目架构文档（新） |
| [API_REFERENCE.md](../novel-sync/docs/API_REFERENCE.md) | 模块 API 参考（新） |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 架构设计文档 |

### 我想了解编码规范

| 文档 | 内容 |
|------|------|
| [CODING_STANDARDS.md](../novel-sync/CODING_STANDARDS.md) | 编码规范 |

### 我想查看脚本

| 文档 | 内容 |
|------|------|
| [SCRIPTS.md](../novel-sync/SCRIPTS.md) | 脚本索引 |
| [SCRIPT_DEPENDENCIES.md](SCRIPT_DEPENDENCIES.md) | 脚本调用关系图 |

### 我遇到了问题

| 文档 | 内容 |
|------|------|
| [ISSUES_AND_SOLUTIONS.md](ISSUES_AND_SOLUTIONS.md) | 问题记录与解决方案 |
| [baimeng/troubleshooting.md](baimeng/troubleshooting.md) | 白梦写作问题排查 |
| [common/browser-basics.md](common/browser-basics.md) | 浏览器基础知识 |

### 我想了解优化方向

| 文档 | 内容 |
|------|------|
| [OPTIMIZATION_SUGGESTIONS.md](OPTIMIZATION_SUGGESTIONS.md) | 优化建议与改进方向 |

### AI 自检框架

| 文档 | 内容 |
|------|------|
| [AI_SELF_CHECK.md](AI_SELF_CHECK.md) | AI 每次回答前的强制检查清单 |

---

## 平台文档

### 白梦写作 (baimeng)

| 文档 | 内容 |
|------|------|
| [login.md](baimeng/login.md) | 登录恢复 |
| [operations.md](baimeng/operations.md) | 操作说明 |
| [operation-chain.md](baimeng/operation-chain.md) | 操作链 |
| [replace-content.md](baimeng/replace-content.md) | 替换内容 |
| [modify-card.md](baimeng/modify-card.md) | 修改内容卡片 |
| [troubleshooting.md](baimeng/troubleshooting.md) | 问题排查 |

### Coze 扣子编程 (coze)

| 文档 | 内容 |
|------|------|
| [login.md](coze/login.md) | 登录恢复 |
| [operations.md](coze/operations.md) | 操作说明 |
| [operation-chain.md](coze/operation-chain.md) | 操作链 |

### 番茄小说 (fanqie)

| 文档 | 内容 |
|------|------|
| [login.md](fanqie/login.md) | 登录恢复 |
| [operations.md](fanqie/operations.md) | 操作说明 |

---

## 通用知识

| 文档 | 内容 |
|------|------|
| [browser-basics.md](common/browser-basics.md) | 浏览器基础知识 |

---

## 新增模块 (v2.0)

### 核心工具模块

| 模块 | 路径 | 说明 |
|------|------|------|
| 配置管理 | `src/config.js` | 统一配置管理 |
| 日志系统 | `src/utils/logger.js` | 日志记录 |
| 重试机制 | `src/utils/retry.js` | 自动重试 |
| 进度持久化 | `src/utils/progress.js` | 断点续传 |
| 定时任务 | `src/utils/scheduler.js` | 定时执行 |
| 账号管理 | `src/utils/account-manager.js` | 多账号轮换 |

### 平台模块

| 模块 | 路径 | 说明 |
|------|------|------|
| 基类 | `src/platforms/base/` | 浏览器/认证/元素基类 |
| 白梦写作 | `src/platforms/baimeng/platform.js` | 平台管理器 |
| Coze | `src/platforms/coze/index.js` | 平台管理器 |

### 测试框架

| 模块 | 路径 | 说明 |
|------|------|------|
| 测试运行器 | `tests/runner.js` | 轻量级测试框架 |

---

## 快速开始

### 使用新模块

```javascript
// 白梦写作平台
const { BaimengPlatform } = require('./src/platforms/baimeng/platform');
const platform = new BaimengPlatform({ accountId: 1 });
await platform.init();
await platform.ensureLogin();
await platform.gotoEditor();
await platform.findChapter('66');
await platform.close();

// Coze 平台
const { CozePlatform } = require('./src/platforms/coze');
const platform = new CozePlatform({ accountId: 1 });
await platform.init();
await platform.ensureLogin();
await platform.gotoCodeSite();
await platform.close();
```

### 使用工具模块

```javascript
// 日志
const logger = require('./src/utils/logger');
const log = logger.create('my-task');
log.info('开始执行');

// 重试
const { retry } = require('./src/utils/retry');
await retry(async () => { ... }, { maxRetries: 3 });

// 进度
const progress = require('./src/utils/progress').create('task');
await progress.run({ step1: async () => {}, step2: async () => {} });

// 定时任务
const scheduler = require('./src/utils/scheduler');
scheduler.schedule('0 2 * * *', async () => { ... });

// 多账号
const { AccountManager } = require('./src/utils/account-manager');
const manager = new AccountManager('baimeng');
await manager.withAccount(async (accountId) => { ... });
```
