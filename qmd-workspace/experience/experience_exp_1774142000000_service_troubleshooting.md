# 服务反复启动失败问题排查与修复

**ID**: exp_1774142000000_service_troubleshooting
**类型**: problem_solving
**难度**: 3/5
**经验值**: 150
**日期**: 2026-03-22

## 问题描述
用户反馈服务总会启动失败，进程退出码为1。通过深入调查日志和系统状态，发现了问题根源并修复。

## 解决方案
## 问题排查过程

### 1. 初步状态检查
- 运行 `openclaw status --all` 查看整体状态
- 发现 Gateway 实际上是在运行的（端口 5000 被占用）
- 运行 `openclaw gateway probe` 显示服务可达

### 2. 深入日志分析
- 查看完整的日志文件 `/tmp/openclaw/openclaw-2026-03-22.log`
- 发现服务实际上一直在正常启动，没有崩溃错误
- 但服务一直在收到 `SIGTERM` 信号被关闭
- 注意：SIGTERM 是外部终止信号，不是服务自己崩溃

### 3. 系统检查
- 检查 crontab：`crontab -l`
- 发现有定时任务在运行不存在的脚本：
  - `0 * * * * /workspace/projects/auto-scripts/bin/auto-health-check.sh`
  - 这个脚本路径不存在
- 检查进程：发现有 cloud-monitor-agent 在运行

### 4. 问题修复
- 备份当前 crontab：`crontab -l > /tmp/crontab.bak`
- 移除引用不存在脚本的定时任务：`grep -v "auto-scripts" /tmp/crontab.bak | crontab -`
- 验证服务正常运行

## 关键发现
1. **服务并没有崩溃** - 退出码 1 的说法可能来自其他地方
2. **SIGTERM 不是崩溃** - 这是外部发送的终止信号
3. **不要轻易假设是架构问题** - 先看日志、看状态、看事实
4. **crontab 清理** - 定期检查定时任务，移除无效项

## 应用的经验
- 日志分析技巧
- 系统状态排查
- 问题定位方法论

## 获得的经验
- SIGTERM 是外部终止信号，不是服务自己崩溃
- 排查问题的顺序：先看状态 → 再看日志 → 再猜原因
- crontab 中如果有引用不存在脚本的任务，应该清理掉
- 退出码 1 不一定是服务崩溃，要看具体上下文
- 不要轻易假设是架构问题，先基于事实判断
- openclaw status --all 和 openclaw gateway probe 是快速检查的好工具

## 标签
`服务排查` `日志分析` `crontab` `SIGTERM` `问题定位` `OpenClaw`

---
*从经验管理模块同步*
