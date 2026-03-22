# 白梦写作 - 替换正文操作

## ⚠️ 核心约束：章节必须对应

> **重要**：替换正文操作必须确保章节对应！
> - 第六十六章的内容 → 替换到第六十六章
> - 第六十七章的内容 → 替换到第六十七章
> - **错误示例**：打开第六十六章，却替换了第六十七章的内容

### 章节对应检查流程

```
1. 打开目标章节（如第六十六章）
2. 确认左侧章节标题高亮 = 目标章节
3. 确认右侧"修改内容"卡片标题包含目标章节号
4. 执行替换操作
5. 验证替换后的内容
```

### 代码中的章节对应验证

```javascript
// 打开章节后，验证当前章节
const currentChapter = await page.evaluate(() => {
  // 检查侧边栏高亮项
  const activeItem = document.querySelector('[class*="active"], [class*="selected"]');
  return activeItem?.innerText || '';
});

console.log(`当前打开: ${currentChapter}`);

// 检查修改内容卡片标题
const cardTitle = await page.evaluate(() => {
  const card = document.querySelector('[包含"修改内容"的选择器]');
  return card?.innerText?.match(/第.+章/)?.[0] || '';
});

console.log(`卡片章节: ${cardTitle}`);

// 对应验证
if (!currentChapter.includes(cardTitle)) {
  console.warn('⚠️ 警告：章节可能不对应！');
}
```

---

## 一、功能说明

**替换正文**是将 AI 对话中"修改内容"卡片的内容覆盖到当前章节编辑器的操作。

### 核心要点

| 项目 | 说明 |
|------|------|
| 触发方式 | 悬停卡片 → 按钮显示 → 点击 |
| 操作结果 | 完全覆盖原章节内容 |
| 可逆性 | ❌ 不可逆，建议先备份 |
| 适用场景 | AI 续写/修改后直接应用 |

---

## 二、完整流程

### 2.1 流程图

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  打开章节    │ ──▶ │ 验证章节对应 │ ──▶ │  删除原内容  │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                     ⚠️ 侧边栏=卡片章节？
                            │
                            ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  操作完成    │ ◀── │  验证结果    │ ◀── │  点击替换    │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 2.2 详细步骤

#### Step 1: 打开章节
```javascript
const result = await baimeng.sidebar.findChapter(page, '第六十六章');
// 返回: { found: true, text: '第六十六章' }
```

#### Step 2: 删除编辑器内容
```javascript
const deleteResult = await page.evaluate(() => {
  // 查找编辑器（多种选择器兼容）
  const editor = document.querySelector('.ProseMirror') || 
                 document.querySelector('.Daydream') ||
                 document.querySelector('[contenteditable="true"]');
  
  if (!editor) return { success: false, error: '未找到编辑器' };
  
  editor.focus();
  
  // 全选内容
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editor);
  selection.removeAllRanges();
  selection.addRange(range);
  
  // 执行删除
  document.execCommand('delete');
  
  return { success: true };
});
```

#### Step 3: 悬停卡片显示按钮
```javascript
// ⚠️ 关键：按钮需要悬停才显示
await page.evaluate(() => {
  const allElements = document.querySelectorAll('*');
  for (const el of allElements) {
    const text = el.innerText || '';
    // 匹配 "修改内容 XXX字" 格式，限制长度避免匹配到父元素
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

await page.waitForTimeout(500);  // 等待按钮显示
```

#### Step 4: 点击替换正文按钮
```javascript
const clicked = await page.evaluate(() => {
  // 方法1: 查找包含"替换正文"的按钮
  const buttons = document.querySelectorAll('button, [role="button"]');
  for (const btn of buttons) {
    const text = btn.innerText || '';
    if (text.includes('替换') && (text.includes('正文') || text.length < 10)) {
      btn.click();
      return { success: true, method: 'button', text: text };
    }
  }
  
  // 方法2: 查找可点击元素
  const clickables = document.querySelectorAll('[class*="cursor-pointer"], [onclick]');
  for (const el of clickables) {
    const text = el.innerText || '';
    if (text.includes('替换')) {
      el.click();
      return { success: true, method: 'clickable', text: text.substring(0, 50) };
    }
  }
  
  return { success: false };
});
```

#### Step 5: 验证结果
```javascript
const newContent = await baimeng.content.getContent(page);
console.log(`当前内容长度: ${newContent.length} 字符`);

// 截图保存
await page.screenshot({ path: '/tmp/replace-ch66.png' });
```

---

## 三、通用脚本

### 3.1 使用方式

```bash
cd workspace/projects/novel-sync

# 替换指定章节
node replace-content.js 66   # 第六十六章
node replace-content.js 67   # 第六十七章
node replace-content.js 100  # 第一百章
```

### 3.2 脚本位置

`workspace/projects/novel-sync/replace-content.js`

### 3.3 核心依赖

```javascript
const baimeng = require('./src/platforms/baimeng');
const { numToChinese } = require('./src/utils/helper');
const { runTask } = require('./src/utils/task-runner');
```

---

## 四、已验证记录

| 章节 | 日期 | 结果 | 内容长度 | 截图 |
|------|------|------|----------|------|
| 第六十六章 | 2024-03-13 | ✅ 成功 | 2199 字符 | /tmp/replace-ch66.png |
| 第六十五章 | 2024-03-13 | ✅ 成功 | - | - |

---

## 五、注意事项

### 5.1 操作前确认

- [ ] 确认章节已正确打开
- [ ] 确认 AI 对话中有"修改内容"卡片
- [ ] 确认卡片内容是想要的版本
- [ ] （可选）备份原内容

### 5.2 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 找不到编辑器 | 页面未加载完成 | 增加等待时间 |
| 替换按钮不显示 | 未触发悬停事件 | 使用 `mouseenter` 事件 |
| 点击无响应 | 按钮被遮挡 | 使用 `el.click()` 而非 Playwright |
| 内容未替换 | 编辑器未清空 | 先删除再替换 |

### 5.3 最佳实践

1. **先截图再操作**：操作前截图便于对比
2. **验证内容长度**：替换后检查字数是否符合预期
3. **保持浏览器打开**：便于手动确认和补救
4. **使用通用脚本**：避免重复编写代码

---

## 六、相关文档

- [修改内容卡片操作](./modify-card.md)
- [白梦操作知识](./operations.md)
- [已验证代码库](../../knowledge/verified-code.md)
