# 脚本架构文档

## 架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│                        应用层 (App Layer)                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  二级脚本 (复合脚本) - 组合多个一级脚本完成复杂流程            │ │
│  │  • polish-and-replace.js  润色+替换完整流程                   │ │
│  │  • polish-flow.js         润色完整流程                        │ │
│  │  • novel-sync-flow.js     小说同步流程 (待创建)               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              ↓                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  一级脚本 (基础脚本) - 单一功能，可复用                       │ │
│  │  • baimeng-chapter-finder.js  查找章节                      │ │
│  │  • baimeng-copy.js            复制章节内容                  │ │
│  │  • replace-content.js         替换章节内容                  │ │
│  │  • coze-programming.js        打开扣子编程                  │ │
│  │  • coze-project-manage.js     项目管理                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        平台层 (Platform Layer)                   │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐        │
│  │   baimeng/    │  │    coze/      │  │   fanqie/     │        │
│  │   ├── auth        │  │ ├── browser   │  │   ├── auth    │        │
│  │   ├── works       │  │ ├── auth      │  │   └── works   │        │
│  │   ├── sidebar     │  │ ├── element   │  │               │        │
│  │   ├── content     │  │ ├── navigation│  │               │        │
│  │   ├── copy        │  │ └── polish    │  │               │        │
│  │   ├── browser     │  │               │  │               │        │
│  │   ├── editor      │  │               │  │               │        │
│  │   ├── verify      │  │               │  │               │        │
│  │   └── polish-result│  │               │  │               │        │
│  └───────────────┘  └───────────────┘  └───────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        基础层 (Foundation Layer)                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐        │
│  │ lib/browser/  │  │  lib/utils/   │  │  lib/sites/   │        │
│  │ ├── manager   │  │ ├── clipboard │  │ ├── base      │        │
│  │ └── auth      │  │ └── scroll    │  │ ├── baimeng   │        │
│  │               │  │               │  │ ├── coze      │        │
│  │               │  │               │  │ └── fanqie    │        │
│  └───────────────┘  └───────────────┘  └───────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        支撑层 (Support Layer)                    │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐        │
│  │   scripts/    │  │   storage/    │  │  knowledge/   │        │
│  │ ├── run.sh    │  │ ├── clipboard │  │ ├── baimeng/  │        │
│  │ ├── restart.sh│  │ └── polish    │  │ ├── coze/     │        │
│  │ └── stop.sh   │  │               │  │ └── fanqie/   │        │
│  └───────────────┘  └───────────────┘  └───────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 一、一级脚本（基础脚本）

一级脚本是**单一功能**的最小执行单元，可独立运行，也可被二级脚本组合调用。

### 1.1 白梦写作平台

| 脚本 | 功能 | 输入 | 输出 | 模块依赖 |
|------|------|------|------|----------|
| `baimeng-chapter-finder.js` | 查找并定位章节 | 章节号 | 打开章节页面 | `baimeng.auth`, `baimeng.works`, `baimeng.sidebar` |
| `baimeng-copy.js` | 复制章节内容 | 作品名+章节号 | 写入剪贴板 | `baimeng.auth`, `baimeng.works`, `baimeng.copy` |
| `replace-content.js` | 替换章节内容 | 章节号+剪贴板内容 | 更新编辑器 | `baimeng.auth`, `baimeng.editor`, `baimeng.verify` |

### 1.2 Coze 扣子编程平台

| 脚本 | 功能 | 输入 | 输出 | 模块依赖 |
|------|------|------|------|----------|
| `open-coze.js` | 打开扣子编程主站 | 无 | 打开页面 | `coze.browser`, `coze.auth` |
| `coze-programming.js` | 进入扣子编程 | 无 | 打开页面 | `coze.browser`, `coze.auth` |
| `coze-project-manage.js` | 项目管理 | 无 | 项目列表 | `coze.browser`, `coze.auth` |
| `save-coze-login.js` | 保存登录状态 | 无 | Cookie文件 | `coze.auth` |

---

## 二、二级脚本（复合脚本）

二级脚本**组合多个一级脚本或模块**，完成复杂业务流程。

| 脚本 | 功能 | 流程 | 输入 | 输出 |
|------|------|------|------|------|
| `polish-flow.js` | 文本润色完整流程 | 导入资源库 → 粘贴 → 润色 → 提取 → 保存 | 剪贴板内容 | 润色后文件 |
| `polish-and-replace.js` | 润色+替换完整流程 | 复制 → 润色 → 修改标题 → 替换正文 → 保存 | 作品名+章节号 | 更新白梦章节 |

### 2.1 润色流程详解

```
polish-flow.js 流程图:

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ 读取剪贴板  │ ──→ │  打开网站   │ ──→ │  粘贴内容   │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ↓
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  保存结果   │ ←── │  提取结果   │ ←── │  等待进度   │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 2.2 润色+替换完整流程（polish-and-replace.js）

```
polish-and-replace.js 流程图:

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  打开章节   │ ──→ │  备份内容   │ ──→ │  复制正文   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       │                                       ↓
       │                                ┌─────────────┐
       │                                │  润色内容   │
       │                                │ (调用polish)│
       │                                └─────────────┘
       │                                       │
       │                                       ↓
       │                                ┌─────────────┐
       │                                │ 解析润色结果│
       │                                └─────────────┘
       │                                       │
       ↓                                       ↓
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  返回章节   │ ──→ │  修改标题   │ ──→ │  替换正文   │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ↓
                                       ┌─────────────┐
                                       │    保存     │
                                       └─────────────┘
```

**关键特性**:
1. **备份机制**：操作前自动备份原标题和正文
2. **缓存机制**：润色结果保存到 `/tmp/polish-result-{章节号}.json`
3. **恢复机制**：润色失败时恢复原内容
4. **元数据支持**：润色结果包含来源、作品、章节信息

**使用方式**:
```bash
# 基础用法
node tasks/baimeng/polish-and-replace.js "作品名" 章节号

# 强制重新润色（忽略缓存）
rm /tmp/polish-result-章节号.json
node tasks/baimeng/polish-and-replace.js "作品名" 章节号
```

---

## 三、通用模块

### 3.1 剪贴板模块 (`lib/utils/clipboard.js`)

**功能**：跨脚本的持久化数据传递，支持命名空间、元数据、自动清理

**存储位置**：`/storage/clipboard/` （全局目录，跨项目共享）

```javascript
const clipboard = require('lib/utils/clipboard');

// 基础读写
clipboard.write('hello world');
clipboard.write('标题', 'title', { namespace: 'polish' });
const text = clipboard.read('latest', { namespace: 'polish' });

// JSON 支持
clipboard.writeJson({ key: 'value' }, 'config');
const data = clipboard.readJson('config');

// 保存结果（带元数据和自动清理）
clipboard.saveResult(
  { title: '...', content: '...' },
  { 
    prefix: 'baimeng-作品名-第一章',  // 文件前缀
    namespace: 'polish',              // 命名空间
    meta: { source: 'baimeng', work: '作品名', chapter: '第一章' },
    keepCount: 3                      // 保留数量（自动清理）
  }
);

// 清理旧文件
clipboard.cleanup({ namespace: 'polish', keepCount: 3 });

// 列出文件
const files = clipboard.list({ namespace: 'polish' });
```

### 3.2 浏览器管理模块 (`lib/browser/manager.js`)

```javascript
const { BrowserManager } = require('lib/browser/manager');

// 获取共享浏览器
const browser = await BrowserManager.getDefaultBrowser();

// 获取独立浏览器
const browser = await BrowserManager.getSiteBrowser('baimeng', 'account-1');
```

### 3.3 认证模块 (`lib/browser/auth.js`)

```javascript
const { AuthManager } = require('lib/browser/auth');

const auth = new AuthManager('baimeng', 'default');
await auth.restoreLogin();
await auth.saveLogin();
```

---

## 四、数据流

### 4.1 剪贴板数据流

```
┌─────────────┐                    ┌─────────────┐
│  白梦复制   │ ──→ storage/clipboard/ ←── │  润色读取  │
│ baimeng-copy│                    │   latest.txt │    polish-flow│
└─────────────┘                    └─────────────┘     └─────────────┘
                                          ↑
                                          │
                                   ┌─────────────┐
                                   │  润色保存   │
                                   │ title-latest│
                                   │content-latest│
                                   │polished-latest│
                                   └─────────────┘
```

### 4.2 登录状态数据流

```
┌─────────────┐                    ┌─────────────┐
│  保存登录   │ ──→ cookies-accounts/ ←── │  恢复登录  │
│ save-login  │                    │{site}-{id}.json│ │restore-login│
└─────────────┘                    └─────────────┘     └─────────────┘
```

---

## 五、目录结构

```
/workspace/projects/
├── workspace/projects/novel-sync/
│   ├── tasks/                    # 脚本目录
│   │   ├── baimeng/             # 白梦一级脚本
│   │   └── coze/                # Coze 一级/二级脚本
│   ├── src/
│   │   ├── platforms/           # 平台模块
│   │   │   ├── baimeng/        # 白梦平台模块
│   │   │   ├── coze/           # Coze 平台模块
│   │   │   └── fanqie/         # 番茄平台模块
│   │   ├── utils/              # 工具函数
│   │   └── config.js           # 配置文件
│   └── storage/                # 数据存储
│       ├── clipboard/          # 剪贴板文件
│       └── polish/             # 润色资源
│
├── lib/                         # 通用库（跨项目共享）
│   ├── browser/                # 浏览器管理
│   │   ├── manager.js
│   │   └── auth.js
│   ├── utils/                  # 工具模块
│   │   ├── clipboard.js        # 剪贴板模块
│   │   └── scroll.js           # 滚动工具
│   └── sites/                  # 网站基类
│       ├── base.js
│       ├── baimeng.js
│       ├── coze.js
│       └── fanqie.js
│
├── scripts/                     # 通用脚本
│   ├── run.sh                  # 命令执行器
│   ├── restart.sh              # 重启 Gateway
│   └── stop.sh                 # 停止 Gateway
│
├── storage/                     # 全局存储
│   └── clipboard/              # 全局剪贴板
│
├── browser/                     # 浏览器数据
│   ├── default/                # 共享模式
│   └── {site}-{id}/            # 独立模式
│
├── cookies-accounts/            # 登录状态备份
│   ├── baimeng-default.json
│   ├── coze-account-1.json
│   └── fanqie-default.json
│
└── knowledge/                   # 知识库
    ├── baimeng/
    ├── coze/
    ├── fanqie/
    └── architecture/           # 架构文档
        └── scripts.md
```

---

## 六、扩展指南

### 6.1 新增一级脚本

1. 创建脚本文件 `tasks/{platform}/{action}.js`
2. 使用 `runTask()` 入口
3. 依赖平台模块实现具体功能
4. 更新本文档

### 6.2 新增二级脚本

1. 组合已有的一级脚本或模块
2. 实现完整业务流程
3. 使用剪贴板模块传递数据
4. 更新本文档

### 6.3 新增平台模块

1. 创建 `src/platforms/{platform}/index.js`
2. 实现必要模块：`browser`, `auth`, `element`
3. 可选继承 `lib/sites/base.js`
4. 创建知识库文档 `knowledge/{platform}/`

---

## 七、最佳实践

### 7.1 脚本设计原则

1. **单一职责**：一级脚本只做一件事
2. **数据隔离**：使用剪贴板模块传递数据
3. **登录复用**：使用认证模块管理登录状态
4. **浏览器共享**：默认使用共享模式，必要时才独立

### 7.2 命名规范

```
一级脚本：{平台}-{动作}.js
  例：baimeng-copy.js, coze-project-manage.js

二级脚本：{场景}-flow.js
  例：polish-flow.js, novel-sync-flow.js

模块目录：src/platforms/{平台}/
  例：src/platforms/baimeng/
```

### 7.3 执行方式

```bash
# 一级脚本（短时间）
node tasks/baimeng/baimeng-copy.js "作品名" 66

# 二级脚本（长时间，推荐用 run.sh）
./scripts/run.sh 120 node tasks/coze/polish-flow.js

# 后台执行
./scripts/run.sh bg "node tasks/coze/polish-flow.js"
```
