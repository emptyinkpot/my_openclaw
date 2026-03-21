# 白梦写作 - 润色+替换完整流程

## 一、流程概述

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  打开章节   │ ──→ │  备份内容   │ ──→ │  复制正文   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       │                                       ↓
       │                                ┌─────────────┐
       │                                │  润色内容   │
       │                                │ (调用polish)│
       │                                └─────────────┘
       │                                       │
       │                                       ↓
       │                                ┌─────────────┐
       │                                │ 解析润色结果│
       │                                └─────────────┘
       │                                       │
       ↓                                       ↓
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  返回章节   │ ──→ │  修改标题   │ ──→ │  替换正文   │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ↓
                                       ┌─────────────┐
                                       │    保存     │
                                       └─────────────┘
```

## 二、脚本位置

```
workspace/projects/novel-sync/
├── tasks/
│   └── baimeng/
│       └── polish-and-replace.js    # 主流程脚本
├── src/platforms/
│   ├── baimeng/
│   │   ├── editor.js                # 编辑器操作
│   │   ├── copy.js                  # 复制功能
│   │   └── polish-result.js         # 润色结果处理
│   └── coze/
│       └── polish.js                # 润色流程
└── storage/
    └── clipboard/
        └── polish/                  # 润色结果存储
```

## 三、使用方式

```bash
cd workspace/projects/novel-sync

# 基础用法
node tasks/baimeng/polish-and-replace.js "作品名" 章节号

# 示例
node tasks/baimeng/polish-and-replace.js "变身咳血少女的我也要努力活下去" 66

# 强制重新润色（忽略缓存）
rm /tmp/polish-result-章节号.json
node tasks/baimeng/polish-and-replace.js "作品名" 章节号
```

## 四、模块协作

### 4.1 主流程脚本 (polish-and-replace.js)

```javascript
const baimeng = require('./src/platforms/baimeng');
const polish = require('./src/platforms/coze/polish');
const clipboard = require('lib/utils/clipboard');

// 流程步骤
async function main(workName, chapterNum) {
  // 1. 打开章节
  await baimeng.sidebar.findChapter(page, `第${chapterNum}章`);
  
  // 2. 备份原始内容
  const originalTitle = await baimeng.editor.getTitle(page);
  const originalContent = await baimeng.editor.getContent(page);
  
  // 3. 复制章节内容
  const content = await baimeng.editor.getContent(page);
  
  // 4. 润色内容
  const result = await polish.polishFlow(page, {
    source: 'baimeng',
    work: workName,
    chapter: `第${chapterNum}章`
  });
  
  // 5. 解析润色结果
  const { title, content } = baimeng.polishResult.parsePolishResult(result, {
    chapterNum,
    originalTitle
  });
  
  // 6. 返回章节页面
  await baimeng.sidebar.findChapter(page, `第${chapterNum}章`);
  
  // 7. 修改标题
  await baimeng.editor.setTitle(page, title);
  
  // 8. 替换正文
  await baimeng.editor.setContent(page, content);
  
  // 9. 保存
  await baimeng.editor.save(page);
}
```

### 4.2 编辑器模块 (editor.js)

```javascript
// 获取正文（过滤工具栏）
async function getContent(page) {
  return page.evaluate(() => {
    const editor = document.querySelector('.Daydream');
    const paragraphs = editor.querySelectorAll(':scope > p');
    return Array.from(paragraphs).map(p => p.innerText || '').join('\n\n');
  });
}

// 设置正文（正确分段）
async function setContent(page, content) {
  return page.evaluate((text) => {
    const editor = document.querySelector('.Daydream');
    editor.querySelectorAll(':scope > p').forEach(p => p.remove());
    
    const paragraphs = text.split(/\n\n+/);
    for (const para of paragraphs) {
      const p = document.createElement('p');
      const lines = para.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) p.appendChild(document.createElement('br'));
        p.appendChild(document.createTextNode(lines[i]));
      }
      editor.appendChild(p);
    }
  }, content);
}
```

### 4.3 润色结果处理 (polish-result.js)

```javascript
// 解析润色结果
function parsePolishResult(result, options) {
  const { chapterNum, originalTitle } = options;
  
  // 标题处理
  let title = result.title;
  if (!title) {
    title = originalTitle;  // 保留原标题
  }
  
  // 正文处理
  let content = cleanContent(result.content);
  
  return { title, content };
}

