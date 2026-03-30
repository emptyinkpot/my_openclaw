# 脚本调用关系图

> 展示任务脚本与基础模块之间的调用关系

---

## 一、整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              novel-sync 项目架构                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                          任务脚本 (tasks/)                               │   │
│  │  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐    │   │
│  │  │ baimeng/          │  │ coze/             │  │ (未来扩展)        │    │   │
│  │  │ ├─ replace-content│  │ ├─ open-coze      │  │                   │    │   │
│  │  │ ├─ chapter-finder │  │ ├─ programming    │  │                   │    │   │
│  │  │ ├─ copy-chapter   │  │ ├─ project-manage │  │                   │    │   │
│  │  │ └─ open-chapter   │  │ └─ save-login     │  │                   │    │   │
│  │  └─────────┬─────────┘  └─────────┬─────────┘  └───────────────────┘    │   │
│  │            │                      │                                      │   │
│  └────────────┼──────────────────────┼──────────────────────────────────────┘   │
│               │                      │                                          │
│               ▼                      ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                          基础模块 (src/platforms/)                       │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐    │   │
│  │  │ baimeng/                                                        │    │   │
│  │  │ ├─ browser.js  ├─ auth.js     ├─ works.js    ├─ sidebar.js     │    │   │
│  │  │ ├─ content.js  ├─ copy.js     ├─ editor.js   ├─ modify-card.js │    │   │
│  │  │ └─ verify.js   └─ index.js                                         │    │   │
│  │  └─────────────────────────────────────────────────────────────────┘    │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐    │   │
│  │  │ coze/ (待创建)                                                   │    │   │
│  │  └─────────────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                          工具模块 (src/utils/)                           │   │
│  │  ├─ task-runner.js   ├─ helper.js    ├─ browser-manager.js             │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 二、模块依赖关系图

### 2.1 白梦写作模块依赖

```
                    ┌─────────────────┐
                    │   index.js      │  统一入口
                    │   (baimeng)     │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┬───────────────────┐
         │                   │                   │                   │
         ▼                   ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  browser.js │     │   auth.js   │     │  works.js   │     │ sidebar.js  │
│  启动浏览器  │     │  登录恢复   │     │  作品操作   │     │  章节导航   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
         │                   │                   │                   │
         │                   │                   │                   │
         ▼                   ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ content.js  │     │  copy.js    │     │ editor.js   │     │modify-card  │
│  内容获取   │     │  复制操作   │     │  编辑器操作  │     │  卡片操作   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                │                   │
                                                │                   │
                                                ▼                   ▼
                                         ┌─────────────┐
                                         │  verify.js  │
                                         │  验证逻辑   │
                                         └─────────────┘
```

### 2.2 模块功能说明

| 模块 | 功能 | 导出方法 | 依赖 |
|------|------|----------|------|
| `browser.js` | 浏览器启动 | `launch()`, `cleanLockFiles()` | - |
| `auth.js` | 登录恢复 | `restoreLogin()`, `checkLogin()` | config |
| `works.js` | 作品操作 | `getWorks()`, `findWorkId()` | - |
| `sidebar.js` | 侧边栏/章节 | `findChapter()`, `scrollToTop()` | helper |
| `content.js` | 内容获取 | `getContent()`, `scrollToBottom()` | - |
| `copy.js` | 复制操作 | `clickCopyButton()` | - |
| `editor.js` | 编辑器操作 | `clearContent()`, `getEditorContent()` | - |
| `modify-card.js` | 卡片操作 | `findCard()`, `replaceContent()` | - |
| `verify.js` | 验证逻辑 | `verifyChapterMatch()` | - |

---

## 三、任务脚本调用链

### 3.1 replace-content.js 调用链

```
replace-content.js (替换正文)
│
├─ Step 1: browser.launch()           → browser.js
│
├─ Step 2: auth.restoreLogin()        → auth.js
│
├─ Step 3: works.getWorks()           → works.js
│          works.findWorkId()
│
├─ Step 4: sidebar.findChapter()      → sidebar.js
│
├─ Step 5: verify.verifyChapterMatch() → verify.js
│
├─ Step 6: editor.clearContent()      → editor.js
│
├─ Step 7: modifyCard.replaceContent() → modify-card.js
│          ├─ hoverCard()
│          └─ clickReplace()
│
└─ Step 8: content.getContent()       → content.js
```

