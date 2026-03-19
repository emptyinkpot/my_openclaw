# 白梦写作 - 操作知识

## 一、核心操作原则

### 1.1 滚动操作

**通用原则**：所有滚动操作必须**先点击获取焦点**！

```
步骤：点击区域 → 等待 300ms → 开始滚动
```

### 1.2 点击操作

**通用原则**：使用 JavaScript `el.click()` 而非 Playwright 点击

```javascript
// 推荐
await page.evaluate((selector) => {
  document.querySelector(selector).click();
}, selector);

// 不推荐（可能被拦截）
await page.click(selector);
```

---

## 二、侧边栏操作

### 2.1 获取焦点

```javascript
// 点击侧边栏中心获取焦点
const sidebar = await page.$('[class*="sidebar"]');
const box = await sidebar.boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForTimeout(300);
```

### 2.2 滚动查找章节

**支持多种格式**：
```javascript
// 用户输入支持以下格式：
// - 数字：1, 66, 100
// - 中文：第一章, 第六十六章
// - 阿拉伯：第1章, 第66章
// - 带标题：第一章：故事的开始, 第1章 故事的开始

// 使用方式
await baimeng.sidebar.findChapter(page, 1);        // 纯数字
await baimeng.sidebar.findChapter(page, '66');     // 字符串数字
await baimeng.sidebar.findChapter(page, '第一章'); // 中文
await baimeng.sidebar.findChapter(page, '第1章');  // 阿拉伯数字
```

**匹配逻辑**：
```javascript
// 慢速滚动加载完整内容
for (let i = 0; i < 50; i++) {
  const found = await page.evaluate((title) => {
    const items = document.querySelectorAll('[class*="cursor-pointer"]');
    for (const item of items) {
      const hasArrow = item.querySelector('[class*="chevron"], [class*="arrow"], svg');
      if (hasArrow) continue;  // 排除文件夹
      
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

### 2.3 章节识别

| 元素类型 | 特征 | 操作 |
|----------|------|------|
| 文件夹 | 带箭头图标 | 跳过 |
| 章节文件 | `cursor-pointer` + 无箭头 | 点击 |

---

## 三、主内容区操作

### 3.1 滚动加载内容

```javascript
// 点击主内容区获取焦点
const main = await page.$('[class*="main"]');
const box = await main.boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForTimeout(500);

// 滚动加载完整内容
for (let i = 0; i < 20; i++) {
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(100);
}
```

### 3.2 复制内容

```javascript
// 点击复制按钮
await page.evaluate(() => {
  const buttons = document.querySelectorAll('button');
  for (const btn of buttons) {
    if (btn.innerText.trim() === '复制') {
      btn.click();
      break;
    }
  }
});
```

---

## 四、AI 指令功能

### 4.1 界面结构

```
┌─────────────────────────────────────────────────────────┐
│  @关联内容  ?      添加文件  ?                           │
├─────────────────────────────────────────────────────────┤
│  总计: XXk字 (XX个片段) ^    ← 统计已关联内容            │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐│
│  │ 【文档名】...  ×  ▼        ← 切换关联的文档片段      ││
│  └─────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────┐│
│  │ 请输入指令，使用@可以快速关联内容    🎤  ✈️          ││
│  │                                     (语音) (发送)    ││
│  └─────────────────────────────────────────────────────┘│
│                                    专业模型             │
└─────────────────────────────────────────────────────────┘
```

### 4.2 输入指令

```javascript
// 1. 点击输入框
await page.click('[contenteditable="true"]');

// 2. 输入指令
await page.type('[contenteditable="true"]', '续写下一章');

// 3. 点击发送
await page.click('button:has-text("发送")');
```

---

## 五、对话区域操作

### 5.1 界面结构

```
┌─────────────────────────────────────────────────────────┐
│  对话 | 代写(测试) | 工作流 | 新建对话 | 历史记录        │
├─────────────────────────────────────────────────────────┤
│  用户指令: ...                                          │
│  AI回复: ...                                            │
│  ┌─────────────────────────────────────────────────────┐│
│  │ 修改内容                              XXX字  ▼     ││
│  │ ### 第XX章                                           ││
│  │ 章节正文...                                          ││
│  └─────────────────────────────────────────────────────┘│
│  ↑↓ 可滚动区域                                          │
├─────────────────────────────────────────────────────────┤
│  [输入框...]                              [发送]         │
└─────────────────────────────────────────────────────────┘
```

### 5.2 滚动对话历史

```javascript
// 1. 点击对话区域获取焦点
const dialogArea = await page.$('[class*="dialog"], [class*="message"]');
await dialogArea.click();
await page.waitForTimeout(300);

// 2. 滚动查看历史
await page.mouse.wheel(0, -300);  // 向上滚动（查看更早的消息）
await page.mouse.wheel(0, 300);   // 向下滚动（查看更新的消息）
```

---

## 六、替换正文操作

### ⚠️ 核心约束：章节必须对应

```
✅ 正确：打开第六十六章 → 替换第六十六章
❌ 错误：打开第六十六章 → 替换其他章节
```

### 6.1 操作流程

```
打开章节 → 验证对应 → 删除原内容 → 悬停卡片 → 点击替换 → 验证结果
           ↑
      ⚠️ 关键步骤
```

### 6.2 关键代码

```javascript
// 删除编辑器内容
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

// 悬停显示按钮
await page.evaluate(() => {
  const elements = document.querySelectorAll('*');
  for (const el of elements) {
    if (el.innerText?.match(/修改内容.*\d+字/) && el.innerText.length < 500) {
      el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      break;
    }
  }
});

// 点击替换正文
await page.evaluate(() => {
  document.querySelectorAll('button').forEach(btn => {
    if (btn.innerText.includes('替换正文')) btn.click();
  });
});
```

### 6.3 通用脚本

```bash
node replace-content.js <章节号>
# 示例: node replace-content.js 66
```

---

## 七、操作速查表

| 操作 | 步骤 | 关键点 |
|------|------|--------|
| 滚动侧边栏 | 点击 → 滚轮 | **先点击获取焦点** |
| 查找章节 | 滚动 → 匹配文本 | 排除带箭头文件夹 |
| 打开章节 | JS 点击 | 使用 `el.click()` |
| 滚动内容 | 点击主区 → 滚轮 | **先点击获取焦点** |
| 复制内容 | 点击复制按钮 | 按钮文本"复制" |
| 输入 AI 指令 | 点击输入框 → 输入 → 发送 | 可用 @ 关联内容 |
| 滚动对话 | 点击对话区 → 滚轮 | **先点击获取焦点** |
| 替换正文 | 删除内容 → 悬停卡片 → 点击替换 | **会完全覆盖原内容** |
