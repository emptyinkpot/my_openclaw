---
id: "db_note_17"
title: "微信和Telegram渠道添加说明"
category: "dev"
created_at: "2026-03-20T13:17:35.000Z"
updated_at: "2026-03-25T05:42:31.000Z"
tags: ["OpenClaw", "Telegram", "WhatsApp", "微信", "Channels", "渠道"]
related_experience_ids: []
---
# 微信和Telegram渠道添加说明

## Summary
微信和Telegram渠道添加说明

## Content
# 微信和Telegram渠道添加说明

用户请求：
1. 安装微信插件
2. 安装Telegram插件
3. 加入到 extensions/apps 文件夹里

---

## 回答

### ❌ 不需要手动把插件放到 extensions/apps 里！

OpenClaw 的 Channels（渠道）功能是内置的，不需要手动安装插件到 extensions/apps 文件夹！

---

### ✅ OpenClaw 支持的渠道

从文档和帮助信息看，OpenClaw 支持：

| 渠道 | 支持情况 |
|------|---------|
| ✅ Telegram | 完全支持 |
| ✅ WhatsApp | 完全支持 |
| ✅ Discord | 完全支持 |
| ✅ 飞书（Feishu） | 你已经在用了！ |
| ✅ 钉钉（DingTalk） | 支持 |
| ✅ 企业微信（WeCom） | 支持 |
| ✅ Slack | 支持 |
| ⚠️ 微信（WeChat） | 需要确认 |

---

### 🎯 如何添加 Telegram 渠道？

#### 方法一：使用命令行（推荐）
```bash
openclaw channels add --channel telegram --token <你的-telegram-bot-token>
```

#### 方法二：登录方式（如果支持）
```bash
openclaw channels login --channel telegram
```

---

### 🎯 如何添加 WhatsApp 渠道？

#### 方法一：登录方式（推荐）
```bash
openclaw channels login --channel whatsapp
```

这会打开 WhatsApp Web，扫码登录！

---

### 📁 现有的 extensions/apps 文件夹

你现有的 extensions/apps/ 文件夹里是：

```
extensions/apps/
├── ai-model-hub/
├── experience-manager/
├── feishu-openclaw-plugin/  # 飞书插件
├── memory-lancedb-pro/
├── novel-manager/
└── projects/
```

这些是**插件（Plugins）**，不是渠道（Channels）！

---

### 🔍 关于微信（WeChat）

微信的支持需要确认一下：
- OpenClaw 可能通过企业微信（WeCom）支持
- 或者需要其他方式

你说的"微信"是指：
1. 个人微信？
2. 企业微信（WeCom）？

---

### 📝 总结

| 问题 | 答案 |
|------|------|
| 需要手动放到 extensions/apps 吗？ | ❌ 不需要！ |
| Telegram 支持吗？ | ✅ 完全支持！ |
| WhatsApp 支持吗？ | ✅ 完全支持！ |
| 微信支持吗？ | ⚠️ 需要确认是个人微信还是企业微信 |
| 怎么添加？ | 🎯 使用 openclaw channels 命令！ |

---

### 💡 建议

1. 先试试 Telegram - 最简单！
2. 再试试 WhatsApp - 也很简单！
3. 微信 - 告诉我是个人微信还是企业微信，我再帮你！

## Sections
-