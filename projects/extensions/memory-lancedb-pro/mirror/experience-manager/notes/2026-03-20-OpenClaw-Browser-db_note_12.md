---
id: "db_note_12"
title: "OpenClaw Browser 功能 - 文件夹位置"
category: "dev"
created_at: "2026-03-20T13:09:37.000Z"
updated_at: "2026-03-25T05:42:31.000Z"
tags: ["OpenClaw", "Browser", "文件夹位置", "功能位置"]
related_experience_ids: []
---
# OpenClaw Browser 功能 - 文件夹位置

## Summary
OpenClaw Browser 功能 - 文件夹位置

## Content
# OpenClaw Browser 功能 - 文件夹位置

用户询问：Browser（浏览器）相关的功能在哪个文件夹里？

## 问题内容

用户想知道 Browser（浏览器）相关的功能在哪个文件夹里：

🌐 八、Browser（浏览器）- 自动司机
15. 浏览器自动化
✅ Chrome / Chromium 支持
✅ 无头模式（Headless）
✅ 有头模式（Headful）- 你的配置是有头模式
✅ 用户配置文件管理
✅ 截图功能
✅ 页面操作（点击、输入、滚动）
✅ 浏览器扩展支持
✅ 代理支持
16. 浏览器配置（你的配置）
✅ 可执行文件路径：/opt/google/chrome/chrome
✅ 窗口大小：1920x1080
✅ 默认用户配置：openclaw
✅ 无沙箱模式：noSandbox: true
✅ 颜色标识：#00AA00

---

## 回答

### 1. OpenClaw 系统安装位置

OpenClaw 本身是通过 npm 安装的，所以它的代码在系统目录里：

```
/usr/lib/node_modules/openclaw/
```

这是 OpenClaw 的核心安装目录！

---

### 2. Browser 功能的代码位置

Browser 相关的代码就在 OpenClaw 的安装目录里：

```
/usr/lib/node_modules/openclaw/
├── dist/                    # 编译后的代码
│   ├── browser/            # 浏览器相关的代码 👈
│   ├── plugins/
│   ├── skills/
│   └── ...
└── ...
```

具体位置是：
```
/usr/lib/node_modules/openclaw/dist/browser/
```

---

### 3. 用户的浏览器配置文件位置

而你的浏览器用户配置文件（User Profile）在你的用户目录里：

```
/root/.config/openclaw/browser/
```

这是 OpenClaw 存储浏览器配置文件的地方！

---

### 4. 你的配置里的路径

看你的 openclaw.json 配置：

```json
"browser": {
  "executablePath": "/opt/google/chrome/chrome",
  "headless": false,
  "defaultProfile": "openclaw",
  "profiles": {
    "openclaw": {
      "userDataDir": "/root/.config/openclaw/browser/openclaw"
    }
  }
}
```

这里有几个重要的路径：

| 配置项 | 路径 | 说明 |
|--------|------|------|
| executablePath | /opt/google/chrome/chrome | Chrome 浏览器的可执行文件 |
| userDataDir | /root/.config/openclaw/browser/openclaw | 你的浏览器配置文件目录 |

---

### 5. 完整的文件夹结构

```
/opt/google/chrome/          # Chrome 浏览器安装目录
└── chrome                   # Chrome 可执行文件

/usr/lib/node_modules/openclaw/  # OpenClaw 安装目录
└── dist/browser/            # Browser 功能的代码

/root/.config/openclaw/      # OpenClaw 用户配置目录
└── browser/                  # 浏览器配置目录
    └── openclaw/             # 你的浏览器用户配置文件（defaultProfile）
```

---

### 6. 总结

| 内容 | 位置 |
|------|------|
| OpenClaw 核心代码 | /usr/lib/node_modules/openclaw/ |
| Browser 功能代码 | /usr/lib/node_modules/openclaw/dist/browser/ |
| Chrome 浏览器 | /opt/google/chrome/chrome |
| 你的浏览器配置 | /root/.config/openclaw/browser/openclaw/ |

## Sections
-