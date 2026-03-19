---
name: page-explorer
description: 智能探索浏览器页面，自动识别页面结构和可交互元素。在操作新页面或遇到选择器问题时使用。
metadata: { "openclaw": { "emoji": "🔍", "requires": { "bins": ["node"] } } }
---

# 页面探索技能

## 功能

智能探索浏览器页面：

1. **元素定位**：查找按钮、输入框、链接等
2. **区域识别**：识别 header、nav、main、aside 等区域
3. **弹窗检测**：发现和处理弹窗、对话框
4. **内容提取**：提取标题、正文、列表内容

## 使用方式

### 探索当前页面

```bash
node {baseDir}/scripts/explore.js
```

### 查找特定元素

```bash
node {baseDir}/scripts/explore.js find "登录按钮"
node {baseDir}/scripts/explore.js find "标题输入框"
```

### 导出页面结构

```bash
node {baseDir}/scripts/explore.js export
```

## 输出示例

```
🔍 页面探索结果

URL: https://baimeng.ai/write
标题: 白梦写作 - 创作中心

📦 页面结构:
├── header (顶部导航)
│   ├── 按钮: 新建作品
│   └── 链接: 返回首页
├── main (主内容区)
│   ├── 输入框: 作品标题
│   ├── 输入框: 章节标题
│   └── 编辑器: 正文内容
└── aside (侧边栏)
    ├── 按钮: 保存
    └── 按钮: 发布

🎯 可交互元素 (12 个):
  [button] "新建作品" → .btn-new
  [textbox] "作品标题" → #title-input
  [textbox] "正文内容" → .editor-content
  ...

⚠️ 注意事项:
  - 检测到弹窗: "确认离开？"
  - 当前焦点: 作品标题输入框
```

## 与其他技能配合

- 配合 `fanqie-novel` 或 `baimeng-writer` 使用
- 当选择器失效时，用此技能重新探索
- 新页面首次操作前，先探索页面结构
