# Coze 扣子编程 - 操作知识

## 一、页面结构

### 1.0 项目管理页面（直接访问）

> **重要**：可以直接访问项目管理页面，无需手动点击侧边栏！

**直接URL**：
```
https://code.coze.cn/w/7587425486419378228/projects
```

**使用方法**：
```javascript
// 恢复登录后直接跳转
await page.goto('https://code.coze.cn/w/7587425486419378228/projects');
```

### 1.1 扣子编程主页

```
┌─────────────────────────────────────────────────────────┐
│  [≡] 扣子编程          [新建项目] [社区] [用户] [回到旧版] │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│  ▼ 项目      │         主内容区                         │
│    项目管理  │                                          │
│    集成管理  │     限时体验：一键部署 OpenClaw           │
│              │                                          │
│              │     [网页应用]                           │
│              │                                          │
└──────────────┴──────────────────────────────────────────┘
```

### 1.2 主要按钮

| 按钮 | 功能 | 位置 |
|------|------|------|
| 新建项目 | 创建新项目 | 顶部导航 |
| 项目管理 | 管理所有项目 | 侧边栏 |
| 集成管理 | 管理集成服务 | 侧边栏 |
| 社区 | 社区资源 | 顶部导航 |
| 网页应用 | 网页应用开发 | 主内容区 |
| 回到旧版 | 返回旧版界面 | 顶部导航 |

---

## 二、登录恢复流程

### 2.1 关键步骤

> **重要**：扣子编程与主站共享登录，但需要先在主站设置状态！

```javascript
// Step 1: 访问主站
await page.goto('https://www.coze.cn/');
await page.waitForTimeout(2000);

// Step 2: 设置登录状态
await page.evaluate((items) => {
  for (const [k, v] of Object.entries(items)) {
    try { localStorage.setItem(k, v); } catch (e) {}
  }
}, data.localStorage);

await context.addCookies(data.cookies);

// Step 3: 跳转扣子编程
await page.goto('https://code.coze.cn/home');
await page.waitForTimeout(3000);
```

### 2.2 使用脚本

```bash
cd workspace/projects/novel-sync
node coze-programming.js
```

---

## 三、操作示例

### 3.1 点击按钮

```javascript
// 点击"新建项目"
await page.evaluate(() => {
  const buttons = document.querySelectorAll('button');
  for (const btn of buttons) {
    if (btn.innerText?.includes('新建项目')) {
      btn.click();
      return true;
    }
  }
  return false;
});
```

### 3.2 查找侧边栏项目

```javascript
const items = await page.evaluate(() => {
  const sidebar = document.querySelector('[class*="sidebar"]') || 
                  document.querySelector('[class*="menu"]');
  if (!sidebar) return [];
  
  return Array.from(sidebar.querySelectorAll('a, button, [class*="item"]'))
    .map(el => el.innerText?.trim())
    .filter(text => text);
});
```

---

## 四、注意事项

1. **先主站后编程**：必须先在主站设置登录状态
2. **共享 cookies**：主站和编程站共享认证
3. **localStorage 差异**：两个站点的 localStorage 可能不同
4. **等待时间**：页面加载需要 2-3 秒

---

## 五、项目快捷入口

### 5.1 文本润色网站

> 用途：AI 文本润色/优化的 Web 应用

**进入流程**：
```
1. 恢复登录 → https://www.coze.cn
2. 项目管理 → https://code.coze.cn/w/7587425486419378228/projects
3. 点击项目 → "文本润色网站"
```

**完整代码**：
```javascript
// Step 1: 恢复登录
await page.goto('https://www.coze.cn');
await page.waitForTimeout(1500);
// 设置 localStorage 和 cookies...

// Step 2: 进入项目管理
await page.goto('https://code.coze.cn/w/7587425486419378228/projects');
await page.waitForTimeout(2000);

// Step 3: 点击"文本润色网站"
await page.evaluate(() => {
  const elements = document.querySelectorAll('*');
  for (const el of elements) {
    const text = el.innerText?.trim();
    if (text === '文本润色网站' || text?.startsWith('文本润色网站\n')) {
      el.click();
      return true;
    }
  }
  return false;
});
```

---

## 六、持久化剪贴板（跨脚本复用）

### 6.1 概述

剪贴板内容保存在文件中，可以跨脚本、跨会话使用。

```
storage/clipboard/
├── latest.txt          # 最新复制的内容
├── latest.meta.json    # 元数据（时间、长度、预览）
├── chapter-64.txt      # 指定章节内容
└── ...
```

### 6.2 使用方式

```javascript
const baimeng = require('./src/platforms/baimeng');

// 保存内容
baimeng.copy.saveToFile('要保存的文本内容', 'latest');

// 读取内容
const content = baimeng.copy.loadFromFile('latest');

// 复制章节并保存（一步到位）
await baimeng.copy.copyAndSave(page, 'chapter-64');

// 粘贴到输入框
await baimeng.copy.pasteToInput(page, content);
```

