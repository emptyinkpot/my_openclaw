# OpenClaw 飞书机器人故障排查指南

## 快速诊断流程

```
用户报告问题
    │
    ▼
Step 1: 检查 Gateway 状态
    │   curl http://localhost:5000/health
    │   openclaw channels status
    │
    ▼
Step 2: 查看日志定位实际调用
    │   grep "tool call\|exec" /tmp/openclaw/openclaw-*.log | tail -20
    │
    ▼
Step 3: 确认 SKILL 加载
    │   openclaw skills list | grep <平台>
    │
    ▼
Step 4: 手动测试脚本
    │   node <skill>/scripts/xxx.js
    │
    ▼
Step 5: 修复并重启
    └── sh scripts/restart.sh
```

## 快捷脚本

```bash
# 打开扣子编程
node workspace/skills/coze-coding/scripts/open-coze.js

# 查看番茄作品
node workspace/skills/fanqie-novel/scripts/get-works.js

# 查看白梦作品
node workspace/skills/baimeng-writer/scripts/controller.js list
```

## 常见问题速查

### 问题1: 飞书消息无响应

| 症状 | 可能原因 | 解决方案 |
|------|----------|----------|
| 发消息后没反应 | Gateway 未运行 | `openclaw gateway` 启动 |
| 一直显示"正在输入" | 脚本执行超时 | 检查脚本是否有死循环 |
| 回复"没有支持" | SKILL 未匹配 | 检查 SKILL description |

### 问题2: 反复要求扫码登录

| 症状 | 可能原因 | 解决方案 |
|------|----------|----------|
| 每次都要扫码 | 浏览器目录不统一 | 使用 `browser/default/` |
| 登录状态丢失 | 备份文件不存在 | 检查 `cookies-accounts/` |
| AI 自己创建临时浏览器 | SKILL 被忽略 | 删除干扰 SKILL |

### 问题3: AI 不调用脚本自己写代码

| 症状 | 日志特征 | 解决方案 |
|------|----------|----------|
| 自己生成 chromium.launch | `node -e "const {chromium}..."` | 简化 SKILL 描述 |
| 调用错误的脚本路径 | 路径不是 SKILL 目录 | 删除干扰 SKILL |
| 忽略 SKILL 说明 | 没有执行 `{baseDir}/scripts/` | 在描述中强制要求 |

### 问题4: 数据识别错误

| 症状 | 原因 | 解决方案 |
|------|------|----------|
| 把标题当数据 | 选择器太宽泛 | 使用精确 class 名 |
| 数据重复 | 没有去重 | 添加 Set 去重逻辑 |
| 数据为空 | 页面未加载完 | 增加 waitForTimeout |

## 关键命令速查

```bash
# Gateway 管理
curl http://localhost:5000/health          # 健康检查
openclaw gateway                           # 启动 Gateway
sh scripts/restart.sh                      # 重启 Gateway
sh scripts/stop.sh                         # 停止 Gateway

# 状态检查
openclaw channels status --probe           # 频道状态
openclaw skills list                       # SKILL 列表
openclaw doctor                            # 配置诊断

# 日志查看
tail -100 /tmp/openclaw/openclaw-*.log | grep "tool call"
grep "error\|Error\|fail" /tmp/openclaw/openclaw-*.log | tail -20
```

## 架构规范

### 目录结构

```
/workspace/projects/
├── browser/default/           # 统一浏览器数据（共享模式）
├── cookies-accounts/          # 登录状态备份
│   └── {平台}-{账号}-full.json
├── lib/                       # 核心代码库
│   ├── browser/
│   └── sites/
└── workspace/skills/
    └── {平台名称}/            # 每个平台一个 SKILL
```

### SKILL 规范

```yaml
# SKILL.md 模板
---
name: {平台名称}
description: 简洁描述。触发关键词："{关键词1}"、"{关键词2}"
metadata: { "openclaw": { "emoji": "📝", "requires": { "bins": ["node"] } } }
---

# {平台名称}

## 执行命令

```bash
node {baseDir}/scripts/{脚本名}.js
```

## 说明

- 自动恢复登录状态
- 返回 JSON 格式结果
```

### 脚本规范

```javascript
#!/usr/bin/env node
/**
 * {平台名称} - {功能描述}
 */

const { chromium } = require('playwright');
const fs = require('fs');

const BROWSER_DIR = '/workspace/projects/browser/default';
const BACKUP_FILE = '/workspace/projects/cookies-accounts/{平台}-default-full.json';

async function main() {
  let browser = null;
  
  try {
    // 1. 清理锁文件
    ['SingletonLock', 'SingletonSocket', 'SingletonCookie'].forEach(f => {
      const p = require('path').join(BROWSER_DIR, f);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });
    
    // 2. 启动共享浏览器
    browser = await chromium.launchPersistentContext(BROWSER_DIR, {
      headless: true,
      viewport: null,
      args: ['--no-sandbox']
    });
    
    const page = browser.pages()[0] || await browser.newPage();
    
    // 3. 恢复登录状态
    if (fs.existsSync(BACKUP_FILE)) {
      const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'));
      await page.goto('{平台首页}', { waitUntil: 'domcontentloaded' });
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
    
    // 4. 执行操作
    // ...
    
    // 5. 输出 JSON 结果
    console.log(JSON.stringify({ success: true, ... }));
    
  } catch (error) {
    console.log(JSON.stringify({ success: false, error: error.message }));
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

main();
```

## 经验教训

### 1. 先看日志，不要猜测

❌ 错误：猜测是模块问题，修改了半天代码
✅ 正确：先 `grep "tool call"` 看 AI 实际执行了什么

### 2. 单一入口原则

❌ 错误：多个 SKILL 处理同一平台
✅ 正确：每个平台只有一个 SKILL，一个脚本入口

### 3. 共享资源统一管理

❌ 错误：每个脚本自己创建浏览器目录
✅ 正确：统一使用 `browser/default/`，备份到 `cookies-accounts/`

### 4. SKILL 描述要强制

❌ 错误：描述模糊，AI 自己发挥
✅ 正确：明确写"必须执行脚本，禁止自己写代码"

### 5. 选择器要精确

❌ 错误：`[class*="book"]` 匹配到标题
✅ 正确：`.home-book-item` 精确匹配

## 调试技巧

### 查看页面结构

```javascript
// 在脚本中添加调试代码
const html = await page.evaluate(() => {
  const items = document.querySelectorAll('.some-class');
  return Array.from(items).map(el => ({
    class: el.className,
    text: el.innerText.slice(0, 100)
  }));
});
console.log(JSON.stringify(html, null, 2));
```

### 测试登录状态

```javascript
// 检查是否登录
const hasLoginBtn = await page.locator('text=登录').isVisible().catch(() => false);
console.log('已登录:', !hasLoginBtn);
```

### 保存当前登录状态

```javascript
// 手动保存登录状态
const localStorage = await page.evaluate(() => {
  const items = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    items[key] = localStorage.getItem(key);
  }
  return items;
});

const cookies = await browser.cookies();

fs.writeFileSync('backup.json', JSON.stringify({
  localStorage,
  cookies,
  timestamp: new Date().toISOString()
}, null, 2));
```
