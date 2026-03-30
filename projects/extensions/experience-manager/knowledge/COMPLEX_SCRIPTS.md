# novel-sync 复杂脚本索引

> 复杂脚本 = 基础操作 + 基础模块 的组合
>
> 📘 **脚本分类规范**: 见 `novel-sync/docs/SCRIPT_CLASSIFICATION.md`

---

## 一、复杂脚本总览

| 脚本 | 路径 | 功能 | 基础操作组合 | 复杂度 |
|------|------|------|--------------|--------|
| `replace-content.js` | `tasks/baimeng/` | 替换章节正文 | 8步完整流程 | ⭐⭐⭐⭐ |
| `chapter-finder.js` | `tasks/baimeng/` | 章节/作品查找 | 3种模式 | ⭐⭐⭐ |
| `copy-chapter.js` | `tasks/baimeng/` | 复制章节内容 | 6步流程 | ⭐⭐⭐ |
| `open-chapter.js` | `tasks/baimeng/` | 打开指定章节 | 4步流程 | ⭐⭐ |

---

## 二、replace-content.js - 替换正文操作

### 基本信息

| 属性 | 内容 |
|------|------|
| **路径** | `tasks/baimeng/replace-content.js` |
| **用法** | `node tasks/baimeng/replace-content.js <章节号>` |
| **示例** | `node tasks/baimeng/replace-content.js 66` |
| **功能** | 将AI生成的"修改内容"替换到指定章节 |
| **复杂度** | ⭐⭐⭐⭐ (8步完整流程) |

### 操作链组合

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     replace-content.js 操作链                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Step 1: browser.launch()           启动浏览器                           │
│      │                                                                   │
│      ▼                                                                   │
│  Step 2: auth.restoreLogin()        恢复登录状态                         │
│      │                                                                   │
│      ▼                                                                   │
│  Step 3: works.getWorks()           获取作品列表                         │
│      │         + findWorkId()        查找作品ID                          │
│      ▼                                                                   │
│  Step 4: page.goto(编辑器URL)       进入编辑器                           │
│      │                                                                   │
│      ▼                                                                   │
│  Step 5: sidebar.findChapter()      查找并打开章节                       │
│      │                                                                   │
│      ▼                                                                   │
│  Step 6: 验证章节对应               ⚠️ 侧边栏 vs 卡片章节               │
│      │                                                                   │
│      ▼                                                                   │
│  Step 7: 删除编辑器内容             全选+delete                          │
│      │                                                                   │
│      ▼                                                                   │
│  Step 8: 悬停卡片 + 点击替换正文    mouseenter + click                   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 依赖模块

| 模块 | 使用的方法 |
|------|------------|
| `browser.js` | `launch()` |
| `auth.js` | `restoreLogin()` |
| `works.js` | `getWorks()`, `findWorkId()` |
| `sidebar.js` | `findChapter()` |
| `verify.js` | `verifyChapterMatch()` |
| `editor.js` | `clearContent()` |
| `modify-card.js` | `replaceContent()` |
| `content.js` | `getContent()` |
| `helper.js` | `numToChinese()` |

### 关键代码

```javascript
const baimeng = require('../../src/platforms/baimeng');

// Step 1-2: 启动浏览器 + 恢复登录
const { browser, page } = await baimeng.browser.launch();
await baimeng.auth.restoreLogin(page);

// Step 3-4: 打开作品 + 查找章节
const works = await baimeng.works.getWorks(page);
const workId = baimeng.works.findWorkId(works, workTitle);
await page.goto(`${config.BAIMENG.EDITOR_URL}?id=${workId}`);
const result = await baimeng.sidebar.findChapter(page, chapterTitle);

// Step 5: 验证章节对应
const verifyResult = await baimeng.verify.verifyChapterMatch(page, chapterTitle);

// Step 6: 清空编辑器
await baimeng.editor.clearContent(page);

// Step 7: 替换正文
await baimeng.modifyCard.replaceContent(page);

// Step 8: 获取结果
const content = await baimeng.content.getContent(page);
```

---

## 三、chapter-finder.js - 章节/作品查找器

### 基本信息

