# Code Guard Skill

代码规范守护 - 确保代码符合项目规范

## 功能

- ✅ 检查代码是否使用 runTask() 入口
- ✅ 检查是否导入已验证模块
- ✅ 检查禁止事项（localStorage.clear 等）
- ✅ 检查选择器是否来自字典
- ✅ 提供修复建议

## 触发场景

- 创建或修改 `.js` 文件时自动检查
- 用户输入 `/check` 手动检查
- 用户输入 `/standards` 查看规范

## 规范来源

| 文档 | 用途 |
|------|------|
| `docs/CODING_STANDARDS.md` | 编码规范 |
| `docs/规范快速参考.md` | 快速参考 |
| `docs/已验证代码库.md` | 已验证代码 |
| `docs/元素选择器字典.md` | 选择器字典 |

## 用法

```bash
# 检查单个文件
bash /workspace/projects/auto-scripts/scripts/flows/code-guard.sh check <file>

# 检查所有最近修改
bash /workspace/projects/auto-scripts/scripts/flows/code-guard.sh check-recent

# 显示规范摘要
bash /workspace/projects/auto-scripts/scripts/flows/code-guard.sh summary
```

## 元数据

```json
{
  "name": "code-guard",
  "version": "1.0.0",
  "description": "代码规范守护 - 确保代码符合项目规范",
  "triggers": ["check code", "代码规范", "coding standards", "/check"]
}
```
