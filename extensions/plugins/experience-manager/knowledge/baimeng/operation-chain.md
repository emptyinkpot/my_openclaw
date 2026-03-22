# 白梦写作 - 操作链

## 操作链总览

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  1. 登录恢复     │ ──▶ │  2. 打开作品     │ ──▶ │  3. 打开章节     │ ──▶ │  4. 章节操作     │
│  (入口)         │     │  (列表选择)      │     │  (侧边栏导航)    │     │  (目标)         │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │                       │
        ▼                       ▼                       ▼                       ▼
   URL: baimeng.me      点击作品卡片           侧边栏点击              编辑器/替换/复制
   设置登录状态         进入写作界面           滚动查找章节            AI指令交互
```

---

## 一、登录恢复

### 操作信息

| 要素 | 内容 |
|------|------|
| **操作名称** | 登录恢复 |
| **前置操作** | 无（入口操作） |
| **URL** | `https://baimeng.me` |
| **入口UI** | 直接访问URL |
| **页面UI** | 主页，顶部导航栏，作品列表 |
| **作用** | 恢复登录状态，为后续操作做准备 |
| **通往** | 作品列表、写作界面 |
| **验证方式** | localStorage 数量 > 0，页面显示用户头像/作品 |

### URL

```
https://baimeng.me
```

### 页面UI

```
┌─────────────────────────────────────────────────────────┐
│  [Logo] 白梦写作            [创作中心] [用户头像]         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   作品列表                                              │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│   │ 作品卡片1 │ │ 作品卡片2 │ │ 作品卡片3 │              │
│   │ 封面+标题 │ │ 封面+标题 │ │ 封面+标题 │              │
│   └──────────┘ └──────────┘ └──────────┘              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 关键代码

```javascript
const backupFile = '/workspace/projects/cookies-accounts/baimeng-account-1-full.json';
const data = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));

// 1. 访问首页
await page.goto('https://baimeng.me', { timeout: 30000 });
await page.waitForTimeout(2000);

// 2. 设置 localStorage（关键！）
await page.evaluate((items) => {
  for (const [k, v] of Object.entries(items)) {
    try { localStorage.setItem(k, v); } catch (e) {}
  }
}, data.localStorage || {});

// 3. 设置 cookies
await context.addCookies(data.cookies);

// 4. 刷新页面（关键！）
await page.reload();
await page.waitForTimeout(3000);
```

### 注意事项

- ⚠️ **必须先访问首页**，设置 localStorage 后刷新
- ⚠️ **禁止使用 localStorage.clear()**，直接覆盖设置
- 白梦写作使用 **localStorage 保存 token**，不是 Cookies
- 等待时间至少 2 秒确保设置生效

---

## 二、打开作品

### 操作信息

| 要素 | 内容 |
|------|------|
| **操作名称** | 打开作品 |
| **前置操作** | ⭐ 登录恢复 |
| **URL** | `https://baimeng.me/write/{作品ID}` |
| **入口UI** | 作品列表中的作品卡片 |
| **页面UI** | 左侧章节列表，中间编辑器，右侧AI对话 |
| **作用** | 进入作品写作界面 |
| **通往** | 章节编辑、AI对话 |
| **验证方式** | URL 变为 `/write/xxx`，侧边栏显示章节列表 |

### URL

```
https://baimeng.me/write/{作品ID}

示例：
https://baimeng.me/write/abc123
```

