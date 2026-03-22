# OpenClaw 小说管理系统 - 架构规则与最佳实践

> 本文档总结了项目架构、配置规则、常见问题及解决方案，供后续开发和维护参考。

---

## 一、项目架构概览

### 1.1 目录结构

```
/workspace/projects/
├── openclaw.json          # OpenClaw 核心配置文件
├── workspace/             # OpenClaw 工作空间
├── extensions/            # 插件目录（主要开发区域）
│   ├── novel-manager/     # 小说管理插件
│   │   ├── index.ts       # 插件入口（API路由注册）
│   │   ├── public/        # 前端页面
│   │   │   ├── index.html # 小说管理主页面
│   │   │   ├── auto.html  # 自动化页面
│   │   │   ├── experience.html # 经验页面
│   │   │   └── cache.html # 缓存页面
│   │   ├── core/          # 核心逻辑
│   │   │   ├── config.ts  # 模块配置
│   │   │   ├── database.ts # 数据库管理
│   │   │   └── pipeline/  # 流水线
│   │   │       ├── FanqieScanner.ts  # 番茄扫描
│   │   │       └── FanqiePublisher.ts # 番茄发布
│   │   └── services/      # 服务层
│   │       ├── novel-service.ts # 小说服务
│   │       └── fanqie-sync-service.ts # 番茄同步
│   └── experience-manager/ # 经验管理插件
│       └── data/
│           └── experiences.json # 经验数据文件
├── browser/               # 浏览器数据目录
│   ├── fanqie-account-1/  # 番茄账号1
│   └── fanqie-account-2/  # 番茄账号2
├── cookies-accounts/      # Cookie存储
└── scripts/               # 启动脚本（勿修改）
    ├── start.sh
    ├── restart.sh
    └── stop.sh
```

### 1.2 架构分层

```
┌─────────────────────────────────────────────────────────┐
│                    前端页面层                            │
│  extensions/novel-manager/public/*.html                 │
│  - 统一导航栏（nav-bar）                                 │
│  - API 封装（api() 函数 + Bearer Token）                │
└─────────────────────────────────────────────────────────┘
                          ↓ HTTP/WebSocket
┌─────────────────────────────────────────────────────────┐
│                    Gateway 网关层                        │
│  端口: 5000                                             │
│  认证: Bearer Token (e1647cdb-1b80-4eee-a975-7599160cc89b)│
│  路由: 插件注册路由 + 原生路由                           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    插件层                                │
│  extensions/novel-manager/index.ts                      │
│  - 注册页面路由（/、/novel/、/auto.html 等）            │
│  - 注册 API 路由（/api/novel/*）                        │
│  - 认证模式: auth: 'plugin'（无需登录）                 │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    服务层                                │
│  extensions/novel-manager/services/                     │
│  - NovelService: 小说数据操作                           │
│  - FanqieSyncService: 番茄同步逻辑                      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    核心层                                │
│  extensions/novel-manager/core/                         │
│  - FanqieScanner: Playwright 扫描番茄作品               │
│  - FanqiePublisher: 章节发布流程                        │
│  - DatabaseManager: MySQL 连接池                        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    数据层                                │
│  MySQL: cloudbase-4glvyyq9f61b19cd                      │
│  - works: 作品表                                        │
│  - chapters: 章节表                                     │
│  - fanqie_works: 番茄作品缓存                           │
│  JSON: experiences.json（经验数据）                     │
└─────────────────────────────────────────────────────────┘
```

---

## 二、配置规则

### 2.1 openclaw.json 核心配置

```json
{
  "gateway": {
    "port": 5000,                    // 端口固定，勿修改
    "mode": "local",
    "bind": "lan",
    "auth": {
      "mode": "token",
      "token": "e1647cdb-1b80-4eee-a975-7599160cc89b"
    },
    "controlUi": {
      "dangerouslyDisableDeviceAuth": true  // 禁用设备认证
    }
  },
  "plugins": {
    "load": {
      "paths": [
        "/workspace/projects/extensions/novel-manager",
        "/workspace/projects/extensions/experience-manager"
      ]
    },
    "entries": {
      "novel-manager": { "enabled": true },
      "experience-manager": { "enabled": true }
    }
  }
}
```

**重要规则：**

1. **gateway.port** 固定为 5000，修改会导致 Web 预览失效
2. **gateway.auth.token** 用于 API 认证，前端需携带 `Authorization: Bearer <token>`
3. **plugins.load.paths** 指定插件加载目录
4. **models.providers.coze** 的 apiKey 和 baseUrl 禁止修改

### 2.2 模块配置 (core/config.ts)

```typescript
{
  database: {
    type: 'mysql',
    host: 'sh-cynosdbmysql-grp-1kbg1xh0.sql.tencentcdb.com',
    port: 22295,
    user: 'openclaw',
    password: 'Lgp15237257500',
    database: 'cloudbase-4glvyyq9f61b19cd'
  },
  scheduler: {
    fanqieAccounts: [
      {
        id: 'account_1',
        name: '番茄账号1',
        browserDir: '/workspace/projects/browser/fanqie-account-1',
        cookiesFile: '/workspace/projects/cookies-accounts/fanqie-20260314-030709.json'
      }
    ]
  }
}
```

### 2.3 数据库表字符集

**必须使用 utf8mb4 字符集：**

```sql
CREATE TABLE fanqie_works (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  ...
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**错误示例：**
```
Error: Conversion from collation utf8mb4_unicode_ci into latin1_swedish_ci impossible
```

**原因：** 表或字段使用了默认的 latin1 字符集，无法存储中文。

---

## 三、API 路由规则

### 3.1 页面路由（无需认证）

| 路由 | 文件 | 说明 |
|------|------|------|
| `/` | native.html | OpenClaw 原生界面 |
| `/novel/` | index.html | 小说管理主页面 |
| `/auto.html` | auto.html | 自动化页面 |
| `/experience.html` | experience.html | 经验页面 |
| `/cache.html` | cache.html | 缓存页面 |

### 3.2 API 路由（需要认证）

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/novel/works` | GET | 获取作品列表 |
| `/api/novel/stats` | GET | 获取统计数据 |
| `/api/novel/fanqie/works` | GET | 获取番茄作品 |
| `/api/novel/fanqie/scan` | POST | 触发番茄扫描 |
| `/api/novel/experience/records` | GET | 获取经验记录 |
| `/api/novel/experience/stats` | GET | 获取经验统计 |
| `/api/novel/schedules` | GET | 获取调度列表 |

### 3.3 前端 API 封装

```javascript
const GATEWAY_TOKEN = 'e1647cdb-1b80-4eee-a975-7599160cc89b';
const API_BASE = '/api/novel';

async function api(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${GATEWAY_TOKEN}`,
    ...(options.headers || {})
  };
  const res = await fetch(API_BASE + endpoint, { ...options, headers });
  return res.json();
}
```

---

## 四、常见问题与解决方案

### 4.1 数据库连接问题

**问题：** `Error: connect ETIMEDOUT`

**原因：** MySQL 连接池超时

**解决：**
```typescript
pool = mysql.createPool({
  connectTimeout: 10000,  // 增加超时时间
  waitForConnections: true,
  connectionLimit: 5
});
```

### 4.2 字符集不兼容

**问题：** `Conversion from collation utf8mb4_unicode_ci into latin1_swedish_ci impossible`

**解决：** 删除旧表，重新创建时显式指定字符集：
```sql
DROP TABLE IF EXISTS fanqie_works;
CREATE TABLE fanqie_works (...) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 4.3 番茄扫描无数据

**问题：** 扫描返回空数组

