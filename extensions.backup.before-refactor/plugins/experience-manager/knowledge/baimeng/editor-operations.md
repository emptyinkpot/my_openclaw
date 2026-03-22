# 白梦写作 - 编辑器操作

## 一、页面结构

```
┌─────────────────────────────────────────────────────────────────┐
│  白梦写作 - 顶部导航栏                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────┐  ┌──────────────────────┐ │
│  │                                 │  │                      │ │
│  │   【大标题】第六十六章           │  │    侧边栏            │ │
│  │   (点击后变成input输入框)        │  │    章节列表          │ │
│  │                                 │  │                      │ │
│  │   ─────────────────────────     │  │    第六十六章 ←当前  │ │
│  │                                 │  │    第六十五章        │ │
│  │   【正文编辑区】                 │  │    第六十四章        │ │
│  │   .Daydream 编辑器              │  │    ...               │ │
│  │   contenteditable="true"        │  │                      │ │
│  │                                 │  │                      │ │
│  │   正文内容...                   │  │                      │ │
│  │                                 │  │                      │ │
│  └─────────────────────────────────┘  └──────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 二、模块架构

### 2.1 模块依赖

```
src/platforms/baimeng/
├── index.js           # 统一入口
├── browser.js         # 浏览器启动
├── auth.js            # 登录恢复
├── works.js           # 作品管理
├── sidebar.js         # 侧边栏操作
├── content.js         # 内容读取
├── editor.js          # 编辑器操作（标题、正文、保存）
├── copy.js            # 复制功能
├── modify-card.js     # 修改内容卡片
├── verify.js          # 验证模块
└── polish-result.js   # 润色结果处理
```

### 2.2 editor.js 模块 API

```javascript
const baimeng = require('./src/platforms/baimeng');

// ========== 正文操作 ==========

// 获取正文
const content = await baimeng.editor.getContent(page);

// 设置正文
await baimeng.editor.setContent(page, newContent);

// 清空正文
await baimeng.editor.clearContent(page);

// 聚焦编辑器
await baimeng.editor.focus(page);

// 检查是否为空
const empty = await baimeng.editor.isEmpty(page);

// ========== 标题操作 ==========

// 获取标题
const title = await baimeng.editor.getTitle(page);

// 修改标题
await baimeng.editor.setTitle(page, '第66章：新标题');

// ========== 保存操作 ==========

// 保存作品
await baimeng.editor.save(page);
```

### 2.3 polish-result.js 模块 API

```javascript
const baimeng = require('./src/platforms/baimeng');

// 清理正文（去除章节概要等）
const cleaned = baimeng.polishResult.cleanContent(content);

// 格式化标题
const title = baimeng.polishResult.formatTitle('关于军服', 66);
// 输出: "第66章：关于军服"

// 解析润色结果
const { title, content } = baimeng.polishResult.parsePolishResult(
  polishResult,
  { chapterNum: 66 }
);
```

## 三、使用示例

### 3.1 基础操作

```javascript
const { chromium } = require('playwright');
const baimeng = require('./src/platforms/baimeng');
const config = require('./src/config');

(async () => {
  // 启动浏览器
  const { browser, page } = await baimeng.browser.launch();
  
  // 恢复登录
  await baimeng.auth.restoreLogin(page);
  
  // 打开作品
  const works = await baimeng.works.getWorks(page);
  const workId = baimeng.works.findWorkId(works, '作品名');
  await page.goto(config.BAIMENG.urls.editor + '?id=' + workId);
  await page.waitForTimeout(5000);
  
  // 打开章节
  await baimeng.sidebar.findChapter(page, '第66章');
  await page.waitForTimeout(3000);
  
  // 获取内容
  const content = await baimeng.editor.getContent(page);
  const title = await baimeng.editor.getTitle(page);
  
  console.log('标题:', title);
  console.log('正文长度:', content.length);
  
  await browser.close();
})();
```

### 3.2 修改标题和正文

```javascript
// 修改标题
const titleResult = await baimeng.editor.setTitle(page, '第66章：新标题');
if (titleResult.success) {
  console.log('旧标题:', titleResult.oldTitle);
}

