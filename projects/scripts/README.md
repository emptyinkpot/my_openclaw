# 🤖 自动化文章生成方案

## 实施方案

### 第 1 步：提供网站信息

请告诉我：
1. **目标网站 URL**（登录页）
2. **网站类型**（比如：文心一言、通义千问、ChatGPT、或其他）
3. **是否需要处理验证码**

### 第 2 步：配置选择器

我会帮你抓取网站的 CSS 选择器，用于：
- 用户名输入框
- 密码输入框
- 登录按钮
- AI 提示词输入框
- 生成按钮
- 结果输出区域

### 第 3 步：测试运行

首次运行会打开浏览器让你观察，确认无误后可以改为无界面模式。

---

## 快速开始

### 方式一：单次执行

```bash
cd /workspace/projects
node scripts/article_generator.js "网站URL" "用户名" "密码" "提示词"
```

### 方式二：OpenClaw 定时任务

添加到 OpenClaw cron，每天早上自动执行：

```bash
openclaw cron add \
  --name "自动生成文章" \
  --cron "0 9 * * *" \
  --message "执行文章生成脚本" \
  --system-event "run: /workspace/projects/scripts/auto_article_generator.sh"
```

---

## 如何获取网站选择器

1. 用 Chrome 打开目标网站
2. 右键点击输入框 → "检查"
3. 在 Elements 面板中右键 → Copy → Copy selector
4. 将选择器提供给我

---

## 安全建议

⚠️ **不要直接将密码写在脚本中**

建议方式：
```bash
# 设置环境变量
export SITE_USERNAME="你的用户名"
export SITE_PASSWORD="你的密码"

# 然后运行脚本
node scripts/article_generator.js ...
```

---

## 告诉我

请提供：
1. 你要自动化的网站名称/URL
2. 登录后的 AI 写作页面 URL
3. 是否需要验证码

我会帮你配置好完整的自动化脚本！
