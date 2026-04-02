---
id: "db_note_3"
title: "OpenClaw 项目开发与架构总结"
category: "dev"
created_at: "2026-03-20T12:29:14.000Z"
updated_at: "2026-03-25T05:42:32.000Z"
tags: ["OpenClaw", "TypeScript", "项目结构", "架构", "开发指南"]
related_experience_ids: []
---
# OpenClaw 项目开发与架构总结

## Summary
OpenClaw 项目开发与架构总结

## Content
# OpenClaw 项目开发与架构总结

## 📁 项目结构

### 核心目录与文件
```
项目根目录/
├── openclaw.json              # OpenClaw 主配置（不能删）
├── package.json               # 根项目配置
├── pnpm-workspace.yaml        # pnpm 工作区配置
├── pnpm-lock.yaml            # 根锁文件（不能删）
├── tsconfig.base.json         # TypeScript 基础配置
├── extensions/                # OpenClaw 插件目录
│   ├── novel-manager/         # 小说管理器插件
│   │   ├── index.ts          # 插件入口（主要在用）
│   │   ├── tsconfig.json      # 子项目 TypeScript 配置
│   │   ├── services/          # 业务逻辑层
│   │   ├── core/              # 核心逻辑层
│   │   └── public/            # 前端页面
│   └── feishu-openclaw-plugin/ # 飞书插件
│       └── data/             # 飞书配置文件（feishu.json 等）
├── workspace/                # 运行时数据（不提交 Git）
└── scripts/                  # 启动/重启/停止脚本（不能删）
```

## 🚫 绝对不能删的文件

| 文件/目录 | 说明 |
|----------|------|
| `.git/` | Git 仓库（删了就没版本历史） |
| `.coze` | 沙箱环境配置 |
| `openclaw.json` | OpenClaw 主配置 |
| `package.json` | 根项目配置 |
| `pnpm-lock.yaml` | pnpm 根锁文件 |
| `pnpm-workspace.yaml` | pnpm 工作区配置 |
| `tsconfig.base.json` | TypeScript 基础配置 |
| `lib/` | OpenClaw 核心库 |
| `hooks-pack/` | OpenClaw Hooks 包 |
| `node_modules/` | Node.js 依赖（删了要重新安装） |
| `scripts/` | 项目启动脚本 |

## 📝 TypeScript vs JavaScript

### 核心区别
| 特性 | JavaScript (JS) | TypeScript (TS) |
|------|------------------|------------------|
| 类型系统 | ❌ 弱类型，没有类型检查 | ✅ 强类型，有类型检查 |
| 发现错误时机 | ❌ 运行时才发现 | ✅ 写代码/编译时就发现 |
| 学习难度 | ✅ 简单，易学 | ⚠️ 稍微难一点（要学类型） |
| 大型项目 | ❌ 容易乱 | ✅ 好维护 |

### TS = JS + 类型系统
- 所有 JS 代码都是合法的 TS 代码
- TS 最终要编译成 JS 才能运行

## 🔧 tsconfig.json 作用

告诉 TypeScript 编译器怎么编译代码：
- `target`：编译成什么版本的 JS
- `outDir`：编译后放到哪个目录
- `include`：要编译哪些文件
- `exclude`：不要编译哪些文件
- `strict`：是否开启严格模式

## 🎯 novel-manager 插件架构

### 两个入口文件
| 文件 | 作用 | 是否在用 |
|------|------|---------|
| `index.ts` | OpenClaw 插件入口 | ✅ 主要在用 |
| `server.ts` | 独立 Express 服务器 | ⚠️ 已删除（备用） |

### 分层架构
```
index.ts (路由层) → 接收请求，分发路由
    ↓
novel-service.ts (服务层) → 业务逻辑
    ↓
ContentPipeline.ts (核心层) → 核心功能
```

## 📦 配置文件管理

### feishu.json 位置
- 原来位置：项目根目录
- 新位置：`extensions/feishu-openclaw-plugin/data/`
- 更规范，插件配置放在插件目录下

## 💡 开发建议

1. **先想清楚再动手**：需求 → 数据结构 → 接口
2. **分层次开发**：数据库 → 后端 → 前端
3. **小步快跑**：一个功能一个功能做，每做完就测试
4. **保持代码规范**：命名有意义，函数不要太长
5. **使用 TypeScript**：大型项目更安全，更好维护

---
**最后更新**：2026-03-20

## Sections
-