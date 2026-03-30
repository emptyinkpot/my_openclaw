# 项目清理定时配置

## 快速开始

### 1. 手动执行清理

```bash
# 预览模式（查看会删除什么，不实际删除）
cd /workspace/projects && node scripts/cleanup.js --dry-run

# 仅清理截图
cd /workspace/projects && node scripts/cleanup.js --screenshots

# 执行全部清理
cd /workspace/projects && node scripts/cleanup.js --all
```

### 2. 设置定时任务

```bash
# 编辑 crontab
crontab -e

# 添加以下行（每天凌晨 2 点执行）
0 2 * * * /workspace/projects/scripts/cleanup-cron.sh
```

## 配置说明

编辑 `scripts/cleanup.js` 开头的 `CONFIG` 对象自定义规则。

## 监控和日志

```bash
# 查看最近的清理报告
ls -la output/cleanup-reports/

# 查看定时任务日志
tail -f output/cleanup-cron.log
```
