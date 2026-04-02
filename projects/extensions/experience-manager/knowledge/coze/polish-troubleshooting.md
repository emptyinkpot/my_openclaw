# 文本润色网站 - 常见问题排查

> ⚠️ **警告：重复的错误再犯你妈妈没有屁眼**

## 一、点击问题

### 1.1 点击方法过于复杂 ⚠️ 最常犯错

| 症状 | 原因 | 解决方案 |
|------|------|----------|
| 点击坐标偏移 | 用 mouse.click() 计算坐标 | 用 `page.click('选择器')` |
| 点击无响应 | dispatchEvent 模拟事件不触发 | 用 `page.click()` 直接点击 |
| 过度设计长按 | 用户说长按就搞复杂逻辑 | 普通点击即可 |
| **按钮怎么都点不到** | **方法复杂，坐标计算错误** | **❌ 禁止复杂方法，直接 `page.click()`** |

**🚨 关键经验（血的教训）**：
```javascript
// ❌ 错误！过度复杂，坐标计算错误
const box = await button.boundingBox();
await page.mouse.move(box.x + box.width/2, box.y + box.height/2);
await page.mouse.down();
await page.waitForTimeout(3000);
await page.mouse.up();

// ❌ 错误！dispatchEvent 可能不触发
await button.dispatchEvent('mousedown');
await page.waitForTimeout(3000);
await button.dispatchEvent('mouseup');

// ❌ 错误！没必要长按
await button.click({ delay: 3000 });

// ✅ 正确！简单直接一行搞定
await page.click('button:has-text("开始润色")');
```

### 1.2 选择器不精确

| 症状 | 原因 | 解决方案 |
|------|------|----------|
| 匹配到多个按钮 | `[class*="btn"]` 太宽泛 | 用 `button:has-text("开始润色")` |
| 点击错误按钮 | 按钮文字识别错误 | 先获取页面按钮列表确认 |
| 找不到按钮 | 没先分析页面元素 | `page.evaluate()` 获取元素信息 |

**✅ 正确流程**：
```javascript
// 1. 先分析页面有哪些按钮
const buttons = await page.evaluate(() => {
  const all = document.querySelectorAll('button');
  return Array.from(all).map(el => ({
    text: el.innerText?.trim(),
    visible: el.getBoundingClientRect().width > 0
  }));
});
console.log('按钮列表:', buttons);

// 2. 确认后直接点击
await page.click('button:has-text("开始润色")');
```

### 1.3 点击时机错误

| 症状 | 原因 | 解决方案 |
|------|------|----------|
| 点击无响应 | 按钮还没渲染出来 | `await page.waitForTimeout()` 等待 |
| 点击错误元素 | 页面未加载完成 | 先等待页面稳定 |
| 找不到按钮 | 页面还在跳转 | 等待 URL 稳定 |

---

## 二、文本输入问题

### 2.1 多个 textarea 问题 ⚠️ 最常见问题

| 症状 | 原因 | 解决方案 |
|------|------|----------|
| fill 超时 | 页面有多个 textarea，第一个不可见 | 使用 `:visible` 过滤 |
| 输入无效 | 操作了隐藏的 textarea | 只操作可见的输入框 |
| **找不到输入框** | **选择器匹配到隐藏元素** | **❌ 禁止直接用 `page.fill('textarea')`** |

**🚨 关键经验（血的教训）**：
```javascript
// ❌ 错误！可能操作到隐藏元素
await page.fill('textarea', content);

// ✅ 正确！只操作可见的
const textareas = await page.$$('textarea:visible');
for (const ta of textareas) {
  await ta.fill(content);
}
```

### 2.2 按钮文字识别错误

| 症状 | 原因 | 解决方案 |
|------|------|----------|
| 匹配不到按钮 | 识别成"开始消色" | 实际查看页面确认文字 |
| 选择器失败 | 用"润色"而非"开始润色" | 用完整按钮文字 |

---

## 三、进度条检测问题 ⚠️ 最常犯错

### 3.1 检测错误的进度条

| 症状 | 原因 | 解决方案 |
|------|------|----------|
| 进度没走完就提取 | 检测了静态百分比 | 检测"分段处理"文字 |
| 等太久或等不到 | 选择器匹配到错误元素 | 检测会动的进度条 |
| **一直等不到完成** | **检测了不会动的百分比** | **❌ 禁止检测静态百分比** |

