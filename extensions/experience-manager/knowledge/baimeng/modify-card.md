# 白梦写作 - 修改内容卡片操作

## 一、功能概述

**修改内容卡片**是 AI 对话区域中的重要组件，用于展示 AI 生成/修改的内容。

### 界面结构

```
┌─────────────────────────────────────────────────────────┐
│  修改内容                              2116字  ▼        │  ← 标题栏
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ### 第六十六章                                         │
│  ### 第六十六章: 关于那件军服的尺寸问题                  │
│                                                         │
│  在文子奇迹般地苏醒，并用一种近乎自残的方式...           │
│                                                         │
│  [悬停后显示]                                           │
│  ┌─────────────┐ ┌─────────────┐                        │
│  │ ✓ 替换正文  │ │   复制      │                        │
│  └─────────────┘ └─────────────┘                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 二、按钮功能

### 2.1 替换正文 ⭐

**功能**：将当前打开章节的内容**完全替换**为"修改内容"框里的内容

**⚠️ 核心约束：章节必须对应！**
```
✅ 正确：打开第六十六章 → 替换第六十六章的内容
❌ 错误：打开第六十六章 → 替换第六十七章的内容
```

**⚠️ 重要**：替换正文操作会**完全覆盖**原章节内容，不可恢复！

**完整操作流程**：
```
1. 打开目标章节（如第六十六章）
2. 【验证】确认侧边栏高亮章节 = 目标章节
3. 【验证】确认"修改内容"卡片标题包含目标章节号
4. 删除编辑器中的原内容
5. 悬停"修改内容"卡片
6. 点击"替换正文"按钮
7. 验证替换结果
```

**代码实现**：
```javascript
// Step 1: 删除编辑器内容
const deleteResult = await page.evaluate(() => {
  const editor = document.querySelector('.ProseMirror') || 
                 document.querySelector('.Daydream') ||
                 document.querySelector('[contenteditable="true"]');
  
  if (!editor) return { success: false, error: '未找到编辑器' };
  
  editor.focus();
  
  // 全选并删除
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editor);
  selection.removeAllRanges();
  selection.addRange(range);
  document.execCommand('delete');
  
  return { success: true };
});

// Step 2: 悬停卡片显示按钮
await page.evaluate(() => {
  const allElements = document.querySelectorAll('*');
  for (const el of allElements) {
    const text = el.innerText || '';
    // 匹配 "修改内容 XXX字" 格式
    if (text.match(/修改内容.*\d+字/) && text.length < 500) {
      el.dispatchEvent(new MouseEvent('mouseenter', { 
        bubbles: true, 
        cancelable: true, 
        view: window 
      }));
      break;
    }
  }
});

await page.waitForTimeout(500);

// Step 3: 点击替换正文按钮
const clicked = await page.evaluate(() => {
  const buttons = document.querySelectorAll('button, [role="button"]');
  for (const btn of buttons) {
    const text = btn.innerText || '';
    if (text.includes('替换') && (text.includes('正文') || text.length < 10)) {
      btn.click();
      return { success: true, text: text };
    }
  }
  return { success: false };
});
```

**已验证结果**（第六十六章）：
- ✅ 操作成功
- ✅ 新内容长度: 2199 字符
- ✅ 截图: `/tmp/replace-ch66.png`

### 2.2 复制

**功能**：将"修改内容"框里的内容复制到剪贴板

**操作流程**：
1. 在"修改内容"卡片上悬停
2. 点击"复制"按钮
3. 内容复制到剪贴板
4. 可粘贴到其他地方

### 2.3 展开/折叠

**功能**：展开查看完整内容或折叠节省空间

**位置**：标题栏右侧的下拉箭头 `▼`

**操作**：
- 点击 `▼` 展开/折叠
- 展开后可查看完整内容
- 折叠后只显示标题和字数

---

## 三、悬停触发

**关键点**：按钮在**悬停时才显示**！

```javascript
// 模拟悬停
const card = await page.$('[包含"修改内容"的选择器]');
await card.hover();
await page.waitForTimeout(500);

// 此时按钮应该可见
const replaceBtn = await page.$('button:has-text("替换正文")');
const copyBtn = await page.$('button:has-text("复制")');
```

---

## 四、代码实现

### 4.1 查找修改内容卡片

```javascript
// 查找包含"修改内容"和字数的卡片
const card = await page.evaluateHandle(() => {
  const elements = document.querySelectorAll('*');
  for (const el of elements) {
    const text = el.innerText || '';
    if (text.match(/修改内容.*\d+字/s)) {
      return el;
    }
  }
  return null;
});
```

### 4.2 悬停并点击按钮

```javascript
// 悬停
await card.hover();
await page.waitForTimeout(500);

// 点击替换正文
await page.click('button:has-text("替换正文")');

// 或点击复制
await page.click('button:has-text("复制")');
```

### 4.3 展开卡片

```javascript
// 点击展开按钮（下拉箭头）
const expandBtn = await card.$('[class*="arrow"], [class*="expand"]');
await expandBtn.click();
```

---

## 五、使用场景

| 场景 | 操作 |
|------|------|
| AI 续写后替换章节 | 悬停 → 点击"替换正文" |
| 复制 AI 生成内容 | 悬停 → 点击"复制" |
| 查看完整修改内容 | 点击展开按钮 |
| 对比原内容和修改内容 | 展开卡片查看 |

---

## 六、注意事项

1. **替换不可逆**：替换正文会覆盖原内容，请谨慎操作
2. **悬停触发**：按钮需要悬停才显示，自动化时需要模拟悬停
3. **内容长度**：展开后可查看完整内容，注意卡片高度变化