// 清理正文（去除多余内容）
function cleanContent(content) {
  const filterKeywords = [
    '章节概要',
    '总结当前章节概要',
    '批量生成概要',
    '梳理当前章节的核心梗概'
  ];
  
  return content
    .split('\n')
    .filter(line => !filterKeywords.some(kw => line.includes(kw)))
    .join('\n');
}
```

## 五、缓存机制

### 5.1 中间结果缓存

```javascript
// 保存润色结果到临时文件
const cachePath = `/tmp/polish-result-${chapterNum}.json`;
fs.writeFileSync(cachePath, JSON.stringify({
  success: true,
  title: result.title,
  content: result.content,
  path: result.path,
  titleLength: result.title.length,
  contentLength: result.content.length
}));

// 后续步骤优先使用缓存
if (fs.existsSync(cachePath)) {
  console.log('📝 发现已保存的润色结果，直接使用');
}
```

### 5.2 缓存清理（重要）

**⚠️ 强制清理场景**：
1. 润色流程测试完成后，清理缓存
2. 连续润色不同章节时，清理前一章缓存
3. 润色参数修改后，强制清理缓存

```bash
# 清理单个章节缓存
rm -f /tmp/polish-result-64.json

# 清理所有润色缓存
rm -f /tmp/polish-result-*.json

# 正确的运行流程
rm -f /tmp/polish-result-64.json /tmp/polish-result-65.json
node tasks/baimeng/polish-and-replace.js "作品名" 64
node tasks/baimeng/polish-and-replace.js "作品名" 65
```

**案例教训**：2024-03-15 运行时发现旧缓存导致跳过润色，必须手动清理后重新运行
  return JSON.parse(fs.readFileSync(cachePath));
}
```

### 5.2 最终结果存储

```javascript
// 保存到持久化目录
clipboard.saveResult(
  { title, content },
  {
    prefix: `baimeng-${workName}-${chapterNum}`,
    namespace: 'polish',
    meta: { source: 'baimeng', work: workName, chapter: `第${chapterNum}章` },
    keepCount: 3  // 保留最新3组
  }
);
```

## 六、已踩坑记录

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| getContent 包含工具栏文字 | innerText 获取所有子元素 | 只获取 `:scope > p` |
| setContent 段落黏在一起 | 没有分段 | 按 `\n\n` 分割 |
| 段落内换行丢失 | 没有处理单换行 | `\n` → `<br>` |
| 润色结果包含"章节概要" | 提取范围错误 | 过滤关键字行 |
| 标题为空 | 润色网站未生成 | 保留原标题 |
| 调试时反复润色 | 没有缓存机制 | 保存中间结果到 /tmp |

## 七、调试方法论

### 7.1 分步验证

```bash
# 1. 测试获取内容
node -e "
const baimeng = require('./src/platforms/baimeng');
// ... 测试 getContent
"

# 2. 测试润色（使用缓存结果）
node tasks/coze/polish-flow.js --source baimeng --work 作品名 --chapter 66

# 3. 测试完整流程
node tasks/baimeng/polish-and-replace.js 作品名 66
```

### 7.2 保存成功中间结果

```javascript
// 润色成功后立即保存
if (result.success) {
  fs.writeFileSync(`/tmp/polish-result-${chapterNum}.json`, JSON.stringify(result));
  console.log('💾 已保存润色结果到缓存');
}

// 后续测试直接使用缓存
if (fs.existsSync(cachePath) && !forceRep Polish) {
  return JSON.parse(fs.readFileSync(cachePath));
}
```

## 八、扩展指南

### 8.1 添加新平台

```javascript
// 1. 创建平台模块
// src/platforms/new-platform/editor.js
async function getContent(page) { /* ... */ }
async function setContent(page, content) { /* ... */ }
async function getTitle(page) { /* ... */ }
async function setTitle(page, title) { /* ... */ }

// 2. 创建流程脚本
// tasks/new-platform/polish-and-replace.js
const platform = require('./src/platforms/new-platform');
// 复用 polish 模块
```

### 8.2 自定义润色参数

