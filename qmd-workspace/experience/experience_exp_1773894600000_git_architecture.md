# Git 索引与多模块架构问题排查

**ID**: exp_1773894600000_git_architecture
**类型**: problem_solving
**难度**: 5/5
**经验值**: 250
**日期**: 2026-03-19

## 问题描述
在重构经验积累模块过程中，遇到了多个架构和配置问题：1) .gitignore 白名单模式导致新文件未被 Git 跟踪；2) OpenClaw 插件 API 路径与独立服务路径混淆；3) 数据库配置不一致导致连接失败；4) TypeScript 源码修改后未重新编译导致运行时错误。

## 解决方案
1. 将 .gitignore 从白名单模式改为黑名单模式，追踪所有文件只忽略特定目录；2. 明确区分 extensions/novel-manager(插件，路径/novel/api/) 和 apps/novel-manager(独立服务，路径/api/novel/)；3. 统一数据库配置，修正密码为 Lgp15237257500；4. 修改 TypeScript 后必须执行 pnpm build 重新编译；5. 使用 grep_file 快速定位代码位置，使用 exec_shell 验证服务状态

## 应用的经验
- Git 配置管理
- OpenClaw 插件架构
- Node.js 服务调试
- 数据库连接配置

## 获得的经验
- .gitignore 白名单vs黑名单模式
- OpenClaw 插件路由机制(/novel/api/)
- TypeScript 编译同步
- 多模块项目架构管理(apps vs extensions)
- MySQL 连接配置
- 服务重启最佳实践

## 标签
`git` `openclaw` `typescript` `architecture` `debugging` `mysql` `module`

---
*从经验管理模块同步*
