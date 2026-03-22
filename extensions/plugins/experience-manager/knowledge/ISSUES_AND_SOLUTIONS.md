# 问题记录与解决方案

> 记录所有遇到的问题、原因分析和解决方案，按类别分类

---

## 一、浏览器相关问题

### 1.1 浏览器锁文件导致启动失败

| 项目 | 内容 |
|------|------|
| **问题** | `Target page, context or browser has been closed` |
| **原因** | 浏览器非正常关闭，留下 `SingletonLock`、`SingletonSocket`、`SingletonCookie` 锁文件 |
| **解决方案** | 启动浏览器前清理锁文件 |
| **修复位置** | `src/platforms/baimeng/browser.js` 的 `cleanLockFiles()` 函数 |

```javascript
// 解决方案代码
function cleanLockFiles() {
  ['SingletonLock', 'SingletonSocket', 'SingletonCookie', 'Lock'].forEach(f => {
    try { fs.unlinkSync(path.join(BROWSER_DATA, f)); } catch (e) {}
  });
}
```

**预防措施**：在 `browser.launch()` 中自动调用清理函数

---

### 1.2 浏览器超时被关闭

| 项目 | 内容 |
|------|------|
| **问题** | 测试脚本运行超时，浏览器被强制关闭 |
| **原因** | 浏览器保持打开状态，测试脚本超时后进程被杀 |
| **解决方案** | 这是预期行为，不影响脚本功能 |
| **影响** | 需要清理锁文件后才能再次运行 |

---

## 二、登录相关问题

### 2.1 登录状态恢复失败（白屏）

| 项目 | 内容 |
|------|------|
| **问题** | 设置 localStorage 后页面白屏 |
| **原因** | 设置 localStorage 后未刷新页面 |
| **解决方案** | 设置后必须调用 `page.reload()` |
| **修复位置** | `src/platforms/baimeng/auth.js` |

```javascript
// 正确流程
await page.evaluate((items) => {
  for (const [k, v] of Object.entries(items)) {
    localStorage.setItem(k, v);
  }
}, data.localStorage);
await page.reload();  // 关键：必须刷新
```

---

### 2.2 Coze 扣子编程登录失败

| 项目 | 内容 |
|------|------|
| **问题** | 扣子编程页面未登录 |
| **原因** | 扣子编程 (code.coze.cn) 与主站 (www.coze.cn) 是不同域名，需要先在主站设置登录状态 |
| **解决方案** | 先访问主站设置登录状态，再跳转扣子编程 |
| **修复位置** | `tasks/coze/coze-programming.js` |

```javascript
// 正确流程
// Step 1: 先访问主站
await page.goto('https://www.coze.cn/');
// Step 2: 设置 localStorage 和 cookies
await page.evaluate(...);
await context.addCookies(data.cookies);
// Step 3: 再跳转扣子编程
await page.goto('https://code.coze.cn/home');
```

---

### 2.3 禁止使用 localStorage.clear()

| 项目 | 内容 |
|------|------|
| **问题** | 使用 `localStorage.clear()` 后登录状态丢失 |
| **原因** | 白梦写作在 localStorage 中存储了多个配置项，clear() 会删除所有配置 |
| **解决方案** | 直接覆盖设置，不使用 clear() |
| **教训** | 永远不要使用 `localStorage.clear()` |

---

## 三、滚动相关问题

### 3.1 滚动无效

| 项目 | 内容 |
|------|------|
| **问题** | `page.mouse.wheel()` 无效，页面不滚动 |
| **原因** | 目标元素没有焦点 |
| **解决方案** | 滚动前先点击区域获取焦点 |
| **修复位置** | `src/platforms/baimeng/sidebar.js` |

```javascript
// 正确流程
const sidebar = await page.$('[class*="sidebar"]');
const box = await sidebar.boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);  // 获取焦点
await page.waitForTimeout(300);
await page.mouse.wheel(0, 80);  // 然后滚动
```

---

## 四、元素查找问题

### 4.1 中文数字转阿拉伯数字错误

| 项目 | 内容 |
|------|------|
| **问题** | "十一" 被解析为 1 |
| **原因** | 中文数字转换逻辑错误，使用了错误的遍历方向 |
| **解决方案** | 重写 `chineseToNumber` 函数，使用正向遍历和单位乘法 |
| **修复位置** | `src/utils/helper.js` |

```javascript
// 修复后的逻辑
function chineseToNumber(str) {
  const units = { '十': 10, '百': 100, '千': 1000, '万': 10000 };
  const digits = { '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
  
  let result = 0, temp = 0;
  for (const char of str) {
    if (digits[char] !== undefined) {
      temp = digits[char];
    } else if (units[char]) {
      if (temp === 0) temp = 1;  // 处理 "十一" 的情况
      result += temp * units[char];
      temp = 0;
    }
  }
  return result + temp;
}
```

---