### 页面UI

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [← 返回] 作品标题                                     [发布] [设置]     │
├────────────────┬─────────────────────────────┬───────────────────────────┤
│                │                             │                           │
│  第一章        │                             │  AI 对话                  │
│  第二章        │        编辑器               │  ─────────────────────    │
│  第三章        │                             │  用户: ...                │
│  ...           │     [章节内容]              │  AI: ...                  │
│                │                             │                           │
│  [新建章节]    │                             │  ┌─────────────────────┐  │
│                │                             │  │ 修改内容  XXX字     │  │
│  侧边栏        │                             │  │ 章节正文...         │  │
│                │                             │  └─────────────────────┘  │
│                │                             │                           │
│                │                             │  [输入框...]  [发送]      │
├────────────────┴─────────────────────────────┴───────────────────────────┤
```

### 入口UI

```
作品列表页面：
┌──────────────┐
│   封面图片    │
│   作品标题    │  ← 点击打开作品
│   更新时间    │
└──────────────┘
```

### 关键代码

```javascript
// 方式1: 点击作品卡片
await page.click('[作品卡片选择器]');
await page.waitForTimeout(2000);

// 方式2: 直接跳转URL
await page.goto('https://baimeng.me/write/作品ID', { timeout: 30000 });
```

---

## 三、打开章节

### 操作信息

| 要素 | 内容 |
|------|------|
| **操作名称** | 打开章节 |
| **前置操作** | ⭐ 登录恢复 → ⭐ 打开作品 |
| **URL** | 同作品URL，章节内容在编辑器中显示 |
| **入口UI** | 侧边栏章节列表 |
| **页面UI** | 编辑器显示章节内容 |
| **作用** | 打开指定章节进行编辑或替换 |
| **通往** | 章节编辑、内容替换、AI续写 |
| **验证方式** | 侧边栏章节高亮，编辑器显示章节标题 |

### 章节查找支持格式

```
支持多种输入格式：
- 纯数字：1, 66, 100
- 中文数字：第一章, 第六十六章
- 阿拉伯数字：第1章, 第66章
- 带标题：第一章：故事的开始, 第1章 故事的开始
```

### 入口UI（侧边栏）

```
侧边栏结构：
├── 📁 卷一（文件夹，带箭头）
│   ├── 第一章（章节）
│   ├── 第二章（章节）
│   └── ...
├── 📁 卷二（文件夹，带箭头）
│   └── ...
└── [新建章节]

识别规则：
- 文件夹：带箭头/chevron图标 → 跳过
- 章节：cursor-pointer + 无箭头 → 点击
```

### 关键代码

```javascript
// 1. 点击侧边栏获取焦点（必须！）
const sidebar = await page.$('[class*="sidebar"]');
const box = await sidebar.boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForTimeout(300);

// 2. 滚动查找章节
for (let i = 0; i < 50; i++) {
  const found = await page.evaluate((title) => {
    const items = document.querySelectorAll('[class*="cursor-pointer"]');
    for (const item of items) {
      // 排除文件夹（带箭头图标）
      const hasArrow = item.querySelector('[class*="chevron"], [class*="arrow"], svg');
      if (hasArrow) continue;
      
      if (item.innerText.includes(title)) {
        item.click();
        return true;
      }
    }
    return false;
  }, chapterTitle);
  
  if (found) break;
  
  await page.mouse.wheel(0, 80);
  await page.waitForTimeout(80);
}
```

### 注意事项

- ⚠️ **滚动前必须点击获取焦点**
- 慢速滚动（80px/次）确保内容加载
- 文件夹需要先展开才能看到内部章节

---

## 四、章节操作

### 4.1 替换正文 ⭐

| 要素 | 内容 |
|------|------|
| **操作名称** | 替换正文 |
| **前置操作** | ⭐ 登录恢复 → ⭐ 打开作品 → ⭐ 打开章节 |
| **入口UI** | AI对话区域的"修改内容"卡片 |
| **作用** | 将AI生成的内容替换到当前章节 |
| **通往** | 无（终态操作） |
| **验证方式** | 编辑器内容变为新内容 |

**⚠️ 核心约束**：
```
必须确保：打开的章节 = 要替换的章节
✅ 第六十六章打开 → 替换第六十六章内容
❌ 第六十六章打开 → 替换第六十七章内容
```

**操作流程**：
```
1. 打开目标章节
2. 验证侧边栏高亮章节 = 目标章节
3. 验证"修改内容"卡片标题包含目标章节号
4. 删除编辑器中的原内容
5. 悬停"修改内容"卡片
6. 点击"替换正文"按钮
7. 验证替换结果
```

**关键代码**：
```javascript
// Step 1: 删除编辑器内容
await page.evaluate(() => {
  const editor = document.querySelector('.ProseMirror') || 
                 document.querySelector('[contenteditable="true"]');
  editor.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editor);
  selection.removeAllRanges();
  selection.addRange(range);
  document.execCommand('delete');
});

