---
name: analyze-page
description: 深度分析当前浏览器页面，获取完整的页面结构和可交互元素列表。当需要了解页面内容、查找元素、调试选择器时使用此技能。
metadata: { "openclaw": { "emoji": "🔍", "requires": { "bins": ["node"] } } }
---

# 页面分析技能

## 功能

深度分析浏览器当前打开的页面，获取：

1. **页面摘要**：标题、URL、区域划分
2. **可交互元素**：按钮、输入框、链接等
3. **Accessibility Tree**：无障碍树结构
4. **DOM 快照**：完整的 HTML 结构

## 使用方式

### 快速分析

```bash
node {baseDir}/scripts/analyze.js quick
```

输出简洁的页面信息，适合实时使用。

### 深度分析

```bash
node {baseDir}/scripts/analyze.js deep [name]
```

保存完整的页面快照，适合调试和存档。

### 生成 AI 提示

```bash
node {baseDir}/scripts/analyze.js prompt
```

生成适合 AI 理解的页面描述。

## 输出文件

深度分析会生成：

- `{name}.json` - 完整快照
- `{name}-a11y.txt` - Accessibility Tree 描述

文件保存在 `/workspace/projects/storage/page-snapshots/`

## 示例输出

```
# 页面分析

**URL**: https://baimeng.ai/write
**标题**: 白梦写作 - 创作

## 标题结构
- H1: 我的作品
- H2: 最近编辑

## 页面区域
- **main**: 800x600, 5 个按钮, 2 个输入框, 10 个链接
- **aside**: 200x600, 3 个按钮, 0 个输入框, 8 个链接

## 可交互元素

### buttons (5 个)
- `.btn-new` "新建作品"
- `.btn-edit` "编辑"
- ...

### inputs (2 个)
- `#search` [placeholder: 搜索作品]
- ...
```