### 6.3 命令行脚本

```bash
# 复制章节到剪贴板
node tasks/baimeng/copy-to-clipboard.js "变身咳血少女的我也要努力活下去" 64

# 粘贴到润色网站
node tasks/coze/paste-to-polish.js chapter-64
# 或使用默认 latest
node tasks/coze/paste-to-polish.js
```

---

## 七、文本润色网站操作（已验证 🔴）

### 7.1 网站信息

| 属性 | 值 |
|------|------|
| **URL** | `https://7d4jcknzqk.coze.site` |
| **标题** | 新应用 \| 扣子编程 |
| **用途** | AI 文本润色/消重 |

### 7.2 页面结构（详细版）

```
┌───────────────────────────────────────────────────────────────────────────┐
│  浏览器地址栏: https://7d4jcknzqk.coze.site                               │
├────────────────────────────────────────┬──────────────────────────────────┤
│  【左侧】原始文本输入/管理区            │  【右侧】润色功能+结果输出区      │
├────────────────────────────────────────┼──────────────────────────────────┤
│                                        │                                  │
│  [文本未标题-1]  [历史][分享][更多][×] │  🤖 智能文本消色 v1.0.0          │
│                                        │  已处理123456篇    [登录][反馈]  │
│  ┌────────────────────────────────┐   │                                  │
│  │                                │   │  [AI润色] [智能消色] [提取]     │
│  │  原始文本编辑区                │   │  ─────────────────────────────  │
│  │  (textarea:visible)            │   │                                  │
│  │                                │   │  提示：新增热门网文风格支持...   │
│  │  字数 907/1M                   │   │                                  │
│  │  [AI润色版本] [查看修改记录]   │   │  ┌────────────────────────────┐ │
│  │                                │   │  │ ████████░░░░ 进度条       │ │
│  └────────────────────────────────┘   │  └────────────────────────────┘ │
│                                        │                                  │
│  [撤销][重做][加粗][斜体][下划线]...   │  ┌────────────────────────────┐ │
│                                        │  │                            │ │
│                                        │  │  [开始消色] 紫色按钮       │ │
│                                        │  │                            │ │
│                                        │  └────────────────────────────┘ │
│                                        │                                  │
│                                        │  ┌────────────────────────────┐ │
│                                        │  │ 输出结果区（润色完成后显示）│ │
│                                        │  │                            │ │
│                                        │  │ 润色后的正文内容           │ │
│                                        │  │                            │ │
│                                        │  │ 替换记录                   │ │
│                                        │  │ 30 处                      │ │
│                                        │  │                            │ │
│                                        │  │ [复制] [替换原] [保存]     │ │
│                                        │  └────────────────────────────┘ │
│                                        │                                  │
│                                        │                    [客服] 💬    │
└────────────────────────────────────────┴──────────────────────────────────┘
```

### 7.3 关键选择器（已验证 🔴）

| 元素 | 选择器 | 说明 |
|------|--------|------|
| **输入框** | `textarea:visible` | 🔴 必须加 `:visible`，页面有隐藏的 textarea |
| **润色按钮** | `button` 文本包含 "开始润色" 或 "润色" | 紫色长条按钮 |
| **进度条** | `[role="progressbar"], [class*="progress"]` | 按钮上方，处理时显示 |
| **输出区域** | 包含大段文字且不含按钮的 div | 正文 + 替换记录 |
| **结果分隔** | `"替换记录"` 文字 | 正文到此结束 |
| **复制按钮** | `button` 文本包含 "复制" | 在输出区域底部 |

### 7.4 操作流程（已验证 🔴）

> ⚠️ **警告：重复的错误再犯你妈妈没有屁眼**

