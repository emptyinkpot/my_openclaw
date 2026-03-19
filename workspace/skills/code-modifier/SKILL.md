---
name: code-modifier
description: 结构化的代码修改工作流。当用户要求修改 auto-scripts 项目代码时使用此技能。支持多阶段确认，确保代码质量和规范。
metadata: { "openclaw": { "emoji": "🔄", "requires": { "bins": ["node"] } } }
---

# 代码修改工作流

## 功能

这是一个基于 LangGraph 的结构化代码修改流程，支持：

1. **分析阶段**：理解用户需求，识别目标模块和风险级别
2. **知识检查**：自动搜索已验证模块、选择器和历史问题
3. **规划阶段**：制定详细的修改计划
4. **确认阶段**：等待用户确认（必须确认才能继续）
5. **执行阶段**：执行代码修改
6. **验证阶段**：验证修改结果

## 使用方式

### 开始新的修改流程

```bash
node {baseDir}/scripts/cli.js start "修改白梦登录模块"
```

### 确认/取消待处理的修改

```bash
node {baseDir}/scripts/cli.js confirm <workflow-id>
node {baseDir}/scripts/cli.js cancel <workflow-id>
```

### 查看待处理的修改

```bash
node {baseDir}/scripts/cli.js list
```

### 查看工作流状态

```bash
node {baseDir}/scripts/cli.js status <workflow-id>
```

## 多阶段确认流程

```
用户请求 → 分析 → 知识检查 → 规划 → [等待确认] → 执行 → 验证
                                      ↑
                                  用户必须确认
                                  
如果用户取消，工作流终止。
如果用户确认，继续执行。
```

## 生成的内容

工作流会在每个阶段生成详细报告：

- 分析报告：意图、目标模块、风险级别
- 知识报告：相关模块、选择器、历史问题
- 规划报告：修改步骤、使用的模块、警告
- 确认消息：完整的修改计划供用户确认
- 执行报告：修改的文件和结果
- 验证报告：检查结果和最终状态
