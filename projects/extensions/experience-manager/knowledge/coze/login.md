# Coze.cn - 登录知识

## 一、网站信息

| 项目 | 内容 |
|------|------|
| 网站 | 扣子 Coze |
| URL | https://www.coze.cn/ |
| 所属 | 字节跳动 |
| 功能 | AI 开发平台、智能体、工作流 |

### 子产品

| 产品 | URL | 功能 |
|------|-----|------|
| **扣子编程** | https://code.coze.cn/home | Vibe Coding、AI 开发伙伴 |
| 扣子办公 | https://www.coze.cn/ | 智能体、工作流 |

---

## 二、登录方式

- 手机号登录
- 微信扫码登录
- 抖音扫码登录
- 飞书登录

---

## 三、登录恢复

### 3.1 存储类型

- **localStorage**: 存储用户会话信息
- **cookies**: 存储认证凭证

### 3.2 恢复到主站

```javascript
const backupFile = '/workspace/projects/cookies-accounts/coze-account-1-full.json';
const data = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));

// 先访问首页
await page.goto('https://www.coze.cn/', { timeout: 30000 });
await page.waitForTimeout(2000);

// 设置 localStorage
await page.evaluate((items) => {
  for (const [k, v] of Object.entries(items)) localStorage.setItem(k, v);
}, data.localStorage || {});

// 设置 cookies
await context.addCookies(data.cookies);

// 刷新页面
await page.reload();
await page.waitForTimeout(3000);
```

### 3.3 ⭐ 恢复到扣子编程（关键经验）

> **重要**：扣子编程 (code.coze.cn) 与主站 (www.coze.cn) 共享登录状态，但需要**先在主站设置登录状态**，再跳转到扣子编程。

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

// Step 4: 再跳转到扣子编程
await page.goto('https://code.coze.cn/home', { timeout: 30000 });
await page.waitForTimeout(3000);

// 完成！现在已登录扣子编程
```

---

## 四、扣子编程页面结构

### 4.1 页面信息

| 项目 | 内容 |
|------|------|
| URL | https://code.coze.cn/home |
| 标题 | 扣子编程，你的 AI 开发伙伴，Vibe Coding 基础设施 |

### 4.2 主要功能

| 功能 | 位置 | 说明 |
|------|------|------|
| **新建项目** | 按钮/侧边栏 | 创建新项目 |
| **项目** | 侧边栏 | 项目列表 |
| **项目管理** | 侧边栏 | 管理所有项目 |
| **集成管理** | 侧边栏 | 管理集成服务 |
| **社区** | 按钮 | 社区资源 |
| **网页应用** | 按钮 | 网页应用开发 |
| **回到旧版** | 按钮 | 返回旧版界面 |

---

## 五、备份文件

| 文件 | 内容 |
|------|------|
| `coze-account-1-full.json` | 完整备份（cookies + localStorage） |
| `coze-account-1.json` | 基础备份（仅 cookies） |

---

## 六、脚本文件

| 脚本 | 用法 | 功能 |
|------|------|------|
| `coze-programming.js` | `node coze-programming.js` | 打开扣子编程并探测页面 |
| `open-coze.js` | `node open-coze.js` | 打开主站 |
| `explore-coze.js` | `node explore-coze.js` | 探测网站结构 |
| `save-coze-login.js` | `node save-coze-login.js` | 保存登录数据 |

---

## 七、注意事项

1. 登录主站后会重定向到 `/overview` 页面
2. **扣子编程需要先在主站设置登录状态再跳转**
3. localStorage 中包含用户会话信息
4. 浏览器数据目录: `browser/coze-1/`
5. 主站和扣子编程共享 cookies，但 localStorage 可能需要重新设置
