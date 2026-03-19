# OpenClaw 插件与 Skills 收集

> 数据来源: [awesome-openclaw-skills](https://github.com/VoltAgent/awesome-clawdbot-skills) (5366+ Skills)
> 更新时间: 2026-03-07

## 安装方法

```bash
# 方法1: ClawHub CLI (推荐)
clawhub install <skill-slug>

# 方法2: 手动安装
# 复制 skill 文件夹到以下位置之一:
# - 全局: ~/.openclaw/skills/
# - 工作区: <project>/skills/
```

---

## 国内常用服务

### 飞书 / Lark

| Skill | 描述 | 安装命令 |
|-------|------|----------|
| `feishu-common` | 飞书认证和 API 公共模块 | `clawhub install feishu-common` |
| `feishu-sheets` | 飞书在线表格操作（创建/读取/写入） | `clawhub install feishu-sheets` |
| `feishu-calendar` | 飞书日历管理 | `clawhub install feishu-calendar` |
| `feishu-card` | 发送飞书交互式卡片消息 | `clawhub install feishu-card` |
| `feishu-bitable-creator` | 创建和填充飞书多维表格 | `clawhub install feishu-bitable-creator` |
| `feishu-meeting-assistant` | 扫描飞书日程并读取附件内容 | `clawhub install feishu-meeting-assistant` |
| `feishu-file-sender` | 通过飞书发送文件 | `clawhub install feishu-file-sender` |
| `feishu-voice-assistant` | 发送语音消息到飞书 | `clawhub install feishu-voice-assistant` |
| `feishu-memory-recall` | 恢复"丢失"的记忆 | `clawhub install feishu-memory-recall` |
| `feishu-minutes` | 获取飞书会议纪要 | `clawhub install feishu-minutes` |
| `lark-calendar` | Lark 日历事件管理 | `clawhub install lark-calendar` |
| `lark-toolkit` | 综合飞书/Lark API 工具集 | `clawhub install lark-toolkit` |
| `lark-report-collector` | 收集周报并汇总到飞书文档 | `clawhub install lark-report-collector` |
| `aliyun-asr` | 阿里云语音识别（支持飞书渠道） | `clawhub install aliyun-asr` |

### 其他国内服务

| Skill | 描述 | 安装命令 |
|-------|------|----------|
| `webhook-robot` | 发送消息到企业微信/钉钉/飞书机器人 | `clawhub install webhook-robot` |
| `a-share-real-time-data` | 获取中国 A 股实时行情数据 | `clawhub install a-share-real-time-data` |
| `baidu-search` | 百度 AI 搜索引擎 | `clawhub install baidu-search` |
| `baidu-scholar-search` | 百度学术搜索 | `clawhub install baidu-scholar-search` |
| `daily-news` | 每日获取百度/Google热门新闻 | `clawhub install daily-news` |

---

## GitHub & Git 集成 (166 Skills)

| Skill | 描述 | 安装命令 |
|-------|------|----------|
| `gh` | GitHub CLI 封装 - 仓库/Issue/PR 管理 | `clawhub install gh` |
| `gh-action-gen` | 从自然语言生成 GitHub Actions 工作流 | `clawhub install gh-action-gen` |
| `git-changelog` | 自动生成 Git 变更日志 | `clawhub install git-changelog` |
| `auto-pr-merger` | 自动化 GitHub PR 合并流程 | `clawhub install auto-pr-merger` |
| `gh-extract` | 从 GitHub URL 提取内容 | `clawhub install gh-extract` |
| `alex-session-wrap-up` | 会话结束自动提交代码并提取经验 | `clawhub install alex-session-wrap-up` |
| `clawdbot-backup` | 备份恢复 OpenClaw 配置和技能 | `clawhub install clawdbot-backup` |
| `code-share` | 通过 GitHub Gist 分享代码 | `clawhub install code-share` |
| `commit-analyzer` | 分析 Git 提交模式监控自主行为 | `clawhub install commit-analyzer` |

---

## 浏览器自动化 (320 Skills)

| Skill | 描述 | 安装命令 |
|-------|------|----------|
| `agent-browser` | Rust 高性能无头浏览器自动化 | `clawhub install agent-browser` |
| `2captcha` | 通过 2Captcha 服务解决验证码 | `clawhub install 2captcha` |
| `anycrawl` | AnyCrawl API - 网页抓取/爬虫 | `clawhub install anycrawl` |
| `api-tester` | HTTP/HTTPS API 测试工具 | `clawhub install api-tester` |
| `android-adb` | 通过 ADB 控制 Android 设备 | `clawhub install android-adb` |
| `activecampaign` | ActiveCampaign CRM 集成 | `clawhub install activecampaign` |

---

## 搜索与研究 (352 Skills)

| Skill | 描述 | 安装命令 |
|-------|------|----------|
| `exa-search-free` | 免费 AI 搜索 via Exa | `clawhub install exa-search-free` |
| `bing-search` | Bing 搜索 | `clawhub install bing-search` |
| `airbnb` | 搜索 Airbnb 房源 | `clawhub install airbnb` |
| `academic-deep-research` | 透明严谨的学术研究 | `clawhub install academic-deep-research` |
| `arxiv-osiris` | 搜索下载 arXiv 论文 | `clawhub install arxiv-osiris` |
| `agent-brain` | 本地优先的 AI 持久化记忆 | `clawhub install agent-brain` |
| `aisa-twitter-skill` | 实时搜索 X/Twitter | `clawhub install aisa-twitter-skill` |
| `aisa-youtube-search` | YouTube 搜索 | `clawhub install aisa-youtube-search` |
| `geepers-data` | 从 17 个权威 API 获取数据 | `clawhub install geepers-data` |

---

## 图像与视频生成 (169 Skills)

| Skill | 描述 | 安装命令 |
|-------|------|----------|
| `fal-ai` | 通过 fal.ai API 生成图像/视频/音频 | `clawhub install fal-ai` |
| `eachlabs-image-generation` | Flux/GPT Image/Gemini 图像生成 | `clawhub install eachlabs-image-generation` |
| `eachlabs-video-generation` | AI 视频生成 | `clawhub install eachlabs-video-generation` |
| `cheapest-image` | 最便宜的 AI 图像生成 (~$0.0036/张) | `clawhub install cheapest-image` |
| `best-image` | 最佳质量 AI 图像生成 (~$0.12-0.20/张) | `clawhub install best-image` |
| `ai-avatar-generation` | AI 头像生成 | `clawhub install ai-avatar-generation` |
| `ai-headshot-generation` | 专业 AI 证件照生成 | `clawhub install ai-headshot-generation` |
| `gamma` | AI 演示文稿/文档生成 | `clawhub install gamma` |
| `canva-connect` | Canva 设计管理 API | `clawhub install canva-connect` |
| `figma` | Figma 设计分析和资源导出 | `clawhub install figma` |

---

## AI & LLM 增强 (184 Skills)

| Skill | 描述 | 安装命令 |
|-------|------|----------|
| `astrai-inference-router` | LLM 调用路由 - 节省 40%+ 成本 | `clawhub install astrai-inference-router` |
| `agent-memory` | AI 持久化记忆系统 | `clawhub install agent-memory` |
| `agentpulse` | 追踪 LLM API 成本/Token/延迟 | `clawhub install agentpulse` |
| `claude-usage-checker` | 检查 Claude Code/Claude Max 使用量 | `clawhub install claude-usage-checker` |
| `ai-humanizer` | 检测并移除 LLM 输出特征 | `clawhub install ai-humanizer` |
| `agent-orchestrator` | 元代理编排复杂任务 | `clawhub install agent-orchestrator` |
| `audio-processing` | 音频处理/转录/TTS | `clawhub install audio-processing` |

---

## 编程助手与 IDE (1200 Skills)

| Skill | 描述 | 安装命令 |
|-------|------|----------|
| `active-maintenance` | OpenClaw 自动化系统健康维护 | `clawhub install active-maintenance` |
| `agent-cost-monitor` | 实时 Token 使用和成本追踪 | `clawhub install agent-cost-monitor` |
| `agent-context` | AI 编码代理持久化本地记忆 | `clawhub install agent-context` |
| `astrai-code-review` | AI 驱动代码审查 | `clawhub install astrai-code-review` |
| `atris` | 代码库智能导航 | `clawhub install atris` |
| `code-stats` | 可视化仓库代码复杂度 | `clawhub install code-stats` |
| `code-tester` | Rust/Go/Java 构建、运行、测试 | `clawhub install code-tester` |
| `db-readonly` | MySQL/PostgreSQL 只读查询 | `clawhub install db-readonly` |
| `azure-devops` | Azure DevOps 项目/仓库/PR 管理 | `clawhub install azure-devops` |
| `atlassian-cli` | Jira Cloud CLI | `clawhub install atlassian-cli` |

---

## 生产力与任务 (206 Skills)

| Skill | 描述 | 安装命令 |
|-------|------|----------|
| `agent-task-tracker` | 主动任务状态管理 | `clawhub install agent-task-tracker` |
| `agent-daily-planner` | 结构化每日计划系统 | `clawhub install agent-daily-planner` |
| `adhd-founder-planner` | 创始人日计划助手 | `clawhub install adhd-founder-planner` |
| `meeting-coordinator` | 会议协调调度助手 | `clawhub install meeting-coordinator` |
| `beeminder` | 目标跟踪 API | `clawhub install beeminder` |

---

## 通信工具 (145 Skills)

| Skill | 描述 | 安装命令 |
|-------|------|----------|
| `agent-mail` | AI 代理邮箱 | `clawhub install agent-mail` |
| `microsoft365` | Microsoft 365 (Outlook/Calendar/OneDrive) | `clawhub install microsoft365` |
| `clawemail` | Google Workspace (Gmail/Drive/Docs/Sheets) | `clawhub install clawemail` |
| `slack-*` | 多个 Slack 集成技能 | - |
| `beeper` | Beeper 聊天历史搜索 | `clawhub install beeper` |
| `clawchat-p2p` | OpenClaw 代理间加密 P2P 消息 | `clawhub install clawchat-p2p` |

---

## 日历与调度

| Skill | 描述 | 安装命令 |
|-------|------|----------|
| `google-calendar` | Google 日历管理 | `clawhub install google-calendar` |
| `meetlark` | 调度投票工具 | `clawhub install meetlark` |
| `bookameeting` | 通过 AI 安排会议 | `clawhub install bookameeting` |

---

## 语音与转录 (45 Skills)

| Skill | 描述 | 安装命令 |
|-------|------|----------|
| `miranda-elevenlabs-speech` | ElevenLabs TTS/STT | `clawhub install miranda-elevenlabs-speech` |
| `acestep-lyrics-transcription` | 音频转录为时间戳歌词 | `clawhub install acestep-lyrics-transcription` |

---

## PDF 与文档

| Skill | 描述 | 安装命令 |
|-------|------|----------|
| `boof` | PDF/文档转 Markdown + RAG 检索 | `clawhub install boof` |

---

## 安全工具

| Skill | 描述 | 安装命令 |
|-------|------|----------|
| `arc-security-audit` | 代理技能栈安全审计 | `clawhub install arc-security-audit` |
| `agentaudit` | 安装前检查包漏洞 | `clawhub install agentaudit` |
| `azhua-skill-vetter` | 安全优先的技能审查 | `clawhub install azhua-skill-vetter` |

---

## 推荐安装组合

### 基础开发套件
```bash
clawhub install gh
clawhub install git-changelog
clawhub install code-stats
clawhub install db-readonly
clawhub install agent-memory
```

### 飞书办公套件
```bash
clawhub install feishu-common
clawhub install feishu-sheets
clawhub install feishu-calendar
clawhub install feishu-card
clawhub install lark-toolkit
```

### AI 增强套件
```bash
clawhub install astrai-inference-router
clawhub install agentpulse
clawhub install exa-search-free
clawhub install fal-ai
```

### 成本监控套件
```bash
clawhub install agent-cost-monitor
clawhub install agentpulse
clawhub install claude-usage-checker
```

---

## 完整分类索引

| 分类 | 数量 | 主要用途 |
|------|------|----------|
| Coding Agents & IDEs | 1200 | 编程助手、代码审查、开发工具 |
| Browser & Automation | 320 | 浏览器自动化、爬虫、测试 |
| Search & Research | 352 | 搜索、学术研究、数据获取 |
| Productivity & Tasks | 206 | 任务管理、日程安排 |
| AI & LLMs | 184 | AI 增强、模型路由、记忆系统 |
| Image & Video Generation | 169 | 图像/视频生成、设计工具 |
| Git & GitHub | 166 | Git 操作、PR 管理 |
| Communication | 145 | 邮件、聊天、通知 |
| DevOps & Cloud | - | 部署、监控、云服务 |
| Data & Analytics | - | 数据分析、可视化 |

---

## 从 GitHub 获取代码的方法

### 方法 1: Git Sparse Checkout (推荐)

```bash
# 创建临时目录
cd /tmp && rm -rf skills-test

# 克隆仓库（不下载文件）
git clone --depth 1 --filter=blob:none --sparse https://github.com/openclaw/skills.git skills-test

# 只获取需要的 skill 目录
cd skills-test
git sparse-checkout set skills/gaowanqi08141999/feishu-bitable-creator

# 添加更多 skills
git sparse-checkout add skills/wesley138cn/feishu-sheets
git sparse-checkout add skills/autogame-17/feishu-calendar
```

### 方法 2: GitHub API

```bash
# 获取 skill 目录列表
curl -s "https://api.github.com/repos/openclaw/skills/contents/skills?per_page=100"

# 获取特定 skill 的文件列表
curl -s "https://api.github.com/repos/openclaw/skills/contents/skills/gaowanqi08141999/feishu-bitable-creator"

# 获取文件内容 (使用 download_url)
curl -s "<download_url>"
```

### 方法 3: 安装到 OpenClaw

```bash
# 方法 A: 使用 ClawHub (如果可用)
clawhub install feishu-bitable-creator

# 方法 B: 手动安装
# 复制 skill 目录到 workspace/skills/
cp -r /tmp/skills-test/skills/gaowanqi08141999/feishu-bitable-creator /workspace/projects/workspace/skills/

# 重启 Gateway
sh ./scripts/restart.sh
```

### 方法 4: 直接引用 GitHub URL

在 OpenClaw 对话中直接粘贴 GitHub URL，让代理自动处理：
```
https://github.com/openclaw/skills/tree/main/skills/gaowanqi08141999/feishu-bitable-creator
```

---

## 相关链接

- [ClawHub 官方技能库](https://clawhub.ai/)
- [OpenClaw 官方文档](https://docs.openclaw.ai/)
- [awesome-openclaw-skills GitHub](https://github.com/VoltAgent/awesome-clawdbot-skills)
- [OpenClaw Skills 仓库](https://github.com/openclaw/skills)
