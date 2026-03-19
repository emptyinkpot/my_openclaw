# 模块开发规范

## 架构概览

```
workspace/
├── modules/                    # 通用模块库（可复用）
│   └── website-automation/     # 网站自动化模块
│       ├── src/
│       │   ├── core/          # 核心类
│       │   ├── utils/         # 工具函数
│       │   └── index.js       # 模块入口
│       ├── package.json
│       └── README.md
│
├── projects/                   # 项目脚本（具体业务）
│   ├── baimeng-writer/        # 白梦写作网项目
│   └── _template/             # 新项目模板
│
└── docs/                      # 文档中心
```

## 设计原则

### 1. 分层架构

```
┌─────────────────────────────────────┐
│           项目脚本层 (projects/)       │  具体业务实现
│         白梦写作网 / 其他项目...        │
├─────────────────────────────────────┤
│           通用模块层 (modules/)        │  可复用基础能力
│      网站自动化 / 通知 / 数据库...       │
├─────────────────────────────────────┤
│           运行时环境                   │  Node.js / Playwright
└─────────────────────────────────────┘
```

### 2. 模块设计规范

#### 目录结构
```
modules/{module-name}/
├── src/
│   ├── core/              # 核心类和主要功能
│   ├── utils/             # 辅助工具函数
│   └── index.js           # 统一入口，导出所有公开API
├── package.json
└── README.md              # 模块文档
```

#### 代码规范

**文件头规范**
```javascript
/**
 * @fileoverview 简短描述文件功能
 * @module @openclaw-modules/{module-name}/{sub-module}
 */
```

**类定义规范**
```javascript
/**
 * 类描述
 * @class
 */
class MyClass {
  /**
   * @param {Object} config - 配置对象
   * @param {string} config.name - 名称
   */
  constructor(config) {
    // 参数验证
    this._validateConfig(config);
    
    // 属性初始化（私有）
    this._value = config.value;
  }
  
  // 公共属性使用 getter
  get value() { return this._value; }
  
  /**
   * 方法描述
   * @param {string} param - 参数说明
   * @returns {boolean} 返回值说明
   */
  myMethod(param) {
    // 实现
  }
  
  // 私有方法以下划线开头
  _validateConfig(config) {
    // 验证逻辑
  }
}
```

### 3. 配置规范

模块配置对象必须包含：
```javascript
{
  name: string,           // 标识名（必填）
  baseUrl: string,        // 基础URL（必填）
  selectors: {            // 选择器配置（必填）
    loginBtn: string,     // 登录按钮
    loginCheck: string    // 登录检查元素
  },
  stateDir: string,       // 状态保存目录（必填）
  screenshotDir: string,  // 截图保存目录（必填）
  
  // 可选配置
  headless: boolean,      // 默认 true
  timeout: number,        // 默认 60000
  maxScreenshots: number  // 默认 5
}
```

### 4. API 设计规范

#### 核心类接口

```typescript
class WebsiteAutomation {
  // 属性
  readonly browser: Browser | null;
  readonly page: Page | null;
  readonly context: BrowserContext | null;
  readonly initialized: boolean;
  
  // 状态管理
  getStateFilePath(): string;
  hasSavedState(): boolean;
  getStateInfo(): StateInfo | null;
  
  // 生命周期
  init(options?: { force?: boolean }): Promise<void>;
  saveState(): Promise<SaveResult>;
  clearState(): boolean;
  close(): Promise<void>;
  
  // 导航
  goto(url?: string, options?: GotoOptions): Promise<void>;
  reload(options?: ReloadOptions): Promise<void>;
  
  // 登录检测
  checkLogin(options?: CheckOptions): Promise<boolean>;
  waitForLogin(options?: WaitOptions): Promise<boolean>;
  
  // 页面操作
  click(selector: string, options?: ClickOptions): Promise<void>;
  fill(selector: string, value: string): Promise<void>;
  getText(selector: string): Promise<string | null>;
  getTexts(selector: string): Promise<string[]>;
  evaluate(fn: Function, ...args: any[]): Promise<any>;
  queryElements(selector: string, extractFn?: Function): Promise<any[]>;
  
  // 截图
  screenshot(name?: string, options?: ScreenshotOptions): Promise<ScreenshotResult>;
  getScreenshotList(): ScreenshotInfo[];
  clearScreenshots(): number;
  
  // 工具
  sleep(ms: number): Promise<void>;
  waitFor(selector: string, options?: WaitOptions): Promise<boolean>;
}
```

### 5. 错误处理规范

```javascript
// 1. 构造函数验证
constructor(config) {
  this._validateConfig(config);
  // ...
}

// 2. 方法内验证
async saveState() {
  if (!this._context) {
    throw new Error('浏览器上下文未初始化');
  }
  // ...
}

// 3. 操作错误捕获
async getText(selector) {
  try {
    const element = this._page.locator(selector).first();
    return await element.textContent({ timeout: 5000 });
  } catch {
    return null;  // 返回默认值而非抛出
  }
}
```

### 6. 日志规范

```javascript
const { Logger } = require('./utils/logger');

const logger = new Logger({
  level: 'info',           // error/warn/info/debug
  logDir: '/path/to/logs', // 日志目录（可选）
  console: true            // 是否输出到控制台
});

// 使用
logger.info('操作成功', { detail: 'xxx' });
logger.error('操作失败', { error: err.message });
```

## 模块清单

| 模块 | 路径 | 功能 | 状态 |
|------|------|------|------|
| website-automation | `modules/website-automation` | 网站自动化核心 | ✅ 已发布 |

## 版本管理

使用语义化版本（SemVer）：
- `MAJOR.MINOR.PATCH`
- 破坏性更新 → MAJOR
- 功能新增 → MINOR
- Bug修复 → PATCH
