# 项目文档中心

> 📚 完整的项目文档系统

## 快速导航

| 文档 | 用途 | 必读 |
|------|------|------|
| **[FEISHU-COMMANDS.md](FEISHU-COMMANDS.md)** | **飞书机器人指令手册（自动生成）** | ⭐⭐⭐ |
| **[AI-CODING-STANDARD.md](AI-CODING-STANDARD.md)** | **AI 编码规范（强制执行）** | ⭐⭐⭐⭐⭐ |
| **[PROJECT-HANDBOOK.md](PROJECT-HANDBOOK.md)** | **完整操作手册（674行）** | ⭐⭐⭐⭐ |
| [09-beginner-guide.md](09-beginner-guide.md) | 零基础入门教程 | ⭐⭐⭐⭐ |
| [AUTOMATION-DASHBOARD.md](AUTOMATION-DASHBOARD.md) | 文档自动化仪表盘 | ⭐⭐⭐ |

## 目录结构

```
docs/
├── AI-CODING-STANDARD.md       ← AI 编码规范（强制执行）
├── PROJECT-HANDBOOK.md          ← 完整操作手册（674行）
├── 09-beginner-guide.md          ← 零基础入门（技术概念详解）
├── AUTOMATION-DASHBOARD.md       ← 自动化仪表盘
├── README.md                     ← 本文档（文档中心索引）
│
├── 01-project/                   ← 项目概述
├── 02-scripts/                   ← 脚本文档（自动生成）
├── 03-bugs/                      ← Bug 记录
├── 04-api/                       ← API 文档（自动生成）
├── 05-architecture/              ← 架构设计
├── 06-decisions/                 ← 技术决策记录
├── 07-todos/                     ← 任务追踪
└── tools/                        ← 文档工具
```

## 重要文档

### 🤖 飞书指令手册（自动更新）
**[FEISHU-COMMANDS.md](FEISHU-COMMANDS.md)** - 记录所有机器人指令和回复

- 自动从 `feishu-handler.js` 代码中提取
- 包含：触发指令、参数说明、回复示例
- 更新命令：`node docs/tools/update-feishu-docs.js`

### 🎯 AI 编码规范（必读）
**[AI-CODING-STANDARD.md](AI-CODING-STANDARD.md)** - 我编写代码时必须遵循的规范

包含内容：
- **命名规范** - 变量、函数、常量、布尔值的命名规则
- **代码风格** - 缩进、空格、行长度、字符串格式
- **注释规范** - JSDoc、复杂逻辑、TODO、禁止事项
- **错误处理** - try-catch、自定义错误、日志记录
- **函数设计** - 长度限制、参数设计、提前返回、默认参数
- **安全规范** - 输入验证、敏感信息脱敏、SQL注入防护
- **性能规范** - 缓存、并行异步、资源释放
- **测试规范** - 单元测试、覆盖率要求
- **检查清单** - 代码提交前检查、Code Review 检查

### 📖 项目操作手册
**[PROJECT-HANDBOOK.md](PROJECT-HANDBOOK.md)** - 674行完整操作指南

## 快速开始

**新手入门**：
1. 先看 [PROJECT-HANDBOOK.md](PROJECT-HANDBOOK.md) 第 1-2 章
2. 不懂的概念查 [09-beginner-guide.md](09-beginner-guide.md)
3. 遇到问题查手册第 4 章"常见问题排查"

**日常使用**：
```bash
# 查看命令速查表
grep "## 六、命令速查表" PROJECT-HANDBOOK.md -A 50

# 查看问题排查
grep "## 四、常见问题排查" PROJECT-HANDBOOK.md -A 100

# 查看编码规范
cat AI-CODING-STANDARD.md
```

## 文档分类

### 规范类（强制执行）
- [AI-CODING-STANDARD.md](AI-CODING-STANDARD.md) - AI 编码规范

### 操作类（必读）
- [PROJECT-HANDBOOK.md](PROJECT-HANDBOOK.md) - 完整操作手册
- [09-beginner-guide.md](09-beginner-guide.md) - 零基础入门

### 参考类（按需查阅）
- [02-scripts/INDEX.md](02-scripts/INDEX.md) - 脚本清单
- [04-api/automation.md](04-api/automation.md) - API 文档
- [CHANGELOG.md](CHANGELOG.md) - 变更日志

### 知识类（深度学习）
- [03-bugs/README.md](03-bugs/README.md) - Bug 修复经验
- [06-decisions/README.md](06-decisions/README.md) - 技术决策
- [05-architecture/README.md](05-architecture/README.md) - 架构设计

## 自动化工具

```bash
# 检测代码变更并更新文档
cd docs/tools && node watch-and-sync.js

# 手动生成所有文档
cd docs/tools && node generate-docs.js

# 生成 API 文档
cd docs/tools && node auto-generate-api.js

# 更新飞书指令文档（从代码自动生成）
cd docs/tools && node update-feishu-docs.js

# 一键更新所有文档
cd docs/tools && ./auto-update-all.sh
```

## 文档规范

1. **文件命名**: `YYYYMMDD-描述.md` 或 `大写-描述.md`
2. **编码**: UTF-8
3. **格式**: Markdown
4. **更新频率**: 操作手册随功能更新，技术文档随代码更新

---

*文档中心最后更新: 2026-03-12*  
*文档总数: 10+*  
*总字数: 约 15000+ 字*
