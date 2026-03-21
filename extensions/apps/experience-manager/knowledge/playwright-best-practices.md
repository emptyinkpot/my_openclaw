# Playwright 自动化最佳实践

## 浏览器模式选择

### 共享模式（推荐）

```javascript
// 所有平台共用一个浏览器，可同时登录多个网站
const browser = await chromium.launchPersistentContext(
  '/workspace/projects/browser/default',
  { headless: true, viewport: null, args: ['--no-sandbox'] }
);
```

**优点：**
- 登录状态持久化
- 资源占用少
- 多平台共享

### 独立模式

```javascript
// 每个平台-账号独立浏览器
const browser = await chromium.launchPersistentContext(
  `/workspace/projects/browser/${platform}-${accountId}`,
  { headless: true }
);
```

**适用场景：**
- 需要同时登录同平台的多个账号
- 需要完全隔离的浏览器环境

## 登录状态管理

### 备份登录状态

```javascript
async function backupAuth(page, context, platform, accountId = 'default') {
  const backup = {
    platform,
    accountId,
    timestamp: new Date().toISOString(),
    localStorage: await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        items[key] = localStorage.getItem(key);
      }
      return items;
    }),
    cookies: await context.cookies()
  };
  
  const filePath = `/workspace/projects/cookies-accounts/${platform}-${accountId}-full.json`;
  fs.writeFileSync(filePath, JSON.stringify(backup, null, 2));
  return filePath;
}
```

### 恢复登录状态

```javascript
async function restoreAuth(page, context, platform, accountId = 'default', homeUrl) {
  const filePath = `/workspace/projects/cookies-accounts/${platform}-${accountId}-full.json`;
  
  if (!fs.existsSync(filePath)) {
    return false;
  }
  
  const backup = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  // 1. 先访问网站（必须！）
  await page.goto(homeUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  
  // 2. 设置 localStorage（禁止使用 clear()）
  if (backup.localStorage) {
    await page.evaluate(items => {
      for (const [k, v] of Object.entries(items)) {
        localStorage.setItem(k, v);
      }
    }, backup.localStorage);
  }
  
  // 3. 设置 cookies
  if (backup.cookies) {
    await context.addCookies(backup.cookies);
  }
  
  // 4. 刷新页面使登录生效
  await page.reload({ waitUntil: 'networkidle' });
  
  return true;
}
```

### ⚠️ 关键注意事项

```javascript
// ❌ 错误：使用 clear() 会丢失其他网站的状态
await page.evaluate(() => localStorage.clear());

// ✅ 正确：直接覆盖设置
await page.evaluate(items => {
  for (const [k, v] of Object.entries(items)) {
    localStorage.setItem(k, v);
  }
}, backup.localStorage);

// ❌ 错误：没访问网站就设置 localStorage
await context.addCookies(backup.cookies);

// ✅ 正确：先访问再设置
await page.goto(homeUrl);
await context.addCookies(backup.cookies);
```

## 锁文件处理

```javascript
// Playwright 使用 Singleton 模式，必须清理锁文件
function cleanLockFiles(browserDir) {
  ['SingletonLock', 'SingletonSocket', 'SingletonCookie', 'Lock'].forEach(f => {
    const filePath = path.join(browserDir, f);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.log(`清理锁文件失败: ${f}`);
      }
    }
  });
}

// 在启动浏览器前调用
cleanLockFiles('/workspace/projects/browser/default');
const browser = await chromium.launchPersistentContext(...);
```

## 选择器最佳实践

### 精确选择器优先

```javascript
// ❌ 模糊匹配：可能匹配到不相关元素
const items = await page.$$('[class*="book"]');

// ✅ 精确匹配：只匹配目标元素
const items = await page.$$('.home-book-item');

// ✅ 组合选择器：更精确
const items = await page.$$('.book-list .book-item[data-id]');
```

### 数据提取模式

```javascript
// 提取列表数据
const works = await page.evaluate(() => {
  const results = [];
  
  // 使用精确选择器
  document.querySelectorAll('.home-book-item').forEach(el => {
    // 从子元素提取
    const title = el.querySelector('.book-title')?.innerText?.trim();
    const status = el.querySelector('.book-status')?.innerText?.trim();
    
    // 过滤无效数据
    if (title && title.length > 0 && title.length < 100) {
      results.push({ title, status });
    }
  });
  
  // 去重
  const seen = new Set();
  return results.filter(item => {
    if (seen.has(item.title)) return false;
    seen.add(item.title);
    return true;
  });
});
```

### 调试选择器

```javascript
// 打印匹配结果
const elements = await page.$$('.some-class');
console.log(`找到 ${elements.length} 个元素`);

// 打印元素信息
const info = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('.some-class')).map(el => ({
    class: el.className,
    text: el.innerText.slice(0, 50),
    html: el.outerHTML.slice(0, 200)
  }));
});
console.log(JSON.stringify(info, null, 2));
```

## 等待策略

```javascript
// 等待页面加载
await page.goto(url, { waitUntil: 'networkidle' });  // 等待网络空闲
await page.goto(url, { waitUntil: 'domcontentloaded' });  // 等待 DOM 加载

// 等待元素出现
await page.waitForSelector('.target-element', { timeout: 10000 });

// 固定等待（简单场景）
await page.waitForTimeout(2000);

// 等待条件
await page.waitForFunction(() => {
  return document.querySelectorAll('.item').length > 0;
});
```

## 错误处理

```javascript
async function main() {
  let browser = null;
  
  try {
    browser = await chromium.launchPersistentContext(...);
    const page = browser.pages()[0] || await browser.newPage();
    
    // 操作...
    
    // 输出 JSON 结果
    console.log(JSON.stringify({ success: true, data: result }));
    
  } catch (error) {
    // 错误也输出 JSON
    console.log(JSON.stringify({ success: false, error: error.message }));
    process.exit(1);
    
  } finally {
    // 确保关闭浏览器
    if (browser) {
      await browser.close();
    }
  }
}
```

## 常见陷阱

### 陷阱1: 浏览器已运行

```
Error: Failed to create a ProcessSingleton
```

**原因：** 之前的浏览器实例没有正确关闭
**解决：** 清理锁文件后再启动

### 陷阱2: 登录状态不生效

**原因：** 
1. 没有先访问网站就设置 localStorage
2. 设置后没有刷新页面

**解决：**
```javascript
await page.goto(homeUrl);           // 1. 先访问
await setLocalStorage(backup);      // 2. 设置
await context.addCookies(cookies);  // 3. 设置 cookies
await page.reload();                // 4. 刷新生效
```

### 陷阱3: 数据提取为空

**原因：** 页面未加载完成
**解决：** 增加等待时间或使用 waitForSelector

### 陷阱4: 超时错误

```
TimeoutError: page.goto: Timeout 30000ms exceeded
```

**原因：** 网络慢或页面复杂
**解决：** 增加超时时间
```javascript
await page.goto(url, { timeout: 60000 });
```

## 性能优化

```javascript
// 1. 复用浏览器实例（不要每次都创建新的）
// 2. 使用 headless 模式
// 3. 禁用不必要的资源
await page.route('**/*.{png,jpg,jpeg,gif,svg}', route => route.abort());
await page.route('**/*.{css,font,woff,woff2}', route => route.abort());

// 4. 减少等待时间
// 根据实际情况调整，不要盲目使用固定值
```

## 测试脚本模板

```javascript
#!/usr/bin/env node
/**
 * {平台名称} - {功能描述}
 * 
 * 用法: node {脚本名}.js [参数]
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BROWSER_DIR = '/workspace/projects/browser/default';
const BACKUP_FILE = '/workspace/projects/cookies-accounts/{平台}-default-full.json';
const HOME_URL = 'https://example.com';

// 清理锁文件
function cleanLockFiles() {
  ['SingletonLock', 'SingletonSocket', 'SingletonCookie'].forEach(f => {
    const p = path.join(BROWSER_DIR, f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });
}

async function main() {
  let browser = null;
  
  try {
    cleanLockFiles();
    
    browser = await chromium.launchPersistentContext(BROWSER_DIR, {
      headless: true,
      viewport: null,
      args: ['--no-sandbox']
    });
    
    const page = browser.pages()[0] || await browser.newPage();
    
    // 恢复登录状态
    if (fs.existsSync(BACKUP_FILE)) {
      const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'));
      await page.goto(HOME_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      
      if (backup.localStorage) {
        await page.evaluate(items => {
          for (const [k, v] of Object.entries(items)) {
            localStorage.setItem(k, v);
          }
        }, backup.localStorage);
      }
      
      if (backup.cookies) {
        await browser.addCookies(backup.cookies);
      }
    }
    
    // === 业务逻辑 ===
    await page.goto('{目标页面}', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    const result = await page.evaluate(() => {
      // 提取数据...
      return [];
    });
    
    console.log(JSON.stringify({
      success: true,
      data: result
    }));
    
  } catch (error) {
    console.log(JSON.stringify({
      success: false,
      error: error.message
    }));
    process.exit(1);
    
  } finally {
    if (browser) await browser.close();
  }
}

main();
```