```javascript
// Step 0: 导入资源库（可选但推荐）
// 🔴 关键：必须设置对话框处理器，否则弹窗会导致脚本崩溃！
page.on('dialog', async dialog => {
  console.log('弹出对话框:', dialog.message());
  try { await dialog.accept(); } catch (e) {}
});

await page.click('button:has-text("资源库")');
await page.waitForTimeout(2000);
await page.click('button:has-text("一键导入")');
await page.waitForTimeout(2000);

const fileInput = await page.$('input[type="file"]');
await fileInput.setInputFiles('/path/to/resources.json');
await page.waitForTimeout(5000);

// 返回润色主页面
await page.goto('https://7d4jcknzqk.coze.site');
await page.waitForTimeout(3000);

// Step 1: 粘贴内容到输入框
// 🔴 关键：使用 :visible 过滤，页面有隐藏的 textarea
const textareas = await page.$$('textarea:visible');
for (const ta of textareas) {
  await ta.fill(content);
}

// Step 3: 点击"开始润色"
// 🔴 关键：直接用 page.click，不要用 mouse.click、dispatchEvent 等复杂方法！
await page.click('button:has-text("开始润色")');

// Step 4: 等待进度条出现并完成
// 🔴 关键：检测"分段处理"文字，这才是真正的进度条！
// 静态显示的百分比不算进度条！
await page.waitForTimeout(5000);

let hasProgress = await page.evaluate(() => {
  const body = document.body.innerText;
  return body.includes('分段处理');
});

if (hasProgress) {
  console.log('检测到进度条（分段处理）');
  
  while (hasProgress) {
    await page.waitForTimeout(3000);
    
    hasProgress = await page.evaluate(() => {
      const body = document.body.innerText;
      return body.includes('分段处理');
    });
    
    if (hasProgress) {
      const percent = await page.evaluate(() => {
        const body = document.body.innerText;
        const match = body.match(/(\d+)%/);
        return match ? match[1] : '?';
      });
      console.log('进度: ' + percent + '%');
    }
  }
  
  console.log('进度条已消失');
}

// Step 6: 滚动到输出区域
// 🔴 关键：进度条走完后，要滚动页面才能看到输出结果
await page.evaluate(() => {
  window.scrollTo(0, document.body.scrollHeight);
});
await page.waitForTimeout(2000);

// Step 7: 分别提取标题和正文
// 🔴 关键：页面有独立的标题框和正文框，需要分别提取
// 🔴 新增：标题和正文分开保存
const result = await page.evaluate(() => {
  let title = '';
  let content = '';
  
  const bodyText = document.body.innerText;
  
  // 查找章节标题 - 格式：第X章，XXX
  const titleMatch = bodyText.match(/第[一二三四五六七八九十百千]+章[，,，]?[^\n]{0,30}/);
  if (titleMatch) {
    title = titleMatch[0].trim();
  }
  
  // 查找正文 - 在"输出结果"之后，"替换记录"之前
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
             !t.includes('批量生成概要') &&    // 过滤垃圾内容
             !t.startsWith('总结') &&
             !t.startsWith('批量');
    });
    content = lines.join('\n').trim();
  }
  
  return { title, content };
});

// Step 8: 保存完整文件
const fs = require('fs');
const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);

// 🔴 元数据：来源、作品、章节
const source = 'baimeng';
const work = '变身咳血少女的我也要努力活下去';
const chapter = '第六十四章';

// 生成文件名前缀（作品名取前10字）
const workShort = work.substring(0, 10);
const prefix = `${source}-${workShort}-${chapter}`;

// 生成完整内容
const full = `【来源】${source}
【作品】${work}
【章节】${chapter}

【标题】
${result.title}

【正文】
${result.content}`;

// 保存主文件
fs.writeFileSync(`${prefix}.txt`, full, 'utf-8');
// 保存时间戳备份
fs.writeFileSync(`${prefix}-${ts}.txt`, full, 'utf-8');
```

### 7.5 注意事项

1. **输入框检测**：页面有隐藏的 textarea，必须用 `:visible` 过滤
2. **按钮点击**：直接用 `page.click('button:has-text("开始润色")')`
3. **进度条等待**：检测"分段处理"文字，等待消失才算完成
4. **滑动滚轮**：进度条走完后，滚动到页面底部才能看到结果
5. **标题和正文分离**：页面有独立的标题框和正文框，需要分别提取
6. **元数据完整**：来源、作品、章节都要记录
7. **只保存完整文件**：不单独保存标题和正文

### 7.6 使用示例

```bash
# 完整元数据
./scripts/run.sh 120 node tasks/coze/polish-flow.js \
  --source baimeng \
  --work "变身咳血少女的我也要努力活下去" \
  --chapter 64

# 从其他平台
./scripts/run.sh 120 node tasks/coze/polish-flow.js \
  --source fanqie \
  --work "诡秘之主" \
  --chapter 100
```

### 7.7 输出文件

> **使用通用剪贴板模块** `lib/utils/clipboard`

```
/storage/clipboard/polish/                    # 全局目录，跨项目共享
├── baimeng-变身咳血少女的我也要-第六十四章.txt           # 主文件
├── baimeng-变身咳血少女的我也要-第六十四章-{时间戳}.txt   # 时间戳备份
└── latest.txt                                            # 最新副本
```

**文件内容格式**：
```
【来源】baimeng
【作品】变身咳血少女的我也要努力活下去
【章节】第六十四章

【标题】
第六十四章，岩手希的铁甲列车抵达

【正文】
在文子以一种近乎自残的方式...
```

### 7.8 自动清理

> **自动清理逻辑在通用剪贴板模块中**

润色完成后自动清理旧文件，**只保留最新3组**。