// 替换正文
await baimeng.editor.setContent(page, '新的正文内容...');

// 保存
const saveResult = await baimeng.editor.save(page);
if (saveResult.success) {
  console.log('保存成功');
}
```

### 3.3 完整润色流程

```javascript
// 使用流程脚本
node tasks/baimeng/polish-and-replace.js "作品名" 66

// 或手动调用各模块
const clipboard = require('lib/utils/clipboard');
const polish = require('./src/platforms/coze/polish');

// 1. 复制内容
const content = await baimeng.editor.getContent(page);
clipboard.write(content, 'latest', { namespace: 'polish' });

// 2. 润色
const result = await polish.polishFlow(page, {
  source: 'baimeng',
  work: '作品名',
  chapter: '第66章'
});

// 3. 解析结果
const { title, content } = baimeng.polishResult.parsePolishResult(result, { chapterNum: 66 });

// 4. 更新
await baimeng.editor.setTitle(page, title);
await baimeng.editor.setContent(page, content);
await baimeng.editor.save(page);
```

## 四、关键选择器

| 元素 | 选择器 | 说明 |
|------|--------|------|
| 正文编辑器 | `.Daydream` | contenteditable="true" |
| 标题输入框 | `input[type="text"]` | 点击大标题后出现 |
| 大标题 | 字体最大的包含"第X章"的元素 | 点击后变输入框 |
| 保存按钮 | `button` 包含"保存"文字 | 顶部导航栏 |

## 五、ProseMirror 编辑器特性

### 5.1 页面结构分析

```html
<div class="Daydream">
  <!-- 工具栏区域 -->
  <div class="toolbar">章节概要 | 批量生成 | ...</div>
  
  <!-- 正文区域（直接子元素 p 标签） -->
  <p>第一段内容...</p>
  <p>第二段内容...</p>
  <p>第三段内容...</p>
</div>
```

### 5.2 关键发现

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| getContent 包含"章节概要" | `.Daydream innerText` 包含所有子元素 | 只获取 `:scope > p` 直接子元素 |
| setContent 段落黏在一起 | 直接设置 innerHTML 没有分段 | 按双换行分割，每个段落一个 `<p>` |
| 段落内换行丢失 | 没有处理单换行 | 单换行转换为 `<br>` |

### 5.3 已验证代码

```javascript
// ✅ 获取正文（过滤工具栏）
async function getContent(page) {
  return page.evaluate(() => {
    const editor = document.querySelector('.Daydream');
    if (!editor) return '';
    
    // 🔴 关键：只获取直接子元素 p 标签
    const paragraphs = editor.querySelectorAll(':scope > p');
    return Array.from(paragraphs).map(p => p.innerText || '').join('\n\n');
  });
}

// ✅ 设置正文（正确分段）
async function setContent(page, content) {
  return page.evaluate((text) => {
    const editor = document.querySelector('.Daydream');
    if (!editor) return { success: false };
    
    // 清空现有内容
    editor.querySelectorAll(':scope > p').forEach(p => p.remove());
    
    // 🔴 关键：按双换行分割段落
    const paragraphs = text.split(/\n\n+/);
    
    for (const para of paragraphs) {
      if (!para.trim()) continue;
      
      const p = document.createElement('p');
      // 处理段落内的单个换行
      const lines = para.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) p.appendChild(document.createElement('br'));
        p.appendChild(document.createTextNode(lines[i]));
      }
      editor.appendChild(p);
    }
    
    return { success: true };
  }, content);
}
```

## 六、注意事项

1. **标题修改**：必须先点击大标题元素，等待 input 输入框出现
2. **正文编辑**：直接操作 `.Daydream` 的 DOM
3. **getContent 过滤**：使用 `:scope > p` 只获取正文，过滤工具栏
4. **setContent 分段**：按 `\n\n` 分割段落，每个段落一个 `<p>` 标签
5. **段落内换行**：单换行 `\n` 转换为 `<br>` 标签
3. **保存时机**：修改完成后立即保存
4. **等待时间**：每次操作后需要适当等待（500-2000ms）
5. **模块化**：使用 `baimeng.editor` 模块，避免直接操作 DOM
