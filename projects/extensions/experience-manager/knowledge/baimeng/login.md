# 白梦写作 - 登录状态管理

## 一、登录状态存储

**关键发现**：白梦写作使用 **Local Storage** 保存登录 token，不是 Cookies！

```javascript
// 查看存储的 token
localStorage.getItem('token');
localStorage.getItem('user');
```

---

## 二、登录状态持久化

### 2.1 浏览器持久化

使用 Playwright 的 `launchPersistentContext`：

```javascript
const context = await chromium.launchPersistentContext(
  '/workspace/projects/browser/baimeng',  // 独立目录
  {
    headless: false,
    viewport: null,
    args: ['--start-maximized']
  }
);
```

### 2.2 登录状态备份

```javascript
// 备份到文件
const backup = {
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

fs.writeFileSync('backup.json', JSON.stringify(backup, null, 2));
```

### 2.3 登录状态恢复

```javascript
// 恢复登录状态
const backup = JSON.parse(fs.readFileSync('backup.json'));

// 1. 设置 localStorage
await page.evaluate((items) => {
  for (const [k, v] of Object.entries(items)) {
    localStorage.setItem(k, v);
  }
}, backup.localStorage);

// 2. 设置 cookies
await context.addCookies(backup.cookies);

// 3. 刷新页面（关键！）
await page.reload();
```

---

## 三、常见问题

### 3.1 页面白屏

**原因**：设置 localStorage 后未刷新页面

**解决**：`await page.reload()`

### 3.2 登录失效

**原因**：token 过期或 localStorage 未正确恢复

**解决**：
1. 检查 localStorage 是否正确设置
2. 检查 cookies 是否正确添加
3. 确认刷新页面

---

## 四、备份文件位置

```
/workspace/projects/cookies-accounts/
├── baimeng-account-1.json        # 基础账号信息
├── baimeng-account-1-full.json   # 完整备份
└── baimeng-full-backup.json      # 全量备份
```
