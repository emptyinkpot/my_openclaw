# 通用浏览器操作知识

## 一、浏览器启动配置

### 1.1 标准启动配置

```javascript
const { chromium } = require('playwright');

const context = await chromium.launchPersistentContext(
  '/path/to/browser-data',  // 用户数据目录
  {
    headless: false,
    viewport: null,  // 关键！让浏览器自动调整视口
    args: [
      '--start-maximized',  // 最大化窗口
      '--disable-blink-features=AutomationControlled'  // 隐藏自动化特征
    ]
  }
);

const page = context.pages()[0] || await context.newPage();
```

### 1.2 多账号隔离

```javascript
// 每个账号使用独立的浏览器数据目录
const accounts = {
  baimeng_1: '/workspace/projects/browser/baimeng-1',
  baimeng_2: '/workspace/projects/browser/baimeng-2',
  fanqie_1: '/workspace/projects/browser/fanqie-1'
};
```

---

## 二、滚动操作

### 2.1 通用滚动原则

**关键**：所有滚动操作必须**先点击获取焦点**！

```javascript
// 标准滚动流程
async function scrollArea(page, selector, direction = 'down', distance = 100) {
  // 1. 获取元素位置
  const element = await page.$(selector);
  const box = await element.boundingBox();
  
  // 2. 点击获取焦点
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(300);
  
  // 3. 滚动
  const wheelDelta = direction === 'down' ? distance : -distance;
  await page.mouse.wheel(0, wheelDelta);
}
```

### 2.2 慢速滚动（虚拟列表）

```javascript
async function slowScroll(page, selector, callback, options = {}) {
  const { delay = 80, distance = 80, maxAttempts = 50 } = options;
  
  // 点击获取焦点
  const element = await page.$(selector);
  const box = await element.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(300);
  
  // 滚动到顶部开始
  await page.mouse.wheel(0, -10000);
  await page.waitForTimeout(500);
  
  // 慢速滚动查找
  for (let i = 0; i < maxAttempts; i++) {
    const result = await callback();
    if (result) return result;
    
    await page.mouse.wheel(0, distance);
    await page.waitForTimeout(delay);
  }
  
  return null;
}
```

---

## 三、点击操作

### 3.1 JavaScript 点击

**推荐**：使用 JavaScript 点击，避免被拦截

```javascript
// JS 点击
await page.evaluate((selector) => {
  document.querySelector(selector)?.click();
}, selector);

// JS 点击元素
await page.evaluate((element) => {
  element.click();
}, element);
```

### 3.2 鼠标点击

**适用场景**：需要模拟真实鼠标操作

```javascript
// 获取元素位置
const box = await element.boundingBox();

// 点击中心
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

// 点击指定位置
await page.mouse.click(x, y);
```

---

## 四、剪贴板操作

### 4.1 复制到剪贴板

```javascript
// 方法1：Ctrl+C
await page.keyboard.press('Control+C');

// 方法2：execCommand
await page.evaluate(() => {
  document.execCommand('copy');
});

// 方法3：Clipboard API
await page.evaluate(async (text) => {
  await navigator.clipboard.writeText(text);
}, text);
```

### 4.2 读取剪贴板

```javascript
const text = await page.evaluate(() => 
  navigator.clipboard.readText()
);
```

---

## 五、等待策略

### 5.1 元素等待

```javascript
// 等待元素出现
await page.waitForSelector(selector);

// 等待元素可见
await page.waitForSelector(selector, { state: 'visible' });

// 等待元素隐藏
await page.waitForSelector(selector, { state: 'hidden' });

// 等待元素可点击
await page.waitForSelector(selector, { state: 'attached' });
```

### 5.2 自定义等待

```javascript
// 等待函数返回 true
await page.waitForFunction(() => {
  return document.querySelector('.loaded') !== null;
});

// 等待网络空闲
await page.waitForLoadState('networkidle');

// 固定等待
await page.waitForTimeout(1000);
```

---

## 六、调试技巧

### 6.1 截图

```javascript
// 整页截图
await page.screenshot({ path: 'screenshot.png', fullPage: true });

// 元素截图
await element.screenshot({ path: 'element.png' });
```

### 6.2 高亮元素

```javascript
await page.evaluate((selector) => {
  const el = document.querySelector(selector);
  if (el) {
    el.style.border = '3px solid red';
    el.style.background = 'yellow';
  }
}, selector);
```

### 6.3 打印元素信息

```javascript
const info = await page.evaluate((selector) => {
  const el = document.querySelector(selector);
  if (!el) return null;
  return {
    tag: el.tagName,
    text: el.innerText,
    class: el.className,
    display: getComputedStyle(el).display,
    visibility: getComputedStyle(el).visibility
  };
}, selector);
console.log(info);
```