```javascript
// 传递自定义参数
const result = await polish.polishFlow(page, {
  source: 'baimeng',
  work: workName,
  chapter: `第${chapterNum}章`,
  // 自定义参数
  style: 'formal',      // 正式风格
  preserveNames: true,  // 保留人名
  customDict: '/path/to/dict.json'  // 自定义词典
});
```

## 九、相关文档

- [编辑器操作](./editor-operations.md) - 白梦编辑器详细 API
- [润色流程](../coze/polish-flow.md) - Coze 润色流程
- [调试日志](../../workspace/projects/novel-sync/DEBUG_LOG.md) - 问题记录
- [脚本架构](../architecture/scripts.md) - 整体架构

---

## 十、执行经验总结

### 10.1 成功执行记录

**时间**: 2024-03-15  
**任务**: 润色并替换第64章  
**耗时**: 113 秒  
**状态**: ✅ 成功

**执行日志关键点**:
```
✅ 规范已检查过（本次会话有效）
✅ 点击: 第64章，岩手希的铁甲列车抵达
✅ 已备份 (原标题 + 原正文 2636 字)
✅ 已复制: 2636 字
[润色] 元数据: baimeng / 变身咳血少女的我也要努力活下去 / 第64章
[润色] 资源库导入: 导入成功！已导入：词汇 908 条、文献 55 条、禁用词 162 条
[润色] 进度: 19% → 20% → 43% → 44% (进度条正常)
[润色] 正文长度: 2654 字 (润色后略增，正常)
✅ 标题已修改
✅ 正文已替换: 2654 字
✅ 已保存
```

### 10.2 关键成功因素

1. **缓存清理**：
   - 运行前清理了旧的润色缓存 `rm -f /tmp/polish-result-*.json`
   - 避免了使用旧结果导致流程异常

2. **进度条检测**：
   - 检测"分段处理"文字，而非静态百分比
   - 点击后立即开始检测，等待间隔 500ms
   - 进度条正常走完：19% → 20% → 43% → 44% → 消失

3. **资源库导入**：
   - 自动导入资源库（词汇 908 条、文献 55 条、禁用词 162 条）
   - 弹出对话框时自动接受，避免脚本崩溃

4. **标题保留策略**：
   - 润色网站未生成标题时，保留原标题
   - 避免标题丢失问题

5. **正文格式化**：
   - 润色结果正确分段（双换行分隔段落）
   - 对话段落之间有空行

### 10.3 注意事项

**⚠️ 必须清理缓存的场景**：
```bash
# 1. 重新润色同一章节
rm -f /tmp/polish-result-64.json

# 2. 批量润色多个章节（清理前一章缓存）
rm -f /tmp/polish-result-*.json

# 3. 润色参数修改后（强制重新润色）
rm -f /tmp/polish-result-*.json
```

**⚠️ 进度条异常处理**：
- 如果 30 秒内未检测到进度条 → 检查润色网站是否正常
- 如果进度条卡住超过 2 分钟 → 手动刷新页面重试
- 如果进度条走完后结果为空 → 检查输入内容是否过少（<50字）

**⚠️ 保存验证**：
- 保存后刷新页面，确认内容已保存
- 如果保存失败，检查是否有未关闭的对话框

### 10.4 最佳实践

```bash
# 完整的执行流程
# 1. 清理缓存
rm -f /tmp/polish-result-*.json

# 2. 运行脚本
cd workspace/projects/novel-sync
node tasks/baimeng/polish-and-replace.js "变身咳血少女的我也要努力活下去" 64

# 3. 检查结果
# - 查看润色日志是否正常
# - 检查正文长度变化（正常范围 50%-150%）
# - 在白梦平台确认内容已保存

# 4. 更新文档
# - 记录成功/失败经验到 DEBUG_LOG.md
# - 更新本文档的经验总结
```

### 10.5 后续优化方向

1. **自动化缓存清理**：
   - 添加 `--clean-cache` 参数自动清理
   - 或在脚本开始时自动清理前一章缓存

2. **进度条超时处理**：
   - 添加超时重试机制
   - 保存失败时的中间状态

3. **结果验证增强**：
   - 自动对比润色前后长度比例
   - 异常时发送通知或记录日志
