# HEARTBEAT.md

# 定期检查任务
# AI 会在收到心跳消息时检查以下内容

## 快速自检命令

```bash
# 完整健康检查
/workspace/projects/workspace/scripts/health-check.sh

# 带自动修复
/workspace/projects/workspace/scripts/health-check.sh --fix
```

## 检查清单（按优先级轮换）

### 高优先级（每次检查）
- [ ] Gateway 进程是否运行
- [ ] 端口 5000 是否响应
- [ ] Hook 是否全部加载成功
- [ ] 浏览器锁文件是否残留（SingletonLock 等）

### 中优先级（每天检查一次）
- [ ] 共享库是否正常加载
- [ ] Skills 完整性（SKILL.md 是否存在）
- [ ] 日志文件是否过大（超过 10MB）

### 低优先级（每周检查一次）
- [ ] 知识库是否需要更新
- [ ] 代码规范是否需要调整
- [ ] 回收站是否需要清理

---

## 心跳响应规则

1. **检查时间**：只在 08:00 - 23:00 之间主动操作
2. **静默时段**：23:00 - 08:00 只回复 HEARTBEAT_OK
3. **批量处理**：多个检查合并为一次报告
4. **避免打扰**：无问题时不发消息，只回复 HEARTBEAT_OK

---

## 自动修复项

当运行 `--fix` 参数时，自动处理：
- 清理残留锁文件
- 清理超大日志文件（>10MB）
- 清理无头浏览器僵尸进程

---

## 状态记录

记录在 `storage/hooks/heartbeat-state.json`:

```json
{
  "lastCheck": "2026-03-16T12:00:00Z",
  "lastClean": "2026-03-15T12:00:00Z",
  "issues": []
}
```