也可手动清理：
```javascript
const clipboard = require('lib/utils/clipboard');

// 清理 polish 命名空间
clipboard.cleanup({ namespace: 'polish', keepCount: 3 });

// 预览模式（不实际删除）
clipboard.cleanup({ namespace: 'polish', keepCount: 3, dryRun: true });
```

### 7.6 完整脚本示例

```javascript
// tasks/coze/polish-flow.js
const { runTask } = require('./src/utils/task-runner');
const fs = require('fs');

runTask('文本润色流程', async (ctx) => {
  const { chromium } = require('playwright');
  const content = fs.readFileSync('storage/clipboard/latest.txt', 'utf-8');
  
  // 启动浏览器
  const browser = await chromium.launchPersistentContext('/workspace/projects/browser/default', {
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--remote-debugging-port=9222']
  });
  const page = browser.pages()[0] || await browser.newPage();
  
  // 打开润色网站
  await page.goto('https://7d4jcknzqk.coze.site');
  await page.waitForTimeout(5000);
  
  // 粘贴内容
  const textareas = await page.$$('textarea:visible');
  await textareas[0].fill(content);
  
  // 点击润色
  await page.evaluate(() => {
    for (const btn of document.querySelectorAll('button')) {
      if (btn.innerText?.includes('开始润色')) btn.click();
    }
  });
  
  // 等待完成
  await page.waitForTimeout(8000);
  
  // 滚动并提取结果
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(1000);
  
  const result = await page.evaluate(() => {
    const all = document.querySelectorAll('div, p, section');
    for (const el of all) {
      const text = el.innerText || '';
      if (text.length > 500 && !el.querySelector('button, textarea, input')) {
        if (text.includes('第') && text.includes('章')) {
          const idx = text.indexOf('替换记录');
          return idx > 0 ? text.substring(0, idx).trim() : text;
        }
      }
    }
    return null;
  });
  
  if (result) {
    fs.writeFileSync('storage/clipboard/polished-clean.txt', result, 'utf-8');
    console.log('✅ 润色完成，保存到 polished-clean.txt');
  }
  
  // 保持浏览器打开
  await new Promise(() => {});
});
```

---

### 6.1 页面结构

```
┌─────────────────────────────────────────────────────────┐
│  文本润色网站                                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │                                                     ││
│  │  输入文字                                           ││
│  │  (空白文本框)                                       ││
│  │                                                     ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  [润色] [其他按钮...]                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 6.2 操作流程

```javascript
// 1. 点击输入框
await page.click('textarea, [contenteditable="true"], input[type="text"]');

// 2. 粘贴内容 (Ctrl+V)
await page.keyboard.down('Control');
await page.keyboard.press('v');
await page.keyboard.up('Control');

// 或直接输入
await page.fill('textarea', '要润色的文本内容');
```

---

## 八、资源库导入

### 8.1 资源文件

**位置**：`storage/polish/resources.json`

**内容**：
- vocabulary: 词汇表（宏大叙事、古典词汇等）
- banned: 禁用词表（现代网络/商业词汇，带替代词）
- userSettings: 用户设置（古典比例、叙事视角、AI模型）

### 8.2 导入流程

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launchPersistentContext('/workspace/projects/browser/default', {
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--remote-debugging-port=9222']
  });
  const page = browser.pages()[0] || await browser.newPage();
  
  // 🔴 关键：设置对话框处理器，否则弹窗会导致脚本崩溃
  page.on('dialog', async dialog => {
    console.log('弹出对话框:', dialog.type());
    await dialog.accept();
  });
  
  // Step 1: 访问润色网站
  await page.goto('https://7d4jcknzqk.coze.site/');
  await page.waitForTimeout(3000);
  
  // Step 2: 点击资源库
  await page.click('button:has-text("资源库")');
  await page.waitForTimeout(2000);
  
  // Step 3: 点击一键导入
  await page.click('button:has-text("一键导入")');
  await page.waitForTimeout(2000);
  
  // Step 4: 上传文件
  const fileInputs = await page.$$('input[type="file"]');
  const filePath = '/workspace/projects/workspace/projects/novel-sync/storage/polish/resources.json';
  await fileInputs[0].setInputFiles(filePath);
  
  // Step 5: 等待上传完成
  await page.waitForTimeout(5000);
  
  // Step 6: 点击确认（如果有）
  const confirmBtn = await page.$('button:has-text("确认")');
  if (confirmBtn) {
    await confirmBtn.click();
    await page.waitForTimeout(2000);
  }
  
  console.log('导入完成！');
})();
```

### 8.3 注意事项

1. **对话框处理**：必须设置 `page.on('dialog')` 处理器，否则弹窗会导致脚本崩溃
2. **浏览器锁文件**：如果浏览器异常关闭，需删除 `SingletonLock` 文件
3. **文件路径**：必须使用绝对路径

---

## 九、相关文档

- [登录知识](./login.md)
- [网站配置](./site.yaml)
