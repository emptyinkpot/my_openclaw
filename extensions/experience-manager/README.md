# Experience Manager 经验积累模块

## 模块概述

经验积累模块是一个独立的业务模块，用于记录开发过程中的经验、问题和解决方案，支持经验等级系统和成长追踪。

## 设计原则

- **高内聚**：所有经验相关功能集中于本模块
- **低耦合**：通过标准 API 接口与外部交互
- **自包含**：独立的依赖、配置、数据存储
- **模块化**：可独立运行、独立部署、独立测试

## 目录结构

```
apps/experience-manager/
├── src/                          # 源代码
│   ├── core/                     # 核心业务逻辑
│   │   └── ExperienceRepository.ts  # 数据仓库
│   ├── routes/                   # API 路由
│   │   └── experience-routes.ts
│   ├── utils/                    # 工具函数
│   ├── app.ts                    # Express 应用创建
│   └── index.ts                  # 模块统一入口
├── scripts/                      # 脚本工具
│   └── auto-git-experience.ts    # Git 自动积累经验
├── config/                       # 配置文件
│   ├── .env.example              # 环境变量示例
│   └── README.md                 # 配置说明
├── tests/                        # 测试用例
│   ├── ExperienceRepository.test.ts
│   └── api.test.ts
├── data/                         # 数据存储
│   └── experiences.json
├── package.json                  # 模块依赖
├── tsconfig.json                 # TypeScript 配置
├── jest.config.js                # 测试配置
└── README.md                     # 本文件
```

## 快速开始

### 安装依赖

```bash
cd apps/experience-manager
pnpm install
```

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行测试并生成覆盖率报告
pnpm test:coverage
```

### 构建

```bash
# 编译 TypeScript
pnpm build

# 清理构建产物
pnpm clean
```

### 启动服务

```bash
# 开发模式（热重载）
pnpm dev

# 生产模式
pnpm build
pnpm start
```

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| EXPERIENCE_PORT | 3002 | 服务端口 |
| EXPERIENCE_HOST | 0.0.0.0 | 服务主机 |
| EXPERIENCE_DATA_PATH | ./data/experiences.json | 数据文件路径 |
| NODE_ENV | development | 运行环境 |

## API 接口

### 获取统计
```
GET /api/experience/stats
```

### 获取所有记录
```
GET /api/experience/records
```

### 创建记录
```
POST /api/experience/records
Content-Type: application/json

{
  "type": "learning",
  "title": "标题",
  "description": "描述",
  "userQuery": "用户问题",
  "solution": "解决方案",
  "experienceApplied": ["应用的经验"],
  "experienceGained": ["获得的经验"],
  "tags": ["标签"],
  "difficulty": 3,
  "xpGained": 100
}
```

### 获取单条记录
```
GET /api/experience/records/:id
```

### 搜索记录
```
GET /api/experience/search?q=关键词
```

### 按标签获取
```
GET /api/experience/tag/:tag
```

### 更新记录
```
PUT /api/experience/records/:id
```

### 删除记录
```
DELETE /api/experience/records/:id
```

## 模块导出

```typescript
import {
  createApp,              // 创建 Express 应用
  start,                  // 启动服务
  ExperienceRepository,   // 经验仓库类
  experienceRepo,         // 仓库单例
  createExperienceRouter  // 创建路由
} from '@openclaw/experience-manager';
```

## Git 自动积累经验

配置 Git hook 实现提交时自动积累经验：

```bash
# .git/hooks/post-commit
export EXPERIENCE_DATA_PATH=/path/to/experiences.json
node apps/experience-manager/dist/scripts/auto-git-experience.js
```

## 数据模型

### ExperienceRecord

```typescript
interface ExperienceRecord {
  id: string;              // 唯一标识
  timestamp: number;       // 时间戳
  type: 'problem_solving' | 'feature_dev' | 'bug_fix' | 
        'optimization' | 'learning' | 'refactoring';
  title: string;           // 标题
  description: string;     // 描述
  userQuery: string;       // 用户问题
  solution: string;        // 解决方案
  experienceApplied: string[];  // 应用的经验
  experienceGained: string[];   // 获得的经验
  tags: string[];          // 标签
  difficulty: 1-5;         // 难度
  xpGained: number;        // 获得 XP
}
```

## 等级系统

| 等级 | 称号 | 所需 XP |
|------|------|---------|
| 1 | 新手 | 0 |
| 2 | 学徒 | 1000 |
| 3 | 助手 | 2000 |
| 4 | 专家 | 3000 |
| 5 | 大师 | 4000 |
| 6 | 宗师 | 5000 |
| 7 | 传奇 | 6000+ |

## 许可证

MIT
