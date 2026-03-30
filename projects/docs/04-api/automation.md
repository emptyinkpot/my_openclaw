# automation

**文件**: `workspace/skills/website-automation/scripts/automation.js`

**生成时间**: 2026-03-12T07:05:53.908Z

## 方法列表

| 方法 | 描述 |
|------|------|
| constructor() | 通用网站自动化模块 功能： - 自动登录状态保存/加载 - 截图管理（自动清理） - 支持多网站配置... |
| getStateFilePath() | 获取状态文件路径... |
| hasSavedState() | 检查是否有保存的登录状态... |
| init() | 初始化浏览器（带登录状态）... |
| saveState() | 保存当前登录状态... |
| goto() | 打开页面... |
| checkLogin() | 检查登录状态... |
| click() | 点击元素... |
| fill() | 填充表单... |
| getText() | 获取页面文本内容... |
| getElements() | 获取多个元素... |
| screenshot() | 截图... |
| close() | 关闭浏览器... |
| sleep() | 延迟... |

## 详细文档

### constructor()

通用网站自动化模块 功能： - 自动登录状态保存/加载 - 截图管理（自动清理） - 支持多网站配置 - 通用操作接口 / class WebsiteAutomation { /**

**参数**:

| 名称 | 类型 | 描述 |
|------|------|------|
| config | Object | 网站配置 |
| config | string | .name - 网站名称（如：baimeng） |
| config | string | .baseUrl - 网站首页URL |
| config | string | .loginUrl - 登录页面URL（可选，默认baseUrl） |
| config | Object | .selectors - CSS选择器配置 |
| config | string | .selectors.loginBtn - 登录按钮选择器 |
| config | string | .selectors.loginCheck - 检查登录状态的元素选择器 |
| config | string | .stateDir - 状态文件保存目录 |
| config | string | .screenshotDir - 截图保存目录 |

---

### getStateFilePath()

获取状态文件路径

---

### hasSavedState()

检查是否有保存的登录状态

---

### init()

初始化浏览器（带登录状态）

---

### saveState()

保存当前登录状态

---

### goto()

打开页面

---

### checkLogin()

检查登录状态

**参数**:

| 名称 | 类型 | 描述 |
|------|------|------|
| options | Object | 选项 |

**返回**: Promise<boolean> - - 是否已登录

---

### click()

点击元素

---

### fill()

填充表单

---

### getText()

获取页面文本内容

---

### getElements()

获取多个元素

---

### screenshot()

截图

---

### close()

关闭浏览器

---

### sleep()

延迟

---