**🚨 关键经验（血的教训）**：
```javascript
// ❌ 错误！静态百分比不是进度条，检测到会一直存在
const percent = await page.evaluate(() => {
  const body = document.body.innerText;
  const match = body.match(/\d+%/);
  return match ? match[0] : null;
});

// ❌ 错误！选择器可能匹配到静态元素
const progress = document.querySelector('[class*="progress"]');

// ✅ 正确！检测"分段处理"，这才是会动的进度条
let hasProgress = await page.evaluate(() => {
  const body = document.body.innerText;
  return body.includes('分段处理');
});

while (hasProgress) {
  await page.waitForTimeout(3000);
  hasProgress = await page.evaluate(() => {
    const body = document.body.innerText;
    return body.includes('分段处理');
  });
}
```

### 3.2 进度条还没出现就开始检测

| 症状 | 原因 | 解决方案 |
|------|------|----------|
| 检测不到进度条 | 点击后没等就检测 | 点击后等待 5 秒再检测 |

```javascript
// ✅ 正确流程
await page.click('button:has-text("开始润色")');
await page.waitForTimeout(5000);  // 等待进度条出现

// 然后再检测
let hasProgress = await page.evaluate(() => {
  return document.body.innerText.includes('分段处理');
});
```

---

## 四、结果提取问题

### 3.1 提取内容多余

| 症状 | 原因 | 解决方案 |
|------|------|----------|
| 结果包含"替换记录" | 没有过滤末尾内容 | 查找关键字截取 |
| 提取不完整 | 滚动位置问题 | 先滚动到底部 |

**✅ 正确提取**：
```javascript
let result = await page.$eval('.result-container', el => el.innerText);

// 去除"替换记录"部分
const idx = result.indexOf('替换记录');
if (idx > 0) {
  result = result.substring(0, idx).trim();
}
```

---

## 四、执行顺序问题

### 4.1 操作流程错误

| 症状 | 原因 | 解决方案 |
|------|------|----------|
| 粘贴失败 | 页面未加载完成 | 先等待页面稳定 |
| 点击无效 | 内容未输入完成 | 输入后等待再点击 |
| 提取失败 | 进度条未完成 | 等待进度条消失 |

**✅ 正确流程**：
```javascript
// 1. 打开页面
await page.goto('https://7d4jcknzqk.coze.site/');
await page.waitForTimeout(3000);

// 2. 粘贴内容
const textareas = await page.$$('textarea:visible');
for (const ta of textareas) {
  await ta.fill(content);
}

// 3. 等待后点击
await page.waitForTimeout(2000);
await page.click('button:has-text("开始润色")');

// 4. 等待进度条完成
await page.waitForSelector('.progress-bar', { state: 'hidden' });

// 5. 提取结果
const result = await page.$eval('.result', el => el.innerText);
```

---

## 五、调试技巧

### 5.1 分析页面元素

```javascript
// 获取所有可见按钮
const buttons = await page.evaluate(() => {
  const all = document.querySelectorAll('button');
  return Array.from(all).map(el => {
    const rect = el.getBoundingClientRect();
    return {
      text: el.innerText?.trim(),
      x: rect.x,
      y: rect.y,
      visible: rect.width > 0 && rect.height > 0
    };
  }).filter(b => b.visible);
});
console.log(JSON.stringify(buttons, null, 2));
```

### 5.2 截图确认

```javascript
// 截图调试
await page.screenshot({ path: '/tmp/debug.png', fullPage: true });
```

### 5.3 检查页面状态

```javascript
// 检查当前 URL
console.log('当前 URL:', page.url());

// 检查元素是否存在
const exists = await page.$('button:has-text("润色")') !== null;
console.log('按钮存在:', exists);
```

---

## 七、结果提取问题

### 7.1 没有滑动滚轮就读取

| 症状 | 原因 | 解决方案 |
|------|------|----------|
| 提取不到结果 | 结果在页面下方 | 先滚动到页面底部 |
| 提取的内容不对 | 没看到输出区域 | 滚动后再提取 |

**🚨 关键经验**：
```javascript
// ✅ 正确流程：先滚动，再提取
await page.evaluate(() => {
  window.scrollTo(0, document.body.scrollHeight);
});
await page.waitForTimeout(2000);

// 然后再提取结果
const result = await page.evaluate(() => {...});
```

### 7.2 标题和正文未分离 ⚠️ 常见问题

