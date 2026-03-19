---
name: ultimate-browser
description: |
  🚀 终极浏览器自动化系统 - 集成所有浏览器能力于一身
  
  核心能力:
  1. 智能网页操作 - 点击、填写、提交、截图
  2. 网页抓取 - 静态/动态页面内容提取
  3. 网站爬虫 - 整站内容批量抓取
  4. 验证码解决 - 自动识别和处理各类验证码
  5. API 测试 - HTTP/HTTPS 请求测试
  6. 页面分析 - 页面结构探索和元素定位
  7. 录屏录制 - 自动化操作过程录制
  
  使用场景:
  - 自动化表单填写和提交
  - 竞品数据采集和监控
  - 网站内容批量抓取
  - 自动化测试和回归测试
  - 价格监控和库存提醒
  - 自动化报表下载
metadata:
  openclaw:
    emoji: 🌐
    requires:
      bins: ["node", "npm"]
      config: []
---

# 🚀 终极浏览器自动化系统

> 集成 agent-browser + anycrawl + 2captcha + api-tester + page-explorer + analyze-page

## 能力矩阵

| 能力 | 工具 | 说明 |
|------|------|------|
| **智能操作** | agent-browser | Rust 高性能无头浏览器，支持点击/填写/截图/录屏 |
| **网页抓取** | anycrawl | 支持静态/动态页面，结构化数据提取 |
| **网站爬虫** | anycrawl | 整站内容批量抓取，支持深度控制 |
| **验证码** | 2captcha | 自动解决 reCAPTCHA/hCaptcha/Turnstile 等 |
| **API 测试** | api-tester | HTTP/HTTPS 请求测试 |
| **页面分析** | page-explorer | 页面结构探索，元素定位 |
| **深度分析** | analyze-page | 页面快照，Accessibility Tree |

---

## 一、智能网页操作 (agent-browser)

### 快速开始

```bash
# 安装
npm install -g agent-browser
agent-browser install

# 打开网页
agent-browser open "https://example.com"

# 获取页面元素
agent-browser snapshot -i

# 点击元素
agent-browser click @e1

# 填写表单
agent-browser fill @e2 "Hello World"

# 截图
agent-browser screenshot result.png
```

### 常用命令速查

```bash
# === 导航 ===
agent-browser open <url>      # 打开网页
agent-browser back            # 后退
agent-browser forward         # 前进
agent-browser reload          # 刷新
agent-browser close           # 关闭

# === 获取信息 ===
agent-browser snapshot -i     # 获取可交互元素 (推荐)
agent-browser snapshot        # 完整 Accessibility Tree
agent-browser get text @e1    # 获取元素文本
agent-browser get url         # 获取当前 URL
agent-browser get title       # 获取页面标题

# === 交互操作 ===
agent-browser click @e1       # 点击
agent-browser fill @e2 "text" # 清空并填写
agent-browser type @e2 "text" # 追加输入
agent-browser press Enter     # 按键
agent-browser scroll down 500 # 滚动

# === 截图录屏 ===
agent-browser screenshot      # 截图到 stdout
agent-browser screenshot file.png  # 保存截图
agent-browser record start demo.webm  # 开始录屏
agent-browser record stop     # 停止录屏

# === 等待 ===
agent-browser wait @e1        # 等待元素出现
agent-browser wait 2000       # 等待毫秒
agent-browser wait --text "成功" # 等待文本
```

### 完整工作流示例

```bash
# 1. 打开登录页
agent-browser open "https://example.com/login"
agent-browser snapshot -i

# 2. 填写登录表单
agent-browser fill @e1 "username@example.com"
agent-browser fill @e2 "password123"
agent-browser click @e3  # 登录按钮

# 3. 等待跳转
agent-browser wait --url "/dashboard"

# 4. 执行操作
agent-browser snapshot -i
agent-browser click @e5  # 导航到目标页面

# 5. 截图保存
agent-browser screenshot result.png
```

---

## 二、网页抓取 (anycrawl)

### 设置 API Key

```bash
export ANYCRAWL_API_KEY="your-api-key"
```

### 单页抓取

```javascript
// 基础抓取
anycrawl_scrape({ url: "https://example.com" })

// 抓取 SPA 动态页面
anycrawl_scrape({
  url: "https://spa-site.com",
  engine: "playwright",
  formats: ["markdown", "screenshot"]
})

// 提取结构化数据
anycrawl_scrape({
  url: "https://product-page.com",
  json_options: {
    schema: {
      type: "object",
      properties: {
        product_name: { type: "string" },
        price: { type: "number" },
        description: { type: "string" }
      }
    }
  }
})
```

### 搜索并抓取

```javascript
// 搜索并自动抓取结果
anycrawl_search_and_scrape({
  query: "最新 AI 新闻",
  max_results: 5,
  formats: ["markdown"]
})
```

### 整站爬虫

```javascript
// 爬取整个网站
anycrawl_crawl_start({
  url: "https://docs.example.com",
  max_depth: 5,
  limit: 100,
  scrape_options: {
    formats: ["markdown"]
  }
})

// 只爬取博客
anycrawl_crawl_start({
  url: "https://example.com",
  include_paths: ["/blog/*"],
  exclude_paths: ["/blog/tags/*"]
})

// 检查爬虫状态
anycrawl_crawl_status({ job_id: "xxx" })

// 获取爬虫结果
anycrawl_crawl_results({ job_id: "xxx" })
```

### 引擎选择

| 引擎 | 适用场景 | 速度 | JS 渲染 |
|------|----------|------|---------|
| `cheerio` | 静态 HTML、新闻、博客 | ⚡ 最快 | ❌ |
| `playwright` | SPA、复杂 Web 应用 | 🐢 较慢 | ✅ |
| `puppeteer` | Chrome 特定场景 | 🐢 较慢 | ✅ |

---

## 三、验证码解决 (2captcha)

### 设置 API Key

```bash
mkdir -p ~/.config/2captcha
echo "YOUR_API_KEY" > ~/.config/2captcha/api-key

# 或环境变量
export TWOCAPTCHA_API_KEY="your-key"
```

### 支持的验证码类型

| 类型 | 命令 |
|------|------|
| 图片验证码 | `solve-captcha image captcha.png` |
| reCAPTCHA v2 | `solve-captcha recaptcha2 --sitekey "KEY" --url "URL"` |
| reCAPTCHA v3 | `solve-captcha recaptcha3 --sitekey "KEY" --url "URL"` |
| hCaptcha | `solve-captcha hcaptcha --sitekey "KEY" --url "URL"` |
| Turnstile | `solve-captcha turnstile --sitekey "KEY" --url "URL"` |
| GeeTest | `solve-captcha geetest --gt "GT" --challenge "XXX" --url "URL"` |

### 自动化流程

```bash
# 1. 检测验证码
agent-browser snapshot -i

# 2. 提取参数 (sitekey 等)
# 从页面源码中查找 data-sitekey

# 3. 解决验证码
solve-captcha recaptcha2 --sitekey "6Le-xxx" --url "https://example.com"

# 4. 注入 Token
# 将返回的 token 填入 g-recaptcha-response
```

---

## 四、API 测试 (api-tester)

```javascript
// GET 请求
const result = await api.request('GET', 'https://api.example.com/data');
console.log(result.status, result.data);

// POST 请求
const result = await api.request(
  'POST',
  'https://api.example.com/submit',
  { 'Authorization': 'Bearer token' },
  { key: 'value' }
);

// 返回格式
{
  status: 200,
  headers: { ... },
  data: { ... },
  raw: "..."
}
```

---

## 五、页面分析 (内置)

### page-explorer - 智能探索

```bash
# 探索当前页面
node {baseDir}/scripts/explore.js

# 查找特定元素
node {baseDir}/scripts/explore.js find "登录按钮"

# 导出页面结构
node {baseDir}/scripts/explore.js export
```

### analyze-page - 深度分析

```bash
# 快速分析
node {baseDir}/scripts/analyze.js quick

# 深度分析
node {baseDir}/scripts/analyze.js deep page-name

# 生成 AI 提示
node {baseDir}/scripts/analyze.js prompt
```

---

## 六、场景化最佳实践

### 场景 1: 自动化登录 + 表单填写

