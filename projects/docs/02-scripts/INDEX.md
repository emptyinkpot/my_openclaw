# 脚本文档索引

**最后更新**: 2024-03-13

---

## 一、novel-sync 项目 ⭐

> 番茄小说 ↔ 白梦写作 自动化工具

**详细索引**: [workspace/projects/novel-sync/SCRIPTS.md](../../workspace/projects/novel-sync/SCRIPTS.md)

### 核心脚本

| 脚本 | 用法 | 功能 |
|------|------|------|
| `replace-content.js` | `node replace-content.js 66` | 替换指定章节正文 |
| `baimeng-chapter-finder.js` | `node baimeng-chapter-finder.js` | 查找并打开章节 |
| `baimeng-copy.js` | `node baimeng-copy.js` | 复制章节内容 |
| `open-chapter.js` | `node open-chapter.js` | 打开指定章节 |

### 知识库

| 文档 | 内容 |
|------|------|
| `knowledge/baimeng/replace-content.md` | 替换正文完整流程 |
| `knowledge/baimeng/operations.md` | 操作速查表 |
| `knowledge/baimeng/modify-card.md` | 修改内容卡片操作 |
| `knowledge/baimeng/troubleshooting.md` | 问题排查 |

---

## 二、系统脚本（scripts/）

| 脚本 | 功能 |
|------|------|
| `restart.sh` | 重启 OpenClaw Gateway |
| `stop.sh` | 停止 Gateway |
| `start.sh` | 启动 Gateway |

---

## 三、Skills（workspace/skills/）

| Skill | 功能 |
|-------|------|
| `baimeng-writer` | 白梦写作自动化 Skill |
| `coze-image-gen` | 图片生成 |
| `coze-voice-gen` | 语音生成 |
| `coze-web-fetch` | 网页抓取 |
| `coze-web-search` | 网页搜索 |
| `website-automation` | 网站自动化 |

---

## 四、已归档脚本

以下脚本已整合到 novel-sync 项目中：

| 旧脚本 | 新位置 |
|--------|--------|
| `scripts/baimeng_auto.js` | `novel-sync/` |
| `scripts/baimeng_login.js` | `novel-sync/src/platforms/baimeng/auth.js` |
| `scripts/baimeng_helper.js` | 已废弃，使用模块化版本 |

---

## 五、快速入口

```bash
# 进入 novel-sync 项目
cd workspace/projects/novel-sync

# 查看脚本索引
cat SCRIPTS.md

# 替换章节正文
node replace-content.js 66

# 查找章节
node baimeng-chapter-finder.js
```
