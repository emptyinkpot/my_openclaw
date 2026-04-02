---
id: "db_note_11"
title: "OpenClaw 完整功能清单 - 除插件外的所有功能"
category: "dev"
created_at: "2026-03-20T13:08:05.000Z"
updated_at: "2026-03-25T05:42:31.000Z"
tags: ["OpenClaw", "功能清单", "完整介绍", "新手教程"]
related_experience_ids: []
---
# OpenClaw 完整功能清单 - 除插件外的所有功能

## Summary
OpenClaw 完整功能清单 - 除插件外的所有功能

## Content
# OpenClaw 完整功能清单（除插件外）

完整列举 OpenClaw 除了插件之外的 13 大类、100+ 个功能！

## 一、核心功能 - Gateway（网关）
- HTTP 服务器（默认端口 5000）
- WebSocket 支持（实时通信）
- 路由管理（分发请求到不同插件）
- 认证授权（Token 认证）
- 跨域处理（CORS）
- 静态文件服务（Control UI）
- 健康检查端点
- 日志记录

## 二、Agents（智能助理）
- 多 Agent 管理
- 对话上下文记忆
- 工具调用（Function Calling）
- 多模态支持（文本 + 图片）
- 子 Agent（Subagents）- 助理的助手
- 工作区管理（Workspace）
- 会话压缩（Compaction）
- 最大并发任务数控制
- 模型切换（主模型、图片模型）
- 会话历史保存、回溯、总结、导出/导入

## 三、Models（模型）
- 多提供商支持（Coze、OpenAI、Anthropic 等）
- 模型切换（自动 / 手动选择）
- 费用统计和追踪
- 模型配置（Context Window、Max Tokens）
- 推理模型支持（Reasoning）
- 图片模型支持（Image Input）
- 缓存机制（减少费用）
- 模型状态监控

当前可用的模型（你的配置）：
- coze/auto - 自动选择
- coze/kimi-k2-5-260127 - Kimi K2.5
- coze/glm-4-7-251222 - GLM 4.7
- coze/deepseek-v3-2-251201 - DeepSeek 3.2
- coze/doubao-seed-1-8-251228 - 豆包 1.8
- coze/doubao-seed-2-0-pro-260215 - 豆包 2.0 Pro（带推理）
- coze/doubao-seed-2-0-lite-260215 - 豆包 2.0 Lite
- coze/doubao-seed-2-0-mini-260215 - 豆包 2.0 Mini

## 四、Channels（渠道）
- 飞书（Feishu）- 你的配置已启用
- 钉钉（DingTalk）
- 企业微信（WeCom）
- Slack
- Discord
- Telegram
- Web（网页端）
- CLI（命令行）

飞书渠道功能（你的配置）：
- WebSocket 长连接模式
- 事件订阅
- 白名单机制（allowFrom）
- 群聊策略（groupPolicy）
- @提及要求（requireMention）
- 私聊策略（dmPolicy）

## 五、Skills（技能）
- 内置技能（Built-in Skills）
- 社区技能（Community Skills）
- 技能安装/卸载
- 技能版本管理
- 技能配置
- 技能权限控制

当前启用的技能（你的配置）：
- novel-status - 小说状态
- bilibili-monitor - B站监控

可用但未启用的技能（30+个）：
- 1Password、Apple Notes、Apple Reminders、Bear Notes
- Bird、BlogWatcher、BluCLI、BlueBubbles
- CamSnap、ClawHub、EightCTL
- Gemini、GifGrep、GOG、GoPlaces
- Local-Places、Nano-Banana-Pro、Nano-PDF
- Notion、Obsidian
- OpenAI-Image-Gen、OpenAI-Whisper、OpenAI-Whisper-API
- Slack、Songsee、SonosCLI、Spotify-Player
- Things-Mac、WaCLI

## 六、Hooks（钩子）
- 内部钩子（Internal Hooks）- 你的配置已启用
- 外部钩子（External Hooks）
- 钩子注册/注销
- 钩子执行顺序
- 钩子错误处理
- 钩子事件触发