### 3.2 chapter-finder.js 调用链

```
chapter-finder.js (章节查找器)
│
├─ Mode 1: 列出作品
│   ├─ browser.launch()               → browser.js
│   ├─ auth.restoreLogin()            → auth.js
│   └─ works.getWorks()               → works.js
│
├─ Mode 2: 列出章节
│   ├─ browser.launch()               → browser.js
│   ├─ auth.restoreLogin()            → auth.js
│   ├─ works.getWorks()
│   ├─ works.findWorkId()
│   └─ sidebar.scrollToTop()          → sidebar.js
│
└─ Mode 3: 打开章节
    ├─ browser.launch()               → browser.js
    ├─ auth.restoreLogin()            → auth.js
    ├─ works.getWorks()
    ├─ works.findWorkId()
    └─ sidebar.findChapter()          → sidebar.js
```

### 3.3 copy-chapter.js 调用链

```
copy-chapter.js (复制章节)
│
├─ browser.launch()                   → browser.js
│
├─ auth.restoreLogin()                → auth.js
│
├─ works.getWorks()                   → works.js
│   works.findWorkId()
│
├─ sidebar.findChapter()              → sidebar.js
│
├─ content.scrollToBottom()           → content.js
│
└─ copy.clickCopyButton()             → copy.js
```

### 3.4 open-chapter.js 调用链

```
open-chapter.js (打开章节)
│
├─ browser.launch()                   → browser.js
│
├─ auth.restoreLogin()                → auth.js
│
├─ works.getWorks()                   → works.js
│   works.findWorkId()
│
└─ sidebar.findChapter()              → sidebar.js
```

---

## 四、模块方法调用矩阵

| 任务脚本 | browser | auth | works | sidebar | content | copy | editor | modifyCard | verify |
|---------|:-------:|:----:|:-----:|:-------:|:-------:|:----:|:------:|:----------:|:------:|
| replace-content | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ | ✓ | ✓ |
| chapter-finder | ✓ | ✓ | ✓ | ✓ | | | | | |
| copy-chapter | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| open-chapter | ✓ | ✓ | ✓ | ✓ | | | | | |

---

## 五、数据流向图

### 5.1 替换正文数据流

```
用户输入: node replace-content.js 66
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ numToChinese(66) → "第六十六章"                              │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ browser.launch() → { browser, page }                        │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ auth.restoreLogin() → 恢复登录状态                          │
│   - 读取: cookies-accounts/baimeng-account-1-full.json     │
│   - 设置: localStorage + cookies                           │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ works.getWorks() → [{ id, title, ... }]                    │
│ works.findWorkId(works, title) → "c4cea052-..."            │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ page.goto(EDITOR_URL?id=xxx) → 进入编辑器                   │
│ sidebar.findChapter("第六十六章") → 点击章节                │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ verify.verifyChapterMatch() → { match, warning }           │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ editor.clearContent() → 清空编辑器                          │
│ modifyCard.replaceContent() → 替换正文                      │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ content.getContent() → "新内容..."                          │
│ 输出: 内容长度, 截图                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 六、文件路径速查

### 6.1 模块文件

```
src/platforms/baimeng/
├── index.js          # 统一入口
├── auth.js           # 登录恢复
├── browser.js        # 浏览器启动
├── works.js          # 作品操作
├── sidebar.js        # 章节导航
├── content.js        # 内容获取
├── copy.js           # 复制操作
├── editor.js         # 编辑器操作
├── modify-card.js    # 卡片操作
└── verify.js         # 验证逻辑
```

### 6.2 任务脚本

```
tasks/baimeng/
├── replace-content.js      # 替换正文 ⭐⭐⭐⭐
├── baimeng-chapter-finder.js # 章节查找 ⭐⭐⭐
├── baimeng-copy.js         # 复制章节 ⭐⭐⭐
└── open-chapter.js         # 打开章节 ⭐⭐

tasks/coze/
├── open-coze.js            # 打开主站 ⭐
├── coze-programming.js     # 扣子编程 ⭐⭐
├── coze-project-manage.js  # 项目管理 ⭐⭐⭐
└── save-coze-login.js      # 保存登录 ⭐⭐
```

### 6.3 配置和数据文件

```
src/config.js               # 统一配置
storage/accounts/baimeng/   # 账号数据
cookies-accounts/           # 登录备份
browser/                    # 浏览器数据
```