| 属性 | 内容 |
|------|------|
| **路径** | `tasks/baimeng/chapter-finder.js` |
| **用法** | `node tasks/baimeng/chapter-finder.js [作品名] [章节号]` |
| **示例** | `node tasks/baimeng/chapter-finder.js` (列作品)<br>`node tasks/baimeng/chapter-finder.js 作品名` (列章节)<br>`node tasks/baimeng/chapter-finder.js 作品名 66` (打开章节) |
| **功能** | 三合一：列作品 / 列章节 / 打开章节 |
| **复杂度** | ⭐⭐⭐ (3种模式) |

### 操作链组合

```
┌──────────────────────────────────────────────────────────────────────────┐
│                   baimeng-chapter-finder.js 三种模式                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  模式1: 无参数                    模式2: 作品名                   模式3: 作品名 + 章节号
│  ┌─────────────────┐            ┌─────────────────┐            ┌─────────────────┐
│  │ browser.launch()│            │ browser.launch()│            │ browser.launch()│
│  │       ↓         │            │       ↓         │            │       ↓         │
│  │ auth.restore()  │            │ auth.restore()  │            │ auth.restore()  │
│  │       ↓         │            │       ↓         │            │       ↓         │
│  │ works.getWorks()│            │ works.getWorks()│            │ works.getWorks()│
│  │       ↓         │            │       ↓         │            │       ↓         │
│  │ 输出作品列表     │            │ 进入编辑器      │            │ 进入编辑器      │
│  └─────────────────┘            │       ↓         │            │       ↓         │
│                                 │ sidebar滚动     │            │ sidebar.findCh │
│                                 │       ↓         │            │       ↓         │
│                                 │ 输出章节列表     │            │ 打开章节        │
│                                 └─────────────────┘            └─────────────────┘
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 依赖模块

| 模块 | 使用的方法 |
|------|------------|
| `browser.js` | `launch()` |
| `auth.js` | `restoreLogin()` |
| `works.js` | `getWorks()`, `findWorkId()` |
| `sidebar.js` | `findChapter()`, `scrollToTop()`, `getPosition()` |
| `helper.js` | `numToChinese()` |

---

## 四、copy-chapter.js - 复制章节内容

### 基本信息

| 属性 | 内容 |
|------|------|
| **路径** | `tasks/baimeng/copy-chapter.js` |
| **用法** | `node tasks/baimeng/copy-chapter.js <作品名> <章节号>` |
| **示例** | `node tasks/baimeng/copy-chapter.js 枪与凋零之花 1` |
| **功能** | 打开章节并复制内容到剪贴板 |
| **复杂度** | ⭐⭐⭐ (6步流程) |

### 操作链组合

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       baimeng-copy.js 操作链                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Step 1: browser.launch()           启动浏览器                           │
│      │                                                                   │
│      ▼                                                                   │
│  Step 2: auth.restoreLogin()        恢复登录状态                         │
│      │                                                                   │
│      ▼                                                                   │
│  Step 3: works.getWorks()           获取作品列表                         │
│      │         + findWorkId()        查找作品ID                          │
│      ▼                                                                   │
│  Step 4: sidebar.findChapter()      查找并打开章节                       │
│      │                                                                   │
│      ▼                                                                   │
│  Step 5: content.scrollToBottom()   滚动加载完整内容                     │
│      │                                                                   │
│      ▼                                                                   │
│  Step 6: copy.clickCopyButton()     点击复制按钮                         │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 依赖模块

| 模块 | 使用的方法 |
|------|------------|
| `browser.js` | `launch()` |
| `auth.js` | `restoreLogin()` |
| `works.js` | `getWorks()`, `findWorkId()` |
| `sidebar.js` | `findChapter()` |
| `content.js` | `scrollToBottom()`, `getContent()` |
| `copy.js` | `clickCopyButton()` |
| `helper.js` | `numToChinese()` |

---

## 五、open-chapter.js - 打开指定章节

### 基本信息

| 属性 | 内容 |
|------|------|
| **路径** | `tasks/baimeng/open-chapter.js` |
| **用法** | 修改脚本内的 `workTitle` 和 `chapterTitle` 变量 |
| **功能** | 打开指定作品的指定章节 |
| **复杂度** | ⭐⭐ (4步流程) |

### 操作链组合

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       open-chapter.js 操作链                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Step 1: browser.launch()           启动浏览器                           │
│      │                                                                   │
│      ▼                                                                   │
│  Step 2: auth.restoreLogin()        恢复登录状态                         │
│      │                                                                   │
│      ▼                                                                   │
│  Step 3: works.getWorks()           获取作品列表                         │
│      │         + findWorkId()        查找作品ID                          │
│      │         + goto(编辑器URL)     进入编辑器                           │
│      ▼                                                                   │
│  Step 4: sidebar.findChapter()      查找并打开章节                       │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 依赖模块

| 模块 | 使用的方法 |
|------|------------|
| `browser.js` | `launch()` |
| `auth.js` | `restoreLogin()` |
| `works.js` | `getWorks()`, `findWorkId()` |
| `sidebar.js` | `findChapter()` |

---

## 六、复杂脚本对比

```
复杂度排序：