当前启用的内部钩子（你的配置）：
- message-received-check-state - 收到消息检查状态
- task-logger - 任务日志记录
- storage-protect - 存储保护（防止误删）
- code-guard - 代码守卫（防止写坏代码）
- self-heal - 自我修复（小问题自动修好）
- knowledge-check - 知识检查
- pre-write-check - 写前检查
- sender-trigger - 发送触发器

## 七、Tools（工具）
- 文件读取/写入
- 命令执行
- 网页搜索（可配置）
- 网页抓取（可配置）
- 图片生成
- 语音识别（Whisper）
- 语音合成（TTS）
- 工具权限控制
- 工具参数验证
- 工具结果格式化
- 工具调用日志

## 八、Browser（浏览器）
- Chrome / Chromium 支持
- 无头模式（Headless）
- 有头模式（Headful）- 你的配置是有头模式
- 用户配置文件管理
- 截图功能
- 页面操作（点击、输入、滚动）
- 浏览器扩展支持
- 代理支持

浏览器配置（你的配置）：
- 可执行文件路径：/opt/google/chrome/chrome
- 窗口大小：1920x1080
- 默认用户配置：openclaw
- 无沙箱模式：noSandbox: true
- 颜色标识：#00AA00

## 九、Control UI（管理后台）
- 仪表板（Dashboard）
- 对话管理
- 模型配置
- 插件管理
- 技能管理
- 渠道配置
- 日志查看
- 健康状态监控
- 设置页面

管理后台配置（你的配置）：
- 已启用：enabled: true
- 根目录：/usr/lib/node_modules/openclaw/dist/control-ui
- 允许的来源：localhost:5000、dev.coze.site 等
- 设备认证已禁用（开发模式）

## 十、安全与认证
- Token 认证（你的配置是 Token 模式）
- 设备认证（Device Auth）
- 受信任代理（Trusted Proxies）
- CORS 配置
- 权限控制
- 审计日志

## 十一、监控与诊断
- 健康检查端点
- 状态查询（openclaw status）
- 诊断工具（openclaw doctor）
- 网关探测（openclaw gateway probe）
- 模型状态（openclaw models status）
- 渠道状态（openclaw channels status）

## 十二、配置与管理
- 配置文件（openclaw.json）
- 配置验证（openclaw config validate）
- 配置查询（openclaw config get）
- 配置修改（openclaw config set）
- 配置备份（自动生成 .bak 文件）

命令行工具（CLI）：
- openclaw --version - 查看版本
- openclaw status - 查看状态
- openclaw doctor - 诊断检查
- openclaw gateway - 网关管理
- openclaw models - 模型管理
- openclaw channels - 渠道管理
- openclaw plugins - 插件管理
- openclaw skills - 技能管理
- openclaw config - 配置管理
- openclaw dashboard - 打开仪表板

## 十三、其他功能
- Tailscale（虚拟专网）- 你的配置已关闭
- 节点管理（Nodes）- Browser 节点已关闭
- 消息功能 - 消息确认反应范围、消息存储、消息搜索

## 总结

OpenClaw 除了插件之外，还有 **13 大类、100+ 个功能**！

| 类别 | 功能数量 |
|------|---------|
| 1. Gateway（网关） | 8+ |
| 2. Agents（助理） | 10+ |
| 3. Models（模型） | 8+ |
| 4. Channels（渠道） | 10+ |
| 5. Skills（技能） | 30+ |
| 6. Hooks（钩子） | 8+ |
| 7. Tools（工具） | 10+ |
| 8. Browser（浏览器） | 10+ |
| 9. Control UI（后台） | 10+ |
| 10. 安全与认证 | 5+ |
| 11. 监控与诊断 | 6+ |
| 12. 配置与管理 | 8+ |
| 13. 其他功能 | 5+ |

## Sections
-