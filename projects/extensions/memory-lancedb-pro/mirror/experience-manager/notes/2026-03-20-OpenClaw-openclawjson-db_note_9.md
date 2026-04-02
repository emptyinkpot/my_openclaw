---
id: "db_note_9"
title: "OpenClaw 配置文件通俗讲解 - openclaw.json 完全指南"
category: "dev"
created_at: "2026-03-20T13:03:43.000Z"
updated_at: "2026-03-25T05:42:31.000Z"
tags: ["OpenClaw", "配置文件", "新手教程", "系统架构"]
related_experience_ids: []
---
# OpenClaw 配置文件通俗讲解 - openclaw.json 完全指南

## Summary
OpenClaw 配置文件通俗讲解 - openclaw.json 完全指南

## Content
# OpenClaw 配置文件通俗讲解

想象你在开一家公司，openclaw.json 就是公司的"公司章程"和"员工手册"！

## 12 个配置部分详解

### 1. meta/wizard - 公司档案
- meta - 记录最后一次修改时间
- wizard - 记录入职向导的使用情况

### 2. browser - 自动司机
给自动操作浏览器的机器人配置：
- enabled - 允许使用浏览器机器人
- executablePath - 浏览器位置
- headless - 是否隐身模式
- defaultProfile - 用哪个账号
- extraArgs - 启动参数（窗口大小等）

### 3. models - AI 顾问团
- providers - AI 服务提供商（Coze）
- baseUrl - AI 服务地址
- apiKey - 访问密码
- models - 可用的 AI 模型列表：
  - auto - 自动选择
  - kimi/glm/deepseek - 不同品牌
  - doubao-seed - 豆包（Pro/Lite/Mini）
  - contextWindow - 记忆力（最多 26 万字）
  - maxTokens - 一次最多说多少字
  - reasoning - 会不会思考
  - cost - 费用（这里免费）

### 4. agents - 首席助理
- model.primary - 默认用哪个 AI
- imageModel.primary - 看图用哪个模型
- workspace - 办公室位置
- maxConcurrent - 最多同时处理几个任务
- subagents.maxConcurrent - 助手的助手最多处理几个

### 5. tools - 工具包
- web.search - 能不能上网搜索（关了）
- web.fetch - 能不能抓网页（关了）

### 6. messages - 聊天规矩
- ackReactionScope - 什么时候发已收到表情

### 7. commands - 快捷操作
- native - 原生界面模式
- restart - 允许重启
- ownerDisplay - 显示原始内容

### 8. hooks - 内部监督员
- enabled - 外部钩子开关
- internal.enabled - 内部监督员工作中
- entries - 各种监督员：
  - message-received-check-state - 收到消息检查
  - task-logger - 任务日志
  - storage-protect - 存储保护
  - code-guard - 代码守卫
  - self-heal - 自我修复
  - knowledge-check - 知识检查
  - pre-write-check - 写前检查
  - sender-trigger - 发送触发器

### 9. channels - 前台接待
- feishu - 飞书窗口
- enabled - 开门营业
- appId/appSecret - 工牌密码
- connectionMode - 连接方式（WebSocket）
- allowFrom - 只接待谁
- requireMention - 群里必须@才理你

### 10. gateway - 大门保安
- port - 门牌号（5000）
- controlUi.enabled - 管理后台开门
- allowedOrigins - 允许哪些网站访问
- auth.mode - 进门方式（token）
- auth.token - 门禁密码（保密！）
- trustedProxies - 信任的快递员
- nodes.browser.mode - 浏览器节点开关

### 11. skills - 特殊技能部门
- novel-status - 小说状态（开了）
- bilibili-monitor - B站监控（开了）
- 其他技能（都关了）

### 12. plugins - 外包合作方
- allow - 允许哪些外包
- load.paths - 外包地址（刚更新到 apps/ 目录！）
  - novel-manager - 小说管理
  - experience-manager - 经验积累
  - memory-lancedb-pro - 记忆数据库
  - feishu-openclaw-plugin - 飞书插件（刚添加的！）
- slots.memory - 记忆插槽用哪个
- entries - 每个外包的配置
  - memory-lancedb-pro 配置最多：
    - embedding - 文字转向量
    - llm - AI 理解内容
    - dbPath - 数据库位置
    - autoCapture - 自动记录聊天
    - retrieval - 搜索方式（混合搜索）
- installs - 已安装的外包

## 总结
openclaw.json 就像一家完整公司的运营手册，12个部分各司其职！

## Sections
-