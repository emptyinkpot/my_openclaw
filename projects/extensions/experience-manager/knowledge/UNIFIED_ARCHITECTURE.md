# 统一架构设计文档

> 一劳永逸解决架构一致性问题

---

## 问题根源

```
当前问题：
┌─────────────────┐    ┌─────────────────┐
│   Skills 目录    │    │   独立项目目录    │
│  (飞书机器人)    │    │   (电脑脚本)     │
├─────────────────┤    ├─────────────────┤
│ baimeng-writer/ │    │ novel-sync/     │
│ fanqie-novel/   │    │ fanqienovel/    │
│ website-auto/   │    │                 │
├─────────────────┤    ├─────────────────┤
│ 各自实现逻辑 ❌  │    │ 各自实现逻辑 ❌  │
│ 各自存登录数据❌ │    │ 各自存登录数据❌ │
│ 功能不同步 ❌   │    │ 功能不同步 ❌   │
└─────────────────┘    └─────────────────┘
        ↓                      ↓
      重复代码                重复代码
      数据分散                数据分散
      维护困难                维护困难
```

---

## 统一架构方案

```
┌─────────────────────────────────────────────────────────────────┐
│                         接口层 (Interface)                       │
│   统一入口，所有调用方式都通过这里                                │
├─────────────────────────────────────────────────────────────────┤
│  飞书机器人    │   CLI 命令行   │   API 接口   │   定时任务      │
│  (Skills)     │   (Terminal)   │   (HTTP)    │   (Cron)        │
└─────────────────────────────────────────────────────────────────┘
                              ↓ 调用
┌─────────────────────────────────────────────────────────────────┐
│                         核心层 (Core)                            │
│   统一的业务逻辑，所有平台共享                                    │
├─────────────────────────────────────────────────────────────────┤
│  SiteManager   │  AuthManager   │  TaskRunner  │  ResultFormat  │
│  平台管理器     │  登录管理器     │  任务运行器   │  结果格式化     │
└─────────────────────────────────────────────────────────────────┘
                              ↓ 调用
┌─────────────────────────────────────────────────────────────────┐
│                         平台层 (Platforms)                       │
│   各平台的具体实现                                               │
├─────────────────────────────────────────────────────────────────┤
│   BaimengSite  │   FanqieSite   │   CozeSite   │   ...更多      │
│   白梦写作      │   番茄小说      │   扣子编程    │               │
└─────────────────────────────────────────────────────────────────┘
                              ↓ 调用
┌─────────────────────────────────────────────────────────────────┐
│                         基础层 (Infrastructure)                  │
│   基础设施，统一管理                                             │
├─────────────────────────────────────────────────────────────────┤
│  BrowserManager │  StateStorage  │  ConfigManager │  Logger     │
│  浏览器管理      │  状态存储       │  配置管理       │  日志系统   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ 使用
┌─────────────────────────────────────────────────────────────────┐
│                         数据层 (Data)                            │
│   统一的数据存储位置                                             │
├─────────────────────────────────────────────────────────────────┤
│  /workspace/projects/browser/     - 浏览器数据（统一）            │
│  /workspace/projects/cookies-accounts/ - 登录状态（统一）         │
│  /workspace/projects/output/      - 输出文件（统一）              │
│  /workspace/projects/lib/         - 核心代码库（统一）            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 核心原则

### 1. 单一数据源 (Single Source of Truth)

```javascript
// ❌ 之前：数据分散
// novel-sync/storage/baimeng_login.json
// baimeng-writer/states/baimeng_state.json
// website-automation/states/baimeng.json

// ✅ 现在：统一位置
// /workspace/projects/browser/baimeng-1/          浏览器数据
// /workspace/projects/cookies-accounts/baimeng-1/ 登录状态
```

### 2. 核心代码共享

```javascript
// ❌ 之前：每个项目自己实现
// novel-sync/src/platforms/baimeng/browser.js
// baimeng-writer/scripts/automation.js
// website-automation/scripts/automation.js

// ✅ 现在：统一核心库
// /workspace/projects/lib/
//   ├── browser/manager.js      浏览器管理
//   ├── sites/base.js           平台基类
//   ├── sites/baimeng.js        白梦实现
//   ├── sites/fanqie.js         番茄实现
//   ├── auth/manager.js         登录管理
//   └── config/manager.js       配置管理
```

### 3. 接口统一

```javascript
// 所有调用方式使用相同的 API

// 飞书机器人
const site = SiteManager.get('baimeng');
const works = await site.getWorks();

// CLI 命令行
node cli.js baimeng works

