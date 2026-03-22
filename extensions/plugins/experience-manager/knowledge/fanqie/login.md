# 番茄小说 - 登录状态管理

## 一、登录状态存储

**关键发现**：番茄小说使用 **Cookies** 保存登录状态

```javascript
// 查看关键 cookies
const cookies = await context.cookies();
const sessionCookie = cookies.find(c => c.name === 'sessionid');
```

---

## 二、登录状态持久化

### 2.1 浏览器持久化

```javascript
const context = await chromium.launchPersistentContext(
  '/workspace/projects/browser/fanqie',
  {
    headless: false,
    viewport: null,
    args: ['--start-maximized']
  }
);
```

### 2.2 登录状态备份

```javascript
const cookies = await context.cookies();
fs.writeFileSync('fanqie-account.json', JSON.stringify(cookies, null, 2));
```

### 2.3 登录状态恢复

```javascript
const cookies = JSON.parse(fs.readFileSync('fanqie-account.json'));
await context.addCookies(cookies);
await page.reload();
```

---

## 三、备份文件位置

```
/workspace/projects/cookies-accounts/
├── fanqie-account-0.json       # 账号 0
├── fanqie-account-1.json       # 账号 1
├── fanqie-account-2.json       # 账号 2
└── fanqie-all-chapters.json    # 章节汇总
```