| 症状 | 原因 | 解决方案 |
|------|------|----------|
| 标题和正文混在一起 | 没有分别提取 | 使用独立的正则匹配 |
| 保存格式不对 | 只保存一个文件 | 分别保存标题和正文 |

**✅ 正确提取**：
```javascript
const result = await page.evaluate(() => {
  let title = '';
  let content = '';
  
  const bodyText = document.body.innerText;
  
  // 1. 提取标题 - 格式：第X章，XXX
  const titleMatch = bodyText.match(/第[一二三四五六七八九十百千]+章[，,，]?[^\n]{0,30}/);
  if (titleMatch) {
    title = titleMatch[0].trim();
  }
  
  // 2. 提取正文 - 在"输出结果"之后，"替换记录"之前
  const outputIdx = bodyText.indexOf('输出结果');
  const replaceIdx = bodyText.indexOf('替换记录');
  
  if (outputIdx > -1 && replaceIdx > outputIdx) {
    let rawContent = bodyText.substring(outputIdx, replaceIdx);
    const lines = rawContent.split('\n').filter(l => {
      const t = l.trim();
      return t && 
             !t.startsWith('输出结果') && 
             !t.match(/^\d+\s*字$/) &&
             t !== '复制' &&
             !t.includes('章节概要') &&      // 过滤垃圾内容
             !t.includes('归纳当前章节概要') && // 过滤垃圾内容
             !t.includes('批量生成概要');      // 过滤垃圾内容
    });
    content = lines.join('\n').trim();
  }
  
  return { title, content };
});

// 3. 分别保存标题和正文
fs.writeFileSync('title-latest.txt', result.title, 'utf-8');
fs.writeFileSync('content-latest.txt', result.content, 'utf-8');
```

---

## 八、文件上传问题

### 8.1 弹窗导致脚本崩溃 ⚠️ 最常犯错

| 症状 | 原因 | 解决方案 |
|------|------|----------|
| Protocol error: No dialog is showing | 弹出对话框未处理 | 设置 `page.on('dialog')` 处理器 |
| Internal server error, session closed | 对话框关闭了连接 | 接受对话框后再操作 |
| **上传文件后脚本崩溃** | **没有处理弹窗** | **❌ 必须设置对话框处理器** |

**🚨 关键经验（血的教训）**：
```javascript
// ❌ 错误！不处理对话框会导致崩溃
const fileInput = await page.$('input[type="file"]');
await fileInput.setInputFiles(filePath);
// Protocol error: No dialog is showing

// ✅ 正确！设置对话框处理器
page.on('dialog', async dialog => {
  console.log('弹出对话框:', dialog.type());
  await dialog.accept();
});

const fileInput = await page.$('input[type="file"]');
await fileInput.setInputFiles(filePath);
```

### 8.2 浏览器启动失败

| 症状 | 原因 | 解决方案 |
|------|------|----------|
| Failed to create ProcessSingleton | 锁文件存在 | 删除 `SingletonLock` 文件 |
| Profile already in use | 浏览器未正常关闭 | `pkill -f chrome` 杀进程 |

**✅ 解决方案**：
```bash
pkill -f chrome
rm -f /workspace/projects/browser/default/SingletonLock
```

### 8.3 文件路径问题

| 症状 | 原因 | 解决方案 |
|------|------|----------|
| 文件上传失败 | 使用了相对路径 | 使用绝对路径 |
| 找不到文件 | 路径不正确 | 检查文件是否存在 |

**✅ 正确做法**：
```javascript
// ❌ 错误！相对路径可能找不到
const filePath = './storage/polish/resources.json';

// ✅ 正确！绝对路径
const filePath = '/workspace/projects/workspace/projects/novel-sync/storage/polish/resources.json';
```

---

## 九、核心原则总结

| 原则 | 说明 |
|------|------|
| **简单直接** | 能用一行代码解决的不要写十行 |
| **先分析后行动** | 先获取页面元素信息，确认后再操作 |
| **精确选择器** | 用最精确的选择器，避免歧义 |
| **不要过度设计** | 用户说什么就做什么，不要自己加戏 |
| **等待要充足** | 页面加载、按钮渲染都需要时间 |
| **检测会动的元素** | 进度条要检测"分段处理"，不是静态百分比 |
| **进度条要等消失** | 进度条消失才算完成，不是出现就行动 |