**排查步骤：**
1. 检查 Cookie 文件是否存在
2. 检查浏览器目录权限
3. 手动运行扫描脚本测试：
```bash
cd extensions/novel-manager
node -e "const {getFanqieScanner}=require('./dist/core/pipeline/FanqieScanner'); getFanqieScanner().scan().then(r=>console.log(r))"
```

### 4.4 TypeScript 编译后未生效

**问题：** 修改代码后 API 行为未变

**解决：** 每次修改后必须编译：
```bash
cd extensions/novel-manager && pnpm build
./scripts/restart.sh
```

### 4.5 Gateway 未启动

**问题：** API 返回空或连接拒绝

**排查：**
```bash
# 检查端口
curl -I http://localhost:5000

# 检查进程
ps aux | grep openclaw

# 重启服务
./scripts/restart.sh
```

---

## 五、开发规范

### 5.1 代码修改流程

1. **修改 TypeScript 源码** → `extensions/novel-manager/**/*.ts`
2. **编译** → `pnpm build`
3. **重启服务** → `./scripts/restart.sh`
4. **验证** → `curl` 测试 API

### 5.2 数据库表创建

```typescript
async initTables() {
  // 先删除旧表（避免字符集问题）
  await this.db.execute(`DROP TABLE IF EXISTS table_name`).catch(() => {});
  
  // 创建新表，显式指定字符集
  await this.db.execute(`
    CREATE TABLE table_name (
      id INT PRIMARY KEY AUTO_INCREMENT,
      content TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}
```

### 5.3 经验数据源

经验数据存储在 `extensions/experience-manager/data/experiences.json`，格式：

```json
{
  "records": [
    {
      "type": "problem_solving|bug_fix|feature_dev|refactoring|learning|optimization",
      "title": "标题",
      "description": "描述",
      "userQuery": "用户问题",
      "solution": "解决方案",
      "experienceApplied": ["应用的经验"],
      "experienceGained": ["新获得的经验"],
      "tags": ["标签"],
      "difficulty": 1-5,
      "xpGained": 50-500,
      "id": "exp_timestamp_random",
      "timestamp": 1773942000000
    }
  ]
}
```

---

## 六、关键经验总结

### 6.1 架构相关

1. **插件路由优先**：OpenClaw 页面通过插件注册路由，不是静态文件服务
2. **认证统一**：所有 API 使用 Bearer Token，前端必须携带
3. **字符集强制 utf8mb4**：MySQL 表必须显式指定字符集，否则中文存储失败
4. **编译必须重启**：TypeScript 编译后必须重启 Gateway 才能生效

### 6.2 调试相关

1. **日志位置**：`/app/work/logs/bypass/dev.log`
2. **API 测试**：使用 `curl -H "Authorization: Bearer <token>"`
3. **扫描调试**：直接运行 Node 脚本，不经过 Gateway

### 6.3 数据相关

1. **经验数据**：JSON 文件优先，数据库作为备份
2. **番茄数据**：扫描后缓存到数据库和 JSON 文件
3. **账号ID映射**：`account_1` → `1`，需要转换才能存入 INT 字段

---

## 七、快速命令参考

```bash
# 编译插件
cd extensions/novel-manager && pnpm build

# 重启服务
./scripts/restart.sh

# 测试 API
curl -H "Authorization: Bearer e1647cdb-1b80-4eee-a975-7599160cc89b" http://127.0.0.1:5000/api/novel/works

# 测试番茄扫描
curl -X POST -H "Authorization: Bearer e1647cdb-1b80-4eee-a975-7599160cc89b" http://127.0.0.1:5000/api/novel/fanqie/scan

# 查看日志
tail -50 /app/work/logs/bypass/dev.log

# 手动扫描测试
cd extensions/novel-manager && node -e "require('./dist/core/pipeline/FanqieScanner').getFanqieScanner().scan().then(r=>console.log(JSON.stringify(r,null,2)))"
```

---

*文档版本: 1.0 | 最后更新: 2026-03-20*
