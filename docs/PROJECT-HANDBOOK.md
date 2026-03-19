# OpenClaw 自动化项目 - 完整操作手册

> 版本: 1.0  
> 创建时间: 2026-03-12  
> 最后更新: 2026-03-12

---

## 📋 目录

1. [项目概览](#一项目概览)
2. [快速开始](#二快速开始)
3. [核心脚本详解](#三核心脚本详解)
4. [常见问题排查](#四常见问题排查)
5. [技术概念词典](#五技术概念词典)
6. [命令速查表](#六命令速查表)
7. [配置说明](#七配置说明)
8. [故障排除流程](#八故障排除流程)

---

## 一、项目概览

### 1.1 这是什么？

这是一个基于 **OpenClaw** 框架的个人 AI 助手项目，通过 **Playwright** 实现浏览器自动化操作。

**核心功能**：
- 自动登录白梦写作网（微信扫码）
- 获取作品列表
- 进入指定作品
- 飞书机器人集成

### 1.2 技术架构

```
用户（飞书APP）
    ↓ 发送消息
OpenClaw Gateway
    ↓ 路由到 Skill
website-automation Skill
    ↓ 调用
Playwright 浏览器
    ↓ 操作
白梦写作网网页
```

### 1.3 项目结构

```
/workspace/projects/
├── docs/                           ← 本文档所在目录
│   ├── README.md                   ← 文档中心索引
│   ├── 09-beginner-guide.md        ← 零基础入门教程
│   ├── AUTOMATION-DASHBOARD.md     ← 自动化仪表盘
│   └── ...
│
├── workspace/skills/
│   └── website-automation/         ← 核心技能模块
│       ├── scripts/
│       │   ├── automation.js       ← 浏览器自动化核心类
│       │   ├── cli.js              ← 命令行工具
│       │   └── config.js           ← 网站配置
│       └── SKILL.md                ← OpenClaw 技能配置
│
├── output/                         ← 输出目录
│   ├── screenshots/                ← 自动截图
│   │   └── baimeng/
│   └── states/                     ← 登录状态文件
│       └── baimeng_state.json
│
├── scripts/                        ← 独立脚本（旧版）
├── openclaw.json                   ← OpenClaw 主配置
└── .coze                           ← 环境配置
```

---

## 二、快速开始

### 2.1 首次使用流程

#### 步骤 1：检查环境
```bash
# 检查 OpenClaw 状态
openclaw doctor
openclaw status --all

# 检查网关是否运行
curl -I http://localhost:5000
```

#### 步骤 2：登录白梦写作网
```bash
# 进入脚本目录
cd /workspace/projects/workspace/skills/website-automation/scripts

# 启动有头模式登录（需要扫码）
node cli.js baimeng login
```

**扫码过程**：
1. 命令会打开浏览器窗口
2. 显示微信二维码
3. 用微信扫码授权
4. 等待显示"登录成功"

#### 步骤 3：验证登录状态
```bash
# 检查登录状态
node cli.js baimeng check

# 预期输出：
# {"success":true,"isLoggedIn":true,"message":"已登录"}
```

#### 步骤 4：测试功能
```bash
# 获取作品列表
node cli.js baimeng works

# 进入第1个作品
node cli.js baimeng enter 1
```

### 2.2 日常使用

```bash
# 1. 检查状态
openclaw status --all

# 2. 如果需要，重新登录
node cli.js baimeng login

# 3. 使用飞书机器人交互
# 在飞书中发送：
# - "作品列表" → 查看所有作品
# - "进入作品 1" → 打开第1个作品
```

---

## 三、核心脚本详解

### 3.1 通用网站自动化模块

#### automation.js - 核心类

**功能**：封装的浏览器自动化操作

**主要方法**：

| 方法 | 作用 | 示例 |
|------|------|------|
| `init()` | 初始化浏览器 | `await auto.init()` |
| `goto(url)` | 打开网页 | `await auto.goto()` |
| `click(selector)` | 点击元素 | `await auto.click('text=登录')` |
| `saveState()` | 保存登录状态 | `await auto.saveState()` |
| `screenshot(name)` | 截图 | `await auto.screenshot('home')` |
| `checkLogin()` | 检查登录状态 | `await auto.checkLogin()` |

**完整示例**：
```javascript
const WebsiteAutomation = require('./automation');
const { getConfig } = require('./config');

async function main() {
  // 1. 获取配置
  const config = getConfig('baimeng');
  
  // 2. 创建实例
  const auto = new WebsiteAutomation(config);
  
  // 3. 初始化（自动加载保存的登录状态）
  await auto.init();
  
  // 4. 打开首页
  await auto.goto();
  
  // 5. 检查登录
  const isLoggedIn = await auto.checkLogin();
  console.log('登录状态:', isLoggedIn);
  
  // 6. 截图
  await auto.screenshot('homepage');
  
  // 7. 关闭
  await auto.close();
}

main();
```

#### cli.js - 命令行工具

**命令列表**：

```bash
# 登录并保存状态
node cli.js baimeng login

# 检查登录状态
node cli.js baimeng check

# 获取作品列表
node cli.js baimeng works

# 进入指定作品（参数：作品编号）
node cli.js baimeng enter 1

# 截图当前页面
node cli.js baimeng screenshot [名称]
```

**返回值格式**：
```javascript
// 成功
{
  "success": true,
  "message": "操作成功",
  "screenshot": "/path/to/screenshot.jpg"
}

// 失败
{
  "success": false,
  "error": "错误信息"
}
```

#### config.js - 配置文件

**配置项说明**：
```javascript
const baimengConfig = {
  name: 'baimeng',                    // 网站标识
  baseUrl: 'https://www.baimengxiezuo.com',  // 首页URL
  headless: false,                    // 是否无头模式
  
  selectors: {                        // CSS选择器配置
    loginBtn: 'button:has-text("登录")',      // 登录按钮
    loginCheck: 'button:has-text("登录")',    // 登录检查元素
    userElement: 'img[alt*="头像"], .avatar'  // 用户元素
  },
  
  works: {                            // 作品列表配置
    entryPoint: 'text=免费开始创作',   // 入口按钮
    itemSelector: 'h3',               // 作品标题选择器
    excludeItems: ['创建新作品'],      // 排除项
    descriptionSelector: 'p'          // 描述选择器
  },
  
  // 目录配置
  stateDir: '/workspace/projects/output/states',
  screenshotDir: '/workspace/projects/output/screenshots/baimeng',
  maxScreenshots: 5                   // 最大保留截图数
};
```

---

### 3.2 OpenClaw 命令

#### 状态检查
```bash
# 检查配置健康状况
openclaw doctor

# 完整状态报告
openclaw status --all

# 检查 Gateway 状态
openclaw gateway status

# 检查频道状态
openclaw channels status --probe
```

#### 配置管理
```bash
# 设置配置项
openclaw config set channels.feishu.enabled true --json

# 打开 Dashboard
openclaw dashboard

# 查看日志
openclaw logs --follow
```

#### 服务管理
```bash
# 重启 Gateway（使用脚本）
sh /workspace/projects/scripts/restart.sh

# 停止 Gateway（使用脚本）
sh /workspace/projects/scripts/stop.sh
```

---

## 四、常见问题排查

### 4.1 问题速查表

| 问题 | 可能原因 | 解决方案 |
|------|---------|----------|
| "未登录" | 登录状态过期 | 重新运行 `node cli.js baimeng login` |
| "browserContext closed" | 浏览器意外关闭 | 重新运行命令 |
| "找不到元素" | 页面未加载完成 | 增加等待时间 |
| 飞书无响应 | Gateway 未运行 | 执行 `sh scripts/restart.sh` |
| 截图失败 | 目录不存在 | 检查 `output/screenshots` 目录 |

### 4.2 详细问题诊断

#### 问题：登录状态频繁失效

**症状**：
- 昨天还能用，今天显示"未登录"
- 需要频繁重新扫码

**原因**：
1. JWT Token 过期（通常7天）
2. 微信授权过期
3. 状态文件损坏

**解决方案**：
```bash
# 1. 删除旧状态
rm /workspace/projects/output/states/baimeng_state.json

# 2. 重新登录
node cli.js baimeng login

# 3. 验证
node cli.js baimeng check
```

#### 问题：飞书机器人不响应

**排查步骤**：
```bash
# 1. 检查 Gateway 是否运行
curl http://localhost:5000/health

# 2. 检查频道状态
openclaw channels status

# 3. 检查日志
openclaw logs --follow

# 4. 重启服务
sh scripts/restart.sh
```

#### 问题：截图不清晰或失败

**解决方案**：
```javascript
// 在 config.js 中调整截图配置
screenshot: {
  type: 'jpeg',
  quality: 90,        // 提高质量
  fullPage: true      // 截取完整页面
}
```

### 4.3 获取帮助

```bash
# 查看命令帮助
openclaw --help
openclaw doctor --help

# 搜索文档
openclaw docs <关键词>

# 查看版本
openclaw --version
```

---

## 五、技术概念词典

### 5.1 浏览器自动化

#### Playwright
一个用于自动化浏览器操作的工具，可以：
- 模拟用户点击、输入
- 抓取网页数据
- 截图、录制视频
- 保存/恢复登录状态

#### 有头模式 (Headed)
浏览器显示图形界面，你可以看到窗口。

**使用场景**：开发调试、需要扫码登录

#### 无头模式 (Headless)
浏览器在后台运行，没有图形界面。

**使用场景**：服务器部署、定时任务

### 5.2 登录与认证

#### Cookie
存储在浏览器中的小型文本文件，用于：
- 记录登录状态
- 存储用户偏好
- 追踪用户行为

**特点**：
- 每次访问网站会自动发送
- 可以设置过期时间
- 大小限制约 4KB

#### LocalStorage
浏览器本地存储，比 Cookie 容量更大（约 5MB）。

**特点**：
- 不会自动发送给服务器
- 永久保存（除非手动删除）
- 本项目用于存储 JWT Token

#### JWT Token
JSON Web Token，一种安全的令牌格式，用于：
- 证明用户身份
- 包含用户信息
- 有过期时间

**结构**：
```
头部.载荷.签名
eyJhbGciOiJIUzI1NiIs.eyJpZCI6IjEyMyJ9.signature
```

### 5.3 网络基础

#### IP 地址
设备的网络地址，如 `192.168.1.1`。

#### 端口 (Port)
设备的"房间号"，用于区分不同服务：
- 80: HTTP 网页
- 443: HTTPS 安全网页
- 5000: OpenClaw Gateway

#### HTTP/HTTPS
网络通信协议：
- HTTP: 明文传输
- HTTPS: 加密传输（更安全）

### 5.4 编程概念

#### 异步 (Async/Await)
JavaScript 处理耗时操作的方式：

```javascript
// 同步：阻塞等待
const result = doSomething();  // 等待完成才能继续

// 异步：不阻塞
const result = await doSomething();  // 等待但不阻塞其他操作
```

**类比**：
- 同步：排队等咖啡，什么都不做就等着
- 异步：点完单先坐，好了叫你

#### JSON
一种数据格式，易于阅读和解析：

```json
{
  "name": "张三",
  "age": 25,
  "isStudent": false
}
```

### 5.5 项目相关

#### OpenClaw
开源的个人 AI 助手框架，包含：
- **Gateway**: 网关服务（消息路由）
- **Agent**: 智能体（处理逻辑）
- **Channels**: 消息渠道（飞书、Telegram 等）
- **Skills**: 技能模块（具体功能）

#### Skill
OpenClaw 的功能模块，实现特定能力：
- 本项目中的 `website-automation` 就是一个 Skill
- Skill 可以独立开发、安装、卸载

---

## 六、命令速查表

### 6.1 日常操作

| 操作 | 命令 |
|------|------|
| 检查状态 | `openclaw status --all` |
| 查看日志 | `openclaw logs --follow` |
| 重启服务 | `sh scripts/restart.sh` |
| 停止服务 | `sh scripts/stop.sh` |

### 6.2 白梦写作网操作

| 操作 | 命令 |
|------|------|
| 登录 | `node cli.js baimeng login` |
| 检查状态 | `node cli.js baimeng check` |
| 获取作品 | `node cli.js baimeng works` |
| 进入作品 | `node cli.js baimeng enter <编号>` |
| 截图 | `node cli.js baimeng screenshot` |

### 6.3 文件操作

| 操作 | 命令 |
|------|------|
| 查看目录 | `ls -la` |
| 查看文件 | `cat <文件名>` |
| 切换目录 | `cd <路径>` |
| 创建目录 | `mkdir <目录名>` |
| 删除文件 | `rm <文件名>` |
| 复制文件 | `cp <源文件> <目标>` |

### 6.4 调试命令

| 操作 | 命令 |
|------|------|
| 测试 Gateway | `curl http://localhost:5000` |
| 检查端口 | `netstat -tlnp \| grep 5000` |
| 查看进程 | `ps aux \| grep openclaw` |
| 查看存储 | `cat output/states/baimeng_state.json` |

---

## 七、配置说明

### 7.1 OpenClaw 主配置

文件：`/workspace/projects/openclaw.json`

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

### 7.2 网站自动化配置

文件：`/workspace/projects/workspace/skills/website-automation/scripts/config.js`

```javascript
// 主要配置项
{
  name: 'baimeng',                    // 网站名称
  baseUrl: 'https://...',             // 首页地址
  headless: false,                    // 是否无头模式
  
  selectors: {                        // 元素选择器
    loginBtn: 'text=登录',            // 登录按钮
    loginCheck: 'text=登录',          // 检查元素
    userElement: '.avatar'            // 用户头像
  },
  
  stateDir: '...',                    // 状态保存目录
  screenshotDir: '...',               // 截图保存目录
  maxScreenshots: 5                   // 最大截图数
}
```

### 7.3 环境变量

| 变量 | 作用 | 示例 |
|------|------|------|
| `OPENCLAW_STATE_DIR` | 状态目录 | `/workspace/projects/.openclaw` |
| `ANTHROPIC_API_KEY` | Claude API 密钥 | `sk-ant-...` |
| `OPENAI_API_KEY` | OpenAI API 密钥 | `sk-...` |

---

## 八、故障排除流程

### 8.1 通用排查流程

```
遇到问题
    ↓
[1] 查看错误信息
    ↓
[2] 检查服务状态
    ├─ openclaw status --all
    ├─ openclaw doctor
    └─ curl http://localhost:5000
    ↓
[3] 查看日志
    └─ openclaw logs --follow
    ↓
[4] 尝试重启
    └─ sh scripts/restart.sh
    ↓
[5] 仍有问题？
    ├─ 查看本文档"常见问题"章节
    ├─ 搜索错误信息
    └─ 重新登录/重新配置
```

### 8.2 紧急恢复

如果系统完全不可用：

```bash
# 1. 停止所有服务
sh scripts/stop.sh

# 2. 清除临时文件
rm -rf /workspace/projects/output/states/*
rm -rf /workspace/projects/output/screenshots/*

# 3. 重新启动
sh scripts/restart.sh

# 4. 重新登录
node cli.js baimeng login
```

### 8.3 联系支持

- 查看文档：`/workspace/projects/docs/`
- 搜索帮助：`openclaw docs <关键词>`
- 查看日志：`openclaw logs`

---

## 附录

### A. 目录索引

| 路径 | 内容 |
|------|------|
| `/workspace/projects/docs/` | 所有文档 |
| `/workspace/projects/workspace/skills/` | 技能模块 |
| `/workspace/projects/output/screenshots/` | 自动截图 |
| `/workspace/projects/output/states/` | 登录状态 |
| `/workspace/projects/scripts/` | 独立脚本 |

### B. 更新记录

| 日期 | 版本 | 更新内容 |
|------|------|----------|
| 2026-03-12 | 1.0 | 初始版本 |

### C. 相关文档

- [零基础入门指南](09-beginner-guide.md)
- [技术决策记录](06-decisions/README.md)
- [Bug 记录](03-bugs/README.md)

---

*本文档由 OpenClaw 配置专家自动生成*  
*最后更新: 2026-03-12*
