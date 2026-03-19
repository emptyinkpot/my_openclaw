# Self-Heal Skill

自我维护系统 - 自动监控、诊断、修复、学习

## 功能

- 🔍 健康检查：监控存储、软链接、知识库、脚本状态
- 🩺 智能诊断：搜索历史问题，匹配解决方案
- 🔧 自动修复：修复软链接、清理缓存、检查规范
- 📚 经验学习：从最近操作中提取经验

## 触发命令

- `/heal` - 执行自我修复
- `/diagnose` - 诊断问题
- `/learn` - 从最近操作学习
- `/report` - 生成健康报告

## 自动触发

| 事件 | 触发动作 |
|------|----------|
| 脚本执行失败 | 自动诊断 |
| 定时（每小时）| 健康检查 |
| 定时（每天） | 清理维护 |

## 经验积累

- 成功经验 → `storage/experience/success.jsonl`
- 失败教训 → `storage/experience/failures.jsonl`
- 健康历史 → `storage/health/history.jsonl`

## 元数据

```json
{
  "name": "self-heal",
  "version": "1.0.0",
  "description": "自我维护系统 - 自动监控、诊断、修复、学习",
  "triggers": ["/heal", "/diagnose", "/learn", "/report", "自我修复", "诊断"]
}
```
