# OpenClaw Workspace 架构

## 目录结构

```
workspace/
├── lib/                      # 共享库（核心）
│   ├── index.js              # 统一入口
│   ├── config.js             # 统一配置
│   ├── utils.js              # 共享工具函数
│   ├── base-controller.js    # Skills 控制器基类
│   └── base-hook.js          # Hooks 基类
│
├── hooks/                    # Hook 模块
│   ├── code-guard/           # 代码规范守护
│   ├── self-heal/            # 自我维护系统
│   ├── storage-protect/      # 存储保护
│   ├── task-logger/          # 任务日志
│   ├── message-received-check-state/  # 消息状态检测
│   └── sender-trigger/       # 发送者触发
│
├── skills/                   # Skill 模块
│   ├── fanqie-novel/         # 番茄小说
│   └── baimeng-writer/       # 白梦写作
│
├── modules/                  # 功能模块
│   ├── workflow-engine/      # 工作流引擎
│   └── website-automation/   # 网站自动化
│
└── *.md                      # Workspace Context 文件
```

## 设计原则

### 1. 低耦合
- 所有路径通过 `lib/config.js` 统一管理
- Hooks 和 Skills 通过基类继承，不直接依赖具体实现
- 配置注入，而非硬编码

### 2. 高内聚
- 每个 Hook/Skill 只负责单一职责
- 相关功能聚合在同一模块中
- 共享逻辑抽取到 `lib/`

### 3. 可扩展
- 新增平台：继承 `BaseController`，实现平台特有方法
- 新增 Hook：继承 `BaseHook`，实现 `handle()` 方法
- 配置扩展：修改 `config.js`，无需改动代码

## 使用方式

### 创建新的 Skill 控制器

```javascript
const { BaseController, createCliEntry, config } = require('../../lib');

class MyPlatformController extends BaseController {
  constructor() {
    super({
      platform: 'my-platform',
      name: '我的平台',
      urls: config.URLS.myPlatform, // 需先在 config.js 中配置
    });
  }
  
  // 覆盖基类方法实现平台特有逻辑
  async getWorks() {
    // ...
  }
}

// CLI 入口
if (require.main === module) {
  createCliEntry(MyPlatformController)().catch(console.error);
}
```

### 创建新的 Hook

```javascript
const { BaseHook, extractMessage } = require('../../lib');

class MyHook extends BaseHook {
  constructor() {
    super({
      name: 'my-hook',
      version: '1.0.0',
      description: '我的 Hook',
      emoji: '🔌',
      events: ['message:received'],
      priority: 100,
    });
  }
  
  async handle(event) {
    const msg = extractMessage(event);
    // 处理逻辑...
    return this.response(true, { processed: true });
  }
}

module.exports = new MyHook();
```

### 使用共享配置

```javascript
const config = require('../../lib/config');

// 获取平台模块路径
const modulePath = config.getPlatformModule('fanqie');

// 获取浏览器目录
const browserDir = config.getBrowserDir('baimeng');

// 获取超时配置
const timeout = config.TIMEOUTS.pageLoad;
```

### 使用共享工具

```javascript
const { 
  ensureDir, 
  formatLocalTime, 
  appendJsonl,
  createLogger 
} = require('../../lib');

const logger = createLogger('my-module');
ensureDir('/path/to/dir');
appendJsonl('/path/to/log.jsonl', { event: 'test' });
```

## 命名规范

| 类型 | 命名 | 示例 |
|------|------|------|
| Hook 目录 | kebab-case | `code-guard` |
| Hook 类 | PascalCase + Hook | `CodeGuardHook` |
| Skill 目录 | kebab-case | `fanqie-novel` |
| Controller 类 | PascalCase + Controller | `FanqieController` |
| 配置键 | camelCase | `protectedPaths` |
| 事件 | snake_case | `message:received` |

## 版本规范

- 主版本号：架构变更
- 次版本号：功能新增
- 修订号：Bug 修复

示例：
- `2.0.0` - 重构为使用基类
- `2.1.0` - 新增功能
- `2.1.1` - Bug 修复