### 4.2 修改内容卡片按钮不显示

| 项目 | 内容 |
|------|------|
| **问题** | 找不到"替换正文"按钮 |
| **原因** | 按钮在悬停时才显示 |
| **解决方案** | 先触发 `mouseenter` 事件，等待后再点击 |
| **修复位置** | `src/platforms/baimeng/modify-card.js` |

```javascript
// 正确流程
await page.evaluate(() => {
  const card = [...document.querySelectorAll('*')]
    .find(el => el.innerText?.match(/修改内容.*\d+字/));
  card?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
});
await page.waitForTimeout(500);  // 等待按钮显示
// 然后点击
```

---

## 五、章节对应问题

### 5.1 替换错章节

| 项目 | 内容 |
|------|------|
| **问题** | 替换了错误的章节内容 |
| **原因** | 打开的章节与要替换的章节不一致 |
| **解决方案** | 添加章节对应验证逻辑 |
| **修复位置** | `src/platforms/baimeng/verify.js` |

```javascript
// 验证逻辑
async function verifyChapterMatch(page, expectedChapter) {
  // 检查侧边栏高亮章节
  const sidebarChapter = document.querySelector('[class*="active"]')?.innerText?.match(/第.+章/)?.[0];
  // 检查修改内容卡片章节
  const cardChapter = [...document.querySelectorAll('*')]
    .find(el => el.innerText?.match(/修改内容.*\d+字/))?.innerText?.match(/第.+章/)?.[0];
  
  // 判断是否匹配
  return { match: ..., warning: ... };
}
```

---

## 六、项目结构问题

### 6.1 脚本分类混乱

| 项目 | 内容 |
|------|------|
| **问题** | 所有脚本都在根目录，分类不清 |
| **解决方案** | 创建分类目录：`tasks/`, `probes/`, `scripts/` |
| **状态** | ✅ 已解决 |

### 6.2 代码重复

| 项目 | 内容 |
|------|------|
| **问题** | 多个脚本有重复逻辑（删除内容、替换正文等） |
| **解决方案** | 拆分为基础模块：`editor.js`, `modify-card.js`, `verify.js` |
| **状态** | ✅ 已解决 |

---

## 七、问题排查流程

```
遇到问题
    │
    ▼
Step 1: 查看 DEBUG_LOG.md 和本文档
    │
    ▼
Step 2: 检查浏览器锁文件
    │   rm -f browser/*/Singleton*
    │
    ▼
Step 3: 检查登录状态
    │   - 是否先访问首页？
    │   - 是否刷新页面？
    │   - 是否禁止了 localStorage.clear()？
    │
    ▼
Step 4: 检查焦点问题
    │   - 滚动前是否点击获取焦点？
    │   - 按钮是否需要悬停？
    │
    ▼
Step 5: 检查章节对应
    │   - 侧边栏章节 = 目标章节？
    │   - 卡片章节 = 目标章节？
    │
    ▼
Step 6: 记录问题到本文档
```

---

## 八、快速诊断表

| 症状 | 可能原因 | 解决方案 |
|------|----------|----------|
| 浏览器启动失败 | 锁文件存在 | 清理 `SingletonLock` 等文件 |
| 页面白屏 | 登录状态未生效 | localStorage 后刷新页面 |
| 滚动无效 | 元素没有焦点 | 先点击获取焦点 |
| 点击无效 | 元素被遮挡 | 使用 JS 的 `el.click()` |
| 按钮不显示 | 需要悬停 | 触发 `mouseenter` 事件 |
| 元素找不到 | 选择器错误 | 探测页面，更新选择器 |
| 数据为空 | 获取方式错误 | 检查选择器和数据源 |
| 中文数字错误 | 转换逻辑错误 | 使用 `chineseToNumber` |
| 替换错章节 | 章节不对应 | 添加验证逻辑 |
| Coze 未登录 | 未访问主站 | 先访问 www.coze.cn |

---

## 八、内容审核与发布问题（2024.03 新增）

### 8.1 润色配置硬编码导致不适配网站更新

| 项目 | 内容 |
|------|------|
| **问题** | 审核规则写死在代码中，润色网站更新功能后审核失效 |
| **原因** | 硬编码规则，无法感知网站配置变化 |
| **解决方案** | 创建 `PolishFeatureDetector` 动态探测网站功能 |
| **修复位置** | `task-planner/services/PolishFeatureDetector.js` |

```javascript
// 动态探测润色网站配置
const detector = new PolishFeatureDetector();
const features = await detector.detectFromPage(page);
// features = { disableMarkdown: true, useJapanesePunctuation: true, ... }

// 更新审核器配置
validator.updatePolishConfig(features);
```

**教训**：不要硬编码外部系统的配置，要动态感知

---

### 8.2 润色后信息丢失