// API 接口
GET /api/sites/baimeng/works

// 定时任务
scheduler.schedule('0 2 * * *', () => site.getWorks());
```

---

## 文件结构

```
/workspace/projects/
├── lib/                          # 核心代码库（统一）
│   ├── browser/
│   │   ├── manager.js           # 浏览器管理器
│   │   └── pool.js              # 浏览器池
│   ├── sites/
│   │   ├── base.js              # 平台基类
│   │   ├── baimeng.js           # 白梦写作
│   │   ├── fanqie.js            # 番茄小说
│   │   └── coze.js              # 扣子编程
│   ├── auth/
│   │   ├── manager.js           # 登录管理器
│   │   └── backup.js            # 状态备份
│   ├── config/
│   │   ├── manager.js           # 配置管理
│   │   └── sites.json           # 平台配置
│   └── utils/
│       ├── logger.js            # 日志
│       ├── retry.js             # 重试
│       └── progress.js          # 进度
│
├── browser/                      # 浏览器数据（统一）
│   ├── default/                 # 共享模式
│   ├── baimeng-1/               # 白梦账号1
│   ├── fanqie-1/                # 番茄账号1
│   └── coze-1/                  # 扣子账号1
│
├── cookies-accounts/             # 登录状态（统一）
│   ├── baimeng-account-1-full.json
│   ├── fanqie-account-1.json
│   └── coze-account-1.json
│
├── workspace/skills/             # 飞书机器人 Skills
│   ├── site-controller/         # 统一的平台控制器（新）
│   │   ├── SKILL.md
│   │   └── scripts/
│   │       └── controller.js    # 调用 lib/ 核心
│   ├── baimeng-writer/          # (废弃，使用 site-controller)
│   └── fanqie-novel/            # (废弃，使用 site-controller)
│
└── novel-sync/                   # 独立项目（调用 lib/ 核心）
    └── tasks/
        └── some-task.js         # 调用 lib/sites/baimeng.js
```

---

## 使用方式

### 飞书机器人

```
@机器人 白梦作品      → SiteManager.get('baimeng').getWorks()
@机器人 番茄作品      → SiteManager.get('fanqie').getWorks()
@机器人 扣子作品      → SiteManager.get('coze').getWorks()
@机器人 登录 白梦     → SiteManager.get('baimeng').login()
```

### CLI 命令行

```bash
# 统一命令
site-cli baimeng works
site-cli fanqie works
site-cli baimeng login
site-cli fanqie check
```

### 代码调用

```javascript
const { SiteManager } = require('/workspace/projects/lib');

// 获取平台
const baimeng = SiteManager.get('baimeng', { accountId: 1 });

// 使用
await baimeng.getWorks();
await baimeng.openWork('作品名');
await baimeng.getChapterContent('第一章');
```

---

## 迁移计划

### Phase 1: 核心库完善 ✅ (已有基础)
- `/workspace/projects/lib/` 已有 browser/manager.js, sites/base.js 等

### Phase 2: 统一 Skill
- 创建 `site-controller` Skill 替代多个独立 Skill
- 调用 lib/ 核心

### Phase 3: 迁移旧代码
- novel-sync 调用 lib/ 核心
- 删除重复代码

### Phase 4: 数据迁移
- 确保所有登录数据在统一位置

---

## 飞书机器人指令设计

```javascript
// 指令解析（模糊匹配）
const commandPatterns = {
  // 查看作品
  '作品': 'works',
  '列表': 'works',
  '多少': 'works',
  
  // 进入作品
  '进入': 'enter',
  '打开': 'enter',
  
  // 登录
  '登录': 'login',
  '扫码': 'login',
  
  // 状态
  '状态': 'check',
  '检查': 'check',
  
  // 截图
  '截图': 'screenshot',
  '看看': 'screenshot',
};

// 平台别名
const siteAliases = {
  '白梦': 'baimeng',
  'baimeng': 'baimeng',
  '番茄': 'fanqie',
  'fanqie': 'fanqie',
  '番茄小说': 'fanqie',
  '扣子': 'coze',
  'coze': 'coze',
};
```

**支持的指令示例：**

| 用户说 | 解析结果 |
|-------|---------|
| `白梦作品` | site=baimeng, action=works |
| `查看番茄作品列表` | site=fanqie, action=works |
| `番茄有多少作品` | site=fanqie, action=works |
| `进入白梦第2个作品` | site=baimeng, action=enter, index=2 |
| `白梦状态` | site=baimeng, action=check |
| `番茄登录` | site=fanqie, action=login |
| `我想看白梦的截图` | site=baimeng, action=screenshot |
