# 已验证操作记录

> 记录已成功验证的自动化操作，供复用参考

---

## 一、替换正文操作

### ⚠️ 核心约束：章节必须对应

> **必须确保**：打开的章节 = 要替换的章节
> - 第六十六章的内容 → 替换到第六十六章
> - 第六十七章的内容 → 替换到第六十七章

### 操作描述
将 AI 对话中"修改内容"卡片的内容覆盖到当前章节编辑器。

### 验证记录

| 章节 | 日期 | 结果 | 内容长度 | 备注 |
|------|------|------|----------|------|
| 第六十五章 | 2024-03-13 | ✅ 成功 | - | 首次验证 |
| 第六十六章 | 2024-03-13 | ✅ 成功 | 2199 字符 | 截图保存 |

### 关键代码模式

```javascript
// 1. 删除编辑器内容
const deleteResult = await page.evaluate(() => {
  const editor = document.querySelector('.ProseMirror') || 
                 document.querySelector('[contenteditable="true"]');
  editor.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editor);
  selection.removeAllRanges();
  selection.addRange(range);
  document.execCommand('delete');
  return { success: true };
});

// 2. 悬停卡片显示按钮
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

// 3. 点击替换正文
await page.evaluate(() => {
  document.querySelectorAll('button').forEach(btn => {
    if (btn.innerText.includes('替换正文')) btn.click();
  });
});
```

### 脚本位置
`workspace/projects/novel-sync/replace-content.js`

### 使用方式
```bash
node replace-content.js <章节号>
```

---

## 二、章节查找操作

### 操作描述
在侧边栏滚动查找并点击指定章节。

### 验证记录

| 场景 | 结果 | 备注 |
|------|------|------|
| 可见章节 | ✅ 成功 | 直接点击 |
| 需滚动章节 | ✅ 成功 | 慢速滚动加载 |
| 文件夹内章节 | ✅ 成功 | 先展开文件夹 |

### 关键代码模式

```javascript
// 点击侧边栏获取焦点
const sidebar = await page.$('[class*="sidebar"]');
const box = await sidebar.boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForTimeout(300);

// 滚动查找章节
for (let i = 0; i < 50; i++) {
  const found = await page.evaluate((title) => {
    const items = document.querySelectorAll('[class*="cursor-pointer"]');
    for (const item of items) {
      if (item.querySelector('[class*="chevron"], [class*="arrow"], svg')) continue;
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

---

## 三、登录恢复操作

### 操作描述
从备份文件恢复登录状态。

### 验证记录

| 网站 | 方式 | 结果 | 备注 |
|------|------|------|------|
| 白梦写作 | localStorage | ✅ 成功 | 必须先访问首页 |
| 番茄小说 | Cookies | ✅ 成功 | - |
| **Coze 主站** | localStorage + cookies | ✅ 成功 | - |
| **Coze 扣子编程** | localStorage + cookies | ✅ 成功 | **必须先访问主站设置状态** |

### 关键代码模式

```javascript
// 白梦写作登录恢复
const backupFile = '/workspace/projects/cookies-accounts/baimeng-account-1-full.json';
const data = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));

// 先访问首页
await page.goto('https://baimeng.me', { timeout: 30000 });
await page.waitForTimeout(2000);

// 设置 localStorage
await page.evaluate((items) => {
  for (const [k, v] of Object.entries(items)) localStorage.setItem(k, v);
}, data.localStorage || {});

// 刷新页面
await page.reload();
await page.waitForTimeout(3000);
```

### ⭐ Coze 扣子编程登录恢复（特殊）

> **关键经验**：扣子编程 (code.coze.cn) 需要先在主站 (www.coze.cn) 设置登录状态！

```javascript
const backupFile = '/workspace/projects/cookies-accounts/coze-account-1-full.json';
const data = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));

// Step 1: 先访问主站设置登录状态
await page.goto('https://www.coze.cn/', { timeout: 30000 });
await page.waitForTimeout(2000);

// Step 2: 设置 localStorage
await page.evaluate((items) => {
  for (const [k, v] of Object.entries(items)) {
    try { localStorage.setItem(k, v); } catch (e) {}
  }
}, data.localStorage || {});

// Step 3: 设置 cookies
await context.addCookies(data.cookies);

// Step 4: 跳转到扣子编程
await page.goto('https://code.coze.cn/home', { timeout: 30000 });
await page.waitForTimeout(3000);
```

---

## 四、注意事项

1. **操作顺序**：必须先打开章节，再执行替换
2. **悬停触发**：按钮需要悬停才显示，使用 `mouseenter` 事件
3. **内容覆盖**：替换正文会完全覆盖原内容，不可逆
4. **焦点获取**：滚动操作前必须先点击区域获取焦点
