# 白梦写作 - 常见问题排查

## 一、登录问题

### 1.1 页面白屏 ⚠️ 最常见问题

| 症状 | 原因 | 解决方案 |
|------|------|----------|
| 设置 localStorage 后白屏 | 登录状态未生效 | `await page.reload()` |
| 刷新后仍然白屏 | token 过期或无效 | 重新登录获取新 token |
| **恢复登录后白屏** | **使用了 localStorage.clear()** | **❌ 禁止使用 clear()，直接 setItem 覆盖** |

**🚨 关键经验（血的教训）**：
```javascript
// ❌ 错误！会导致白屏
await page.evaluate((items) => {
  localStorage.clear();  // 清空会删除所有设置，导致问题
  for (const [k, v] of Object.entries(items)) {
    localStorage.setItem(k, v);
  }
}, backup.localStorage);

// ✅ 正确！直接覆盖
await page.evaluate((items) => {
  for (const [k, v] of Object.entries(items)) {
    localStorage.setItem(k, v);  // 直接设置，不清空
  }
}, backup.localStorage);
```

**正确的登录恢复流程**：
```javascript
// 1. 访问首页
await page.goto('https://baimengxiezuo.com');
await page.waitForTimeout(1000);

// 2. 设置 localStorage（不要清空！）
await page.evaluate((items) => {
  for (const [k, v] of Object.entries(items)) {
    localStorage.setItem(k, v);
  }
}, backup.localStorage);

// 3. 刷新页面（关键！）
await page.reload();
await page.waitForTimeout(3000);

// 4. 然后才能访问其他页面
await page.goto('https://baimengxiezuo.com/zh-Hans/library/');
```

### 1.2 登录失效

| 症状 | 原因 | 解决方案 |
|------|------|----------|
| 提示未登录 | localStorage 未恢复 | 检查备份文件完整性 |
| 登录后立即退出 | cookies 冲突 | 清空浏览器数据重新登录 |

---

## 二、滚动问题

### 2.1 滚动无效

| 症状 | 原因 | 解决方案 |
|------|------|----------|
| 滚轮操作无响应 | 区域未获得焦点 | **先点击区域获取焦点** |
| 滚动方向相反 | 滚轮参数正负号 | 正数向下，负数向上 |

### 2.2 内容加载不完整

| 症状 | 原因 | 解决方案 |
|------|------|----------|
| 找不到章节 | 虚拟滚动未加载 | 减慢滚动速度，增加等待时间 |
| 内容截断 | 滚动太快 | 每次滚动后等待 80-100ms |

---

## 三、点击问题

### 3.1 点击错误元素

| 症状 | 原因 | 解决方案 |
|------|------|----------|
| 打开了文件夹 | 点击了带箭头的元素 | 排除 `[class*="chevron"]` |
| 打开了错误章节 | 文本匹配不准确 | 使用精确匹配或正则表达式 |

### 3.2 点击无响应

| 症状 | 原因 | 解决方案 |
|------|------|----------|
| Playwright 点击无效 | 被拦截或遮挡 | 使用 JS 点击 `el.click()` |
| 按钮点击无反应 | 元素未加载 | 等待元素可见后再点击 |

---

## 四、复制问题

### 4.1 复制失败

| 症状 | 原因 | 解决方案 |
|------|------|----------|
| 剪贴板为空 | 内容未加载完成 | 先滚动加载完整内容 |
| 复制了错误内容 | 选区问题 | 直接点击复制按钮 |

---

## 五、AI 功能问题

### 5.1 指令发送失败

| 症状 | 原因 | 解决方案 |
|------|------|----------|
| 发送按钮无响应 | 输入框未聚焦 | 先点击输入框 |
| 提示内容为空 | 输入未完成 | 等待输入完成再发送 |

### 5.2 对话区域问题

| 症状 | 原因 | 解决方案 |
|------|------|----------|
| 无法滚动对话 | 区域未聚焦 | 点击对话区域获取焦点 |
| 看不到历史消息 | 滚动位置问题 | 向上滚动查看更早消息 |

---

## 六、调试技巧

### 6.1 检查元素

```javascript
// 检查元素是否存在
const exists = await page.$(selector) !== null;

// 检查元素是否可见
const visible = await page.isVisible(selector);

// 获取元素文本
const text = await page.$eval(selector, el => el.innerText);
```

### 6.2 检查状态

```javascript
// 检查 localStorage
const token = await page.evaluate(() => localStorage.getItem('token'));

// 检查 cookies
const cookies = await context.cookies();

// 检查页面 URL
const url = page.url();
```

### 6.3 截图调试

```javascript
// 截图保存
await page.screenshot({ path: 'debug.png', fullPage: true });

// 高亮元素
await page.evaluate((selector) => {
  const el = document.querySelector(selector);
  el.style.border = '3px solid red';
}, selector);
```