| 项目 | 内容 |
|------|------|
| **问题** | 润色后章节丢失了原文的关键信息（人名、地名、数字、事件） |
| **原因** | 只检查格式和垃圾内容，没有比对信息量 |
| **解决方案** | 新增 `checkInformationRetention()` 信息量比对 |
| **修复位置** | `task-planner/services/ContentValidator.js` |

```javascript
// 提取关键信息并比对
const infoResult = validator.checkInformationRetention(original, polished);
// infoResult.retentionRate = 0.75 (75%保留率)
// infoResult.missingInfo = ['1937年', '5万', '宋哲元'] // 丢失的信息
```

**关键点**：
- 提取：年份、日期、人名、地名、关键事件
- 比对：允许描述不同，但核心信息不能丢失
- 阈值：默认保留率 70%

---

### 8.3 今日发布判断不准确

| 项目 | 内容 |
|------|------|
| **问题** | 只依赖本地数据库判断今天发布了几章，数据不准确 |
| **原因** | 没有从番茄平台获取实际更新数据 |
| **解决方案** | 从番茄扫描结果获取实际更新情况 |
| **修复位置** | `task-planner/scheduler.js` 的 `analyzeFanqieTodayUpdate()` |

```javascript
// 正确做法：从平台获取实际数据
const updateInfo = analyzeFanqieTodayUpdate(fanqieWork);
// updateInfo = {
//   updated: true,           // 今天是否更新
//   chapters: 2,             // 今天发布了几章
//   lastChapter: 66,         // 最新章节号
//   effectiveChapters: 2     // 有效发布章数
// }
```

**教训**：数据源要以平台实际数据为准，本地数据库只是备份

---

### 8.4 审核未通过就发布

| 项目 | 内容 |
|------|------|
| **问题** | 章节润色后直接发布，没有检查审核状态 |
| **原因** | 发布逻辑没有检查 `audit_status` 字段 |
| **解决方案** | 发布前必须检查 `audit_status === 'passed'` |
| **修复位置** | `task-planner/scheduler.js` 的 `autoPublishToFanqie()` |

```javascript
// 发布前的完整检查流程
const status = getChapterStatus(workId, chapterNum);

// 1. 检查是否已润色
if (status.status !== 'polished') {
  // 触发润色
}

// 2. 检查审核状态（核心）
if (status.auditStatus !== 'passed') {
  // 审核未通过，不能发布
  if (status.suggestedAction === 'autofix') {
    // 尝试自动修复
  } else if (status.suggestedAction === 'manual') {
    // 需要人工干预
  }
  return;
}

// 3. 审核通过才能发布
await publishToFanqie(title);
```

**教训**：发布是最后一步，必须确保前置条件全部满足

---

## 九、经验积累机制（重要！）

### 9.1 经验存储位置

| 类型 | 路径 |
|------|------|
| 经验存储工具 | `auto-scripts/src/utils/experience-store.js` |
| 成功经验 | `auto-scripts/storage/experience/success.jsonl` |
| 失败经验 | `auto-scripts/storage/experience/failures.jsonl` |
| 知识库索引 | `knowledge/INDEX.md` |
| 问题解决方案 | `knowledge/ISSUES_AND_SOLUTIONS.md` |

### 9.2 每次编程时必须做的事

```
开始任务
    │
    ▼
Step 1: 查看 knowledge/INDEX.md 了解知识库结构
    │
    ▼
Step 2: 查看相关平台的 knowledge/<platform>/ 目录
    │
    ▼
Step 3: 查看 ISSUES_AND_SOLUTIONS.md 是否有类似问题
    │
    ▼
Step 4: 编写代码，解决问题
    │
    ▼
Step 5: 将新学到的经验写入 ISSUES_AND_SOLUTIONS.md
    │
    ▼
Step 6: 使用 experience-store 记录成功/失败案例
```

### 9.3 经验记录格式

```javascript
// 记录成功案例
const store = require('./src/utils/experience-store');
store.recordSuccess(
  { id: 'AUTH_EXPIRED', type: 'auth', severity: 'high' },
  '登录状态过期',
  { platform: 'baimeng', action: 'restoreLogin' },
  { action: 'reload-after-localstorage', attempts: 1 }
);

// 记录失败案例
store.recordFailure(
  { id: 'SELECTOR_NOT_FOUND', type: 'element', severity: 'medium' },
  '找不到编辑器元素',
  { platform: 'baimeng', selector: '.ProseMirror' }
);
```

### 9.4 核心经验总结

| 类别 | 经验 |
|------|------|
| **配置感知** | 不要硬编码外部系统配置，要动态探测 |
| **数据来源** | 优先使用平台实际数据，本地数据库作为备份 |
| **信息完整性** | 内容转换后要检查信息量是否丢失 |
| **发布条件** | 发布前必须检查所有前置条件（润色、审核） |
| **错误处理** | 记录失败原因和建议操作，方便后续处理 |
| **知识积累** | 每次解决问题后必须更新知识库 |
