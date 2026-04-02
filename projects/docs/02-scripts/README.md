# 脚本文档

## 脚本清单

<!-- AUTO-GENERATED: 脚本列表 -->

### 通用网站自动化

**路径**: `workspace/skills/website-automation/`

| 脚本 | 用途 | 状态 |
|------|------|------|
| `scripts/automation.js` | 核心自动化类 | 稳定 |
| `scripts/config.js` | 网站配置 | 稳定 |
| `scripts/cli.js` | 命令行接口 | 稳定 |

**使用方法**:
```bash
cd workspace/skills/website-automation/scripts

# 登录
node cli.js baimeng login

# 获取作品列表
node cli.js baimeng works

# 进入作品
node cli.js baimeng enter 1
```

### 白梦写作网（旧版）

**路径**: `workspace/skills/baimeng-writer/`

| 脚本 | 用途 | 状态 |
|------|------|------|
| `scripts/controller.js` | 控制器 | 已弃用 |
| `scripts/feishu-handler.js` | 飞书处理器 | 已弃用 |

### 独立脚本

**路径**: `scripts/`

| 脚本 | 用途 | 状态 |
|------|------|------|
| `restart.sh` | 重启 Gateway | 稳定 |
| `stop.sh` | 停止 Gateway | 稳定 |

<!-- AUTO-GENERATED-END -->

## 接口文档

### WebsiteAutomation 类

```javascript
const auto = new WebsiteAutomation(config);

// 方法
await auto.init();           // 初始化浏览器
await auto.goto(url);        // 打开页面
await auto.click(selector);  // 点击元素
await auto.saveState();      // 保存登录状态
await auto.screenshot(name); // 截图
```

### CLI 命令

| 命令 | 参数 | 说明 |
|------|------|------|
| `login` | - | 登录并保存状态 |
| `check` | - | 检查登录状态 |
| `works` | - | 获取作品列表 |
| `enter` | `<编号>` | 进入指定作品 |
| `screenshot` | `[名称]` | 截图当前页面 |
