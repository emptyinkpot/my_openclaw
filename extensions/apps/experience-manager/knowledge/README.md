# OpenClaw 知识库

## 目录

| 文档 | 描述 | 适用场景 |
|------|------|----------|
| [openclaw-troubleshooting.md](./openclaw-troubleshooting.md) | 故障排查指南 | 飞书机器人出问题时查阅 |
| [playwright-best-practices.md](./playwright-best-practices.md) | Playwright 最佳实践 | 开发自动化脚本时参考 |
| [openclaw-skill-development.md](./openclaw-skill-development.md) | SKILL 开发规范 | 新增平台 SKILL 时参考 |

### 平台专项文档

| 平台 | 文档 | 描述 |
|------|------|------|
| 白梦写作 | [baimeng/editor-operations.md](./baimeng/editor-operations.md) | 编辑器操作 API |
| 白梦写作 | [baimeng/polish-replace-workflow.md](./baimeng/polish-replace-workflow.md) | 润色+替换完整流程 |
| Coze 扣子 | [coze/operations.md](./coze/operations.md) | 扣子编程操作流程 |
| Coze 扣子 | [coze/polish-troubleshooting.md](./coze/polish-troubleshooting.md) | 润色问题排查 |

### 架构文档

| 文档 | 描述 |
|------|------|
| [architecture/scripts.md](./architecture/scripts.md) | 脚本架构总览 |
| [coding/bash-timeout.md](./coding/bash-timeout.md) | Bash 超时解决方案 |

## 快速索引

### 故障排查

```
问题: 飞书消息无响应
  → 检查 Gateway: curl http://localhost:5000/health
  → 查看日志: grep "tool call" /tmp/openclaw/*.log

问题: 反复要求扫码
  → 检查备份: ls cookies-accounts/
  → 检查浏览器: ls browser/default/

问题: AI 不调用脚本
  → 检查 SKILL: openclaw skills list
  → 删除干扰 SKILL
```

### 开发模板

```bash
# 新增平台
mkdir -p workspace/skills/{platform}/scripts

# 创建 SKILL.md
cat > workspace/skills/{platform}/SKILL.md << 'EOF'
---
name: {platform}
description: {描述}。触发关键词："{关键词}"
metadata: { "openclaw": { "emoji": "📝" } }
---
# 执行命令: node {baseDir}/scripts/main.js
EOF

# 创建脚本（参考 playwright-best-practices.md 模板）
```

### 关键命令

```bash
# Gateway
openclaw gateway                    # 启动
curl http://localhost:5000/health   # 检查
sh scripts/restart.sh               # 重启

# SKILL
openclaw skills list                # 列表
openclaw doctor                     # 诊断

# 日志
tail -f /tmp/openclaw/openclaw-*.log
grep "tool call\|error" /tmp/openclaw/*.log
```

### 平台直接URL（绕过手动操作）

| 平台 | 直接URL | 说明 |
|------|---------|------|
| Coze 项目管理 | `https://code.coze.cn/w/7587425486419378228/projects` | 无需点击侧边栏 |
| Coze 文本润色网站 | 项目管理 → 点击"文本润色网站" | AI 文本润色应用 |
| 白梦章节编辑 | `https://write.baimeng.ai/novel/{book_id}/chapter/{chapter_id}/edit` | 直接编辑页面 |

## 核心规范

1. **单 SKILL 原则**：每个平台只有一个 SKILL
2. **共享浏览器**：所有平台使用 `browser/default/`
3. **统一备份**：登录状态存 `cookies-accounts/`
4. **JSON 输出**：脚本统一输出 JSON 格式
5. **先看日志**：排查时先看 AI 实际调用了什么

## 文件位置

```
/workspace/projects/
├── browser/default/              # 浏览器数据
├── cookies-accounts/             # 登录备份
├── workspace/skills/             # SKILL 目录
├── lib/                          # 核心代码库
└── knowledge/                    # 本知识库
```
