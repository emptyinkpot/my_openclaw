# OpenClaw SKILL 开发规范

## SKILL 是什么

SKILL 是 OpenClaw 的能力扩展模块，用于：
- 定义 AI Agent 可以执行的操作
- 提供结构化的工具和文档
- 约束 AI 的行为范围

## SKILL 目录结构

```
workspace/skills/{skill-name}/
├── SKILL.md              # 必需：SKILL 定义文件
├── scripts/              # 可选：脚本目录
│   ├── main.js          # 主脚本
│   └── utils.js         # 工具函数
├── docs/                 # 可选：文档目录
└── examples/             # 可选：示例目录
```

## SKILL.md 规范

### 必需字段

```yaml
---
name: skill-name                    # SKILL 标识符（小写，用连字符）
description: 简洁描述。触发关键词。    # 重要！AI 用此匹配
metadata: 
  openclaw: 
    emoji: "📝"                     # 显示图标
    requires: 
      bins: ["node"]                # 依赖的二进制
---
```

### 描述规范

```yaml
# ❌ 错误：描述模糊
description: 番茄小说自动化

# ✅ 正确：包含触发关键词
description: 查询番茄小说作品列表。当用户说"番茄"、"番茄小说"、"fanqie"、"番茄作品"时使用此技能。

# ✅ 更好：强制执行命令
description: 番茄小说作品查询。必须执行脚本 node {baseDir}/scripts/get-works.js
```

### 内容结构

```markdown
# {平台名称}

## 执行命令

\`\`\`bash
node {baseDir}/scripts/{脚本名}.js
\`\`\`

## 说明

- 自动恢复登录状态
- 返回 JSON 格式结果

## 禁止事项

- ❌ 禁止自己写浏览器代码
- ❌ 禁止访问登录页面
```

## 脚本开发规范

### 输出格式

所有脚本必须输出 JSON：

```javascript
// 成功
console.log(JSON.stringify({
  success: true,
  platform: 'fanqie',
  count: 2,
  works: [...]
}));

// 失败
console.log(JSON.stringify({
  success: false,
  error: '错误信息'
}));
```

### 参数处理

```javascript
const args = process.argv.slice(2);
const command = args[0] || 'default';
const param = args[1];

switch (command) {
  case 'list':
    // ...
    break;
  case 'enter':
    if (!param) {
      console.log(JSON.stringify({
        success: false,
        error: '请提供参数'
      }));
      process.exit(1);
    }
    break;
}
```

### 错误处理

```javascript
async function main() {
  try {
    // 业务逻辑
    console.log(JSON.stringify({ success: true, ... }));
  } catch (error) {
    console.log(JSON.stringify({ success: false, error: error.message }));
    process.exit(1);
  }
}
```

## 常见问题

### 问题1: AI 不调用脚本

**原因：** description 不够明确

**解决：**
```yaml
# 在描述中明确写出必须执行的命令
description: 查询番茄小说。必须执行 node {baseDir}/scripts/get-works.js
```

### 问题2: AI 自己写代码

**原因：** 存在多个相似的 SKILL

**解决：** 删除冗余 SKILL，保持单一入口

### 问题3: SKILL 未加载

**检查：**
```bash
openclaw skills list | grep <skill-name>
```

**可能原因：**
1. SKILL.md 格式错误
2. 目录位置不对
3. 文件编码问题

## 调试技巧

### 查看 SKILL 详情

```bash
openclaw skills list
```

### 测试脚本

```bash
# 直接运行脚本
node workspace/skills/<skill>/scripts/main.js

# 检查输出格式
node workspace/skills/<skill>/scripts/main.js | jq .
```

### 查看 AI 实际调用

```bash
grep "tool call" /tmp/openclaw/openclaw-*.log | tail -10
```

## SKILL 模板

```
workspace/skills/{platform}/
├── SKILL.md
└── scripts/
    └── main.js
```

**SKILL.md:**
```markdown
---
name: {platform}
description: {平台名称}自动化操作。当用户说"{关键词1}"、"{关键词2}"时使用此技能。
metadata: { "openclaw": { "emoji": "📝", "requires": { "bins": ["node"] } } }
---

# {平台名称}

## 执行命令

\`\`\`bash
node {baseDir}/scripts/main.js
\`\`\`

## 说明

- 自动恢复登录状态
- 返回 JSON 格式结果
```

**scripts/main.js:**
```javascript
#!/usr/bin/env node
const { chromium } = require('playwright');
const fs = require('fs');

const BROWSER_DIR = '/workspace/projects/browser/default';
const BACKUP_FILE = '/workspace/projects/cookies-accounts/{platform}-default-full.json';

async function main() {
  let browser = null;
  try {
    // 清理锁文件
    ['SingletonLock', 'SingletonSocket', 'SingletonCookie'].forEach(f => {
      const p = require('path').join(BROWSER_DIR, f);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });
    
    browser = await chromium.launchPersistentContext(BROWSER_DIR, {
      headless: true,
      viewport: null,
      args: ['--no-sandbox']
    });
    
    const page = browser.pages()[0] || await browser.newPage();
    
    // 恢复登录状态
    if (fs.existsSync(BACKUP_FILE)) {
      const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'));
      await page.goto('{home_url}', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      
      if (backup.localStorage) {
        await page.evaluate(items => {
          for (const [k, v] of Object.entries(items)) {
            localStorage.setItem(k, v);
          }
        }, backup.localStorage);
      }
      if (backup.cookies) await browser.addCookies(backup.cookies);
    }
    
    // === 业务逻辑 ===
    
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

## 最佳实践

1. **单一职责**：每个 SKILL 只负责一个平台
2. **脚本简洁**：直接使用 Playwright，避免复杂依赖
3. **输出标准**：统一 JSON 格式
4. **描述明确**：包含触发关键词和必须执行的命令
5. **共享资源**：使用统一的浏览器目录和登录备份