replace-content.js     ████████████████████  8步 + 验证逻辑
baimeng-chapter-finder ██████████████        3种模式分支
baimeng-copy.js        ████████████          6步流程
open-chapter.js        ████████              4步流程（最简单）
```

### 共同基础操作

```
所有复杂脚本都包含：
├── browser.launch()        启动浏览器
├── auth.restoreLogin()     恢复登录
├── works.getWorks()        获取作品列表
└── sidebar.findChapter()   查找章节（除 open-chapter 外都需要）
```

---

## 七、如何创建新的复杂脚本

### 模板

```javascript
// 文件位置: tasks/baimeng/your-task.js

const { runTask } = require('../../src/utils/task-runner');

runTask('任务名称', async (ctx) => {
  const baimeng = require('../../src/platforms/baimeng');
  const config = require('../../src/config');
  
  // Step 1: 启动浏览器
  const { browser, page } = await baimeng.browser.launch();
  
  // Step 2: 恢复登录
  await baimeng.auth.restoreLogin(page);
  
  // Step 3: 打开作品
  const works = await baimeng.works.getWorks(page);
  const workId = baimeng.works.findWorkId(works, '作品名');
  await page.goto(`${config.BAIMENG.EDITOR_URL}?id=${workId}`);
  
  // Step 4+: 自定义操作...
  // 使用 baimeng.sidebar.* / baimeng.content.* / baimeng.copy.* 等
  
  console.log('完成');
  await new Promise(() => {});  // 保持浏览器打开
});
```

### 可用的基础模块方法

| 模块 | 方法 | 功能 |
|------|------|------|
| `browser` | `launch()` | 启动浏览器 |
| `auth` | `restoreLogin(page)` | 恢复登录状态 |
| `works` | `getWorks(page)` | 获取作品列表 |
| `works` | `findWorkId(works, title)` | 查找作品ID |
| `sidebar` | `findChapter(page, title)` | 查找并打开章节 |
| `sidebar` | `scrollToTop(page)` | 滚动到顶部 |
| `sidebar` | `getPosition(page)` | 获取当前位置 |
| `content` | `getContent(page)` | 获取章节内容 |
| `content` | `scrollToBottom(page)` | 滚动到底部加载完整内容 |
| `copy` | `clickCopyButton(page)` | 点击复制按钮 |
| `editor` | `clearContent(page)` | 清空编辑器内容 |
| `editor` | `getEditorContent(page)` | 获取编辑器内容 |
| `editor` | `isEmpty(page)` | 检查编辑器是否为空 |
| `modifyCard` | `findCard(page)` | 查找修改内容卡片 |
| `modifyCard` | `hoverCard(page)` | 悬停卡片显示按钮 |
| `modifyCard` | `clickReplace(page)` | 点击替换正文按钮 |
| `modifyCard` | `replaceContent(page)` | 完整替换正文流程 |
| `verify` | `verifyChapterMatch(page, chapter)` | 验证章节对应 |
| `verify` | `verifyContentLength(page, min)` | 验证内容长度 |