```bash
# 1. 打开页面
agent-browser open "https://example.com/login"

# 2. 分析页面
agent-browser snapshot -i

# 3. 填写表单
agent-browser fill @e1 "user@example.com"
agent-browser fill @e2 "password"
agent-browser click @e3

# 4. 等待跳转
agent-browser wait --url "/dashboard"

# 5. 执行操作
agent-browser snapshot -i
agent-browser fill @e5 "表单内容"
agent-browser click @e6

# 6. 截图确认
agent-browser screenshot completed.png
```

### 场景 2: 绕过验证码

```bash
# 1. 检测验证码类型
agent-browser snapshot -i

# 2. 解决验证码
solve-captcha recaptcha2 --sitekey "KEY" --url "URL"

# 3. 获取 token 后继续操作
agent-browser fill @e1 "token_value"
agent-browser click @e2
```

### 场景 3: 批量数据抓取

```javascript
// 1. 搜索目标
anycrawl_search({
  query: "产品名称",
  limit: 10
})

// 2. 爬取详情页
anycrawl_crawl_start({
  url: "https://example.com/products",
  include_paths: ["/products/*"],
  scrape_options: {
    formats: ["markdown"]
  }
})
```

### 场景 4: 自动化报表下载

```bash
# 1. 登录系统
agent-browser open "https://oa.company.com/login"
agent-browser fill @e1 "username"
agent-browser fill @e2 "password"
agent-browser click @e3
agent-browser wait --url "/home"

# 2. 导航到报表页
agent-browser click @e4  # 报表菜单
agent-browser wait @e5   # 等待报表列表

# 3. 下载报表
agent-browser click @e5  # 导出按钮

# 4. 等待下载完成
agent-browser wait 5000
```

### 场景 5: 价格监控

```javascript
// 定时执行
anycrawl_scrape({
  url: "https://shop.com/product/123",
  engine: "playwright",
  json_options: {
    schema: {
      properties: {
        price: { type: "number" },
        stock: { type: "string" }
      }
    }
  }
})
```

---

## 七、能力对比速查表

| 需求 | 推荐工具 | 命令/方法 |
|------|----------|-----------|
| 打开网页 | agent-browser | `agent-browser open URL` |
| 点击按钮 | agent-browser | `agent-browser click @e1` |
| 填写表单 | agent-browser | `agent-browser fill @e1 "text"` |
| 截图 | agent-browser | `agent-browser screenshot file.png` |
| 录屏 | agent-browser | `agent-browser record start file.webm` |
| 等待元素 | agent-browser | `agent-browser wait @e1` |
| 抓取单页 | anycrawl | `anycrawl_scrape({ url })` |
| 搜索网页 | anycrawl | `anycrawl_search({ query })` |
| 爬取整站 | anycrawl | `anycrawl_crawl_start({ url })` |
| 解决验证码 | 2captcha | `solve-captcha recaptcha2 ...` |
| API 测试 | api-tester | `api.request('GET', url)` |
| 页面探索 | page-explorer | `node explore.js` |
| 页面分析 | analyze-page | `node analyze.js deep` |

---

## 八、安装与配置

```bash
# 安装 agent-browser
npm install -g agent-browser
agent-browser install

# 配置 2captcha
echo "YOUR_API_KEY" > ~/.config/2captcha/api-key

# 配置 anycrawl
export ANYCRAWL_API_KEY="your-key"

# 验证安装
agent-browser --version
solve-captcha balance
```

---

## 九、注意事项

1. **频率控制**: 避免高频请求，尊重 robots.txt
2. **验证码成本**: reCAPTCHA 约 $0.003/次
3. **Token 过期**: 验证码 token 2-5 分钟内有效
4. **页面变化**: 网站更新后可能需要重新探索元素
5. **反爬策略**: 使用 stealth 模式和代理

---

## 十、故障排查

| 问题 | 解决方案 |
|------|----------|
| 元素找不到 | 重新 `snapshot -i` 获取最新元素 |
| 验证码解决失败 | 检查 API Key 余额 |
| 页面加载慢 | 增加 `wait` 时间 |
| 动态内容不显示 | 使用 `playwright` 引擎 |
| 被检测为机器人 | 安装 `browser-automation-stealth` |
