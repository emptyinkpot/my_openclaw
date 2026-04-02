# Bash 命令超时解决方案

## 问题背景

`exec_shell` 工具默认超时约 3 分钟，当命令执行时间较长时会"卡住"，导致：
- 用户等待时间过长
- 无法及时获取反馈
- 影响开发效率

## 解决方案

### 方案一：使用 `run.sh` 快捷脚本（推荐）

```bash
# 默认 60s 超时
./scripts/run.sh node tasks/test.js

# 指定超时时间
./scripts/run.sh 120 npm run build

# 后台运行（不阻塞）
./scripts/run.sh bg "node server.js"
```

### 方案二：使用 `run-with-timeout.sh`

```bash
# 指定超时 + 命令
./scripts/run-with-timeout.sh 60 node tasks/test.js

# 使用默认 60s 超时
./scripts/run-with-timeout.sh node tasks/test.js
```

### 方案三：直接使用 `timeout` 命令

```bash
# 60 秒超时
timeout 60 node tasks/test.js

# 带退出码保留
timeout --preserve-status 60 node tasks/test.js
```

## 使用建议

| 场景 | 推荐方案 | 示例 |
|------|----------|------|
| 短命令（< 60s） | 直接执行 | `ls -la` |
| 中等命令（60-120s） | `run.sh` | `./scripts/run.sh 120 npm test` |
| 长命令（> 120s） | 后台模式 | `./scripts/run.sh bg "npm run build"` |
| 润色脚本 | 120s 超时 | `./scripts/run.sh 120 node tasks/coze/polish-flow.js` |

## 退出码说明

| 退出码 | 含义 |
|--------|------|
| 0 | 成功 |
| 124 | 超时 |
| 其他 | 命令自身错误 |

## 最佳实践

1. **预估执行时间**：根据命令类型选择合适的超时时间
2. **后台运行长任务**：构建、部署等长时间任务用 `bg` 模式
3. **查看后台日志**：`tail -f /tmp/openclaw/run-bg.log`
