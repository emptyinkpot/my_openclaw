# 项目概述

## OpenClaw 个人 AI 助手框架配置

### 项目信息
- **项目名称**: OpenClaw Automation
- **创建时间**: 2026-03-12
- **技术栈**: Node.js, Playwright, OpenClaw
- **主要功能**: 白梦写作网自动化操作

### 目录结构

```
/workspace/projects/
├── docs/                    # 文档中心
├── openclaw.json           # OpenClaw 核心配置
├── workspace/
│   └── skills/             # 技能模块
│       ├── baimeng-writer/ # 白梦写作网技能（旧）
│       └── website-automation/  # 通用网站自动化（新）
├── scripts/                # 独立脚本
├── output/                 # 输出目录
│   ├── screenshots/        # 截图
│   └── states/             # 登录状态
└── .coze                   # 环境配置
```

### 核心配置

#### OpenClaw 配置
```json
{
  "gateway": {
    "port": 5000,
    "host": "0.0.0.0"
  },
  "channels": {
    "feishu": {
      "enabled": true
    }
  }
}
```

### 环境要求
- Node.js >= 22
- pnpm >= 10
- Playwright >= 1.58

### 常用命令

```bash
# 重启 Gateway
sh ./scripts/restart.sh

# 检查状态
openclaw doctor
openclaw status --all

# 测试飞书渠道
openclaw message send --to <user_id> --message "测试"
```

### 相关文档
- [技术决策记录](../06-decisions/)
- [架构设计](../05-architecture/)
- [Bug 记录](../03-bugs/)