// Step 2: 悬停卡片显示按钮
await page.evaluate(() => {
  const elements = document.querySelectorAll('*');
  for (const el of elements) {
    if (el.innerText?.match(/修改内容.*\d+字/) && el.innerText.length < 500) {
      el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      break;
    }
  }
});
await page.waitForTimeout(500);

// Step 3: 点击替换正文
await page.evaluate(() => {
  document.querySelectorAll('button').forEach(btn => {
    if (btn.innerText.includes('替换正文')) btn.click();
  });
});
```

### 4.2 复制章节内容

| 要素 | 内容 |
|------|------|
| **操作名称** | 复制章节内容 |
| **前置操作** | ⭐ 登录恢复 → ⭐ 打开作品 → ⭐ 打开章节 |
| **入口UI** | 编辑器或AI对话区域 |
| **作用** | 复制章节内容到剪贴板 |
| **通往** | 可粘贴到其他地方 |

### 4.3 AI指令交互

| 要素 | 内容 |
|------|------|
| **操作名称** | 发送AI指令 |
| **前置操作** | ⭐ 登录恢复 → ⭐ 打开作品 |
| **入口UI** | 右侧AI对话区域输入框 |
| **作用** | 让AI续写、修改、分析内容 |
| **通往** | 获得AI生成的"修改内容"卡片 |

**输入框UI**：
```
┌─────────────────────────────────────────────────────────┐
│  @关联内容  ?      添加文件  ?                           │
├─────────────────────────────────────────────────────────┤
│  总计: XXk字 (XX个片段) ^                               │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐│
│  │ 请输入指令，使用@可以快速关联内容    🎤  ✈️          ││
│  └─────────────────────────────────────────────────────┘│
│                                    专业模型             │
└─────────────────────────────────────────────────────────┘
```

---

## 五、操作链速查表

| 操作 | 前置 | URL | 验证方式 |
|------|------|-----|----------|
| 登录恢复 | 无 | `baimeng.me` | localStorage > 0 |
| 打开作品 | 登录恢复 | `baimeng.me/write/{id}` | 侧边栏显示章节 |
| 打开章节 | 登录恢复+打开作品 | 同上 | 章节高亮 |
| 替换正文 | 打开章节 | 同上 | 编辑器内容更新 |
| AI指令 | 打开作品 | 同上 | AI返回结果 |

---

## 六、脚本文件

| 脚本 | 功能 |
|------|------|
| `baimeng.js` | 打开白梦写作并登录 |
| `open-work.js` | 打开作品 |
| `chapter-nav.js` | 章节导航 |
| `replace-content.js` | 替换正文 |
| `ai-interact.js` | AI指令交互 |

---

## 七、常见问题

### Q: 为什么必须先访问首页？

A: localStorage 需要在同源页面设置，首页设置后跳转其他页面才能保持。

### Q: 为什么不能用 localStorage.clear()？

A: 白梦写作在 localStorage 中存储了多个配置项，clear() 会删除所有配置导致页面异常。直接覆盖设置更安全。

### Q: 滚动查找章节为什么找不到？

A: 可能原因：
1. 未点击侧边栏获取焦点
2. 滚动速度太快，内容未加载
3. 章节在文件夹内，需要先展开

### Q: 替换正文按钮不显示？

A: 需要悬停"修改内容"卡片才能显示按钮，使用 `mouseenter` 事件触发。
