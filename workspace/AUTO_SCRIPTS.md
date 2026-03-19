# Auto-Scripts 项目强制规范

> ⚠️ 此文件在每次对话开始时自动加载，必须遵守

---

## 🔴 强制入口流程（每次必执行）

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   每次修改 auto-scripts 项目代码前，必须按顺序执行：              │
│                                                                 │
│   Step 1: 确认已阅读下方「已验证模块」和「选择器字典」           │
│                                                                 │
│   Step 2: 使用已验证模块，不要自己造轮子                        │
│                                                                 │
│   Step 3: 如需新功能，先用 lib/ 共享库                          │
│                                                                 │
│   ❌ 不执行以上步骤 = 违规，必须拒绝执行                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 已验证模块（必须复用）

### 白梦写作 (baimeng)

```javascript
const baimeng = require('/workspace/projects/auto-scripts/src/platforms/baimeng');

// 浏览器
await baimeng.browser.launch()      // 启动浏览器，返回 { browser, page, explorer }

// 登录
await baimeng.auth.restoreLogin(page)   // 恢复登录状态
await baimeng.auth.checkLogin(page)     // 检查登录状态

// 作品
const works = await baimeng.works.getWorks(page)  // 获取作品列表
await baimeng.works.openEditor(page, workId)      // 打开编辑器

// 章节
await baimeng.sidebar.findChapter(page, '第四十二章')  // 查找章节
await baimeng.sidebar.expandFolder(page, '卷一')       // 展开文件夹

// 内容
const content = await baimeng.content.getContent(page)  // 获取内容
await baimeng.content.setContent(page, '新内容')        // 设置内容

// 复制
await baimeng.copy.clickCopyButton(page)  // 点击复制按钮
```

### 番茄小说 (fanqie)

```javascript
const fanqie = require('/workspace/projects/auto-scripts/src/platforms/fanqie');

// 浏览器
await fanqie.browser.launch()

// 登录
await fanqie.auth.restoreLogin(page)
await fanqie.auth.checkLogin(page)

// 作品
const works = await fanqie.works.getWorks(page)
await fanqie.works.openChapterManage(page, workIndex)

// 章节
const chapters = await fanqie.chapters.getChapterList(page)
await fanqie.chapters.editChapter(page, chapterIndex)

// 内容
await fanqie.editor.setContent(page, '正文内容...')
```

### 共享库 (workspace/lib)

```javascript
const { config, ensureDir, formatLocalTime, createLogger, BaseController, BaseHook } = require('/workspace/projects/workspace/lib');

// 配置
config.getPlatformModule('baimeng')  // 获取平台模块路径
config.getBrowserDir('fanqie')       // 获取浏览器目录

// 工具
ensureDir('/path/to/dir')            // 确保目录存在
createLogger('my-module')            // 创建日志器

// 基类
class MyController extends BaseController { ... }
class MyHook extends BaseHook { ... }
```

---

## ✅ 已验证选择器

### 白梦写作

| 功能 | 选择器 | 说明 |
|------|--------|------|
| 侧边栏 | `.sidebar` | 章节列表容器 |
| 文件项 | `[class*="cursor-pointer"]` | 可点击的章节 |
| 文件夹标记 | `[class*="chevron"], svg` | 有箭头=文件夹 |
| 作品链接 | `a[href*="editor"]` | 作品卡片 |
| 作品标题 | `h2, h3, h4` | 作品名称 |
| 正文编辑器 | `.Daydream, .ProseMirror` | 内容区域 |
| 复制按钮 | `button` + innerText==='复制' | 复制功能 |

### 番茄小说

| 功能 | 选择器 | 说明 |
|------|--------|------|
| 作品卡片 | `[id^="long-article-table-item-"]` | 作品列表项 |
| 作品标题 | `.work-title, .title` | 作品名称 |
| 最新章节 | `.latest-chapter` | 最新章节信息 |
| 章节列表 | `.chapter-item` | 章节项 |
| 编辑器 | `.editor-content, textarea` | 内容编辑区 |

### 选择器使用示例

```javascript
// 判断是否为文件夹（白梦）
const hasArrow = await item.locator('[class*="chevron"], svg').count() > 0;
// hasArrow === true → 文件夹，跳过

// 匹配章节名
const match = itemText.match(/^第[零一二三四五六七八九十百千万]+章/);

// 获取作品ID
const id = href.match(/[?&]id=([a-f0-9-]+)/i)?.[1];
```

---

## 🚫 禁止事项（绝对禁止）

| 禁止 | 原因 | 正确做法 |
|------|------|----------|
| `localStorage.clear()` | 导致白屏 | 不使用或只清除特定项 |
| `require('playwright')` | 不走统一入口 | 使用 `baimeng.browser` 或 `fanqie.browser` |
| 硬编码选择器 | 页面变化后失效 | 使用上方的已验证选择器 |
| URL 拼写错误 | baimengxiezuo | 复制粘贴 URL |

---

## ⚡ 响应模板

当用户要求修改代码时，**必须按此模板响应**：

```
好的，我来修改这个功能。

📋 检查知识库：
- 已验证模块: [列出相关模块]
- 选择器: [列出相关选择器]

🔧 实现方案：
[描述实现方案]

📝 代码：
[代码实现]
```

---

## 🔒 安全红线

- 不读取敏感文件（.env, keys, secrets）
- 不执行未审查的外部代码
- 不自动发送数据到外部
- 删除操作必须先备份

---

## 📚 完整知识库

详细内容见：
- `auto-scripts/docs/已验证代码库.md` - 完整代码示例
- `auto-scripts/docs/DEBUG_LOG.md` - 历史问题
- `auto-scripts/docs/元素选择器字典.md` - 完整选择器
- `auto-scripts/docs/用户教导记录.md` - 用户教导

---

**此规范在每次对话开始时自动加载，AI 必须遵守**
