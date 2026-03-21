# OpenClaw 项目架构规范

> 核心原则：**每个账号独立，每个网站独立，无限扩展**

---

## 一、命名规范

### 1.1 浏览器数据目录

```
browser/
├── {网站标识}-{账号ID}/     # 每个账号独立目录
│   └── Default/
│       ├── Cookies          # 登录 cookies
│       └── Local Storage/   # localStorage（如有）
```

**示例**：
```
browser/
├── baimeng-1/               # 白梦写作 账号1
├── baimeng-2/               # 白梦写作 账号2（未来扩展）
├── coze-1/                  # Coze 账号1
├── fanqie-0/                # 番茄小说 账号0
├── fanqie-1/                # 番茄小说 账号1
├── fanqie-2/                # 番茄小说 账号2
├── jinjiang-1/              # 晋江文学城 账号1（未来扩展）
├── qidian-1/                # 起点中文网 账号1（未来扩展）
└── openclaw/                # OpenClaw 系统专用
```

### 1.2 登录备份文件

```
cookies-accounts/
├── {网站标识}-account-{账号ID}.json        # 基基础备份
├── {网站标识}-account-{账号ID}-full.json   # 完整备份（含localStorage）
├── {网站标识}-account-{账号ID}-works.json  # 作品列表
└── {网站标识}-all-works.json               # 该网站所有作品汇总
```

**示例**：
```
cookies-accounts/
├── baimeng-account-1.json
├── baimeng-account-1-full.json
├── baimeng-account-1-works.json
├── coze-account-1.json
├── coze-account-1-full.json
├── fanqie-account-0.json
├── fanqie-account-1.json
├── fanqie-account-2.json
└── match-result.json        # 跨网站匹配结果
```

### 1.3 知识库目录

```
knowledge/
├── {网站标识}/
│   ├── site.yaml            # 网站配置
│   ├── login.md             # 登录知识
│   ├── operations.md        # 操作知识
│   ├── operation-chain.md   # 操作链知识
│   └── troubleshooting.md   # 问题排查
├── common/                  # 通用知识
│   └── browser-basics.md
├── ARCHITECTURE.md          # 架构规范（本文档）
├── OPERATION_CHAIN_TEMPLATE.md  # 操作链记录模板
├── SCRIPT_DEPENDENCIES.md   # 脚本调用关系图 ⭐
├── ISSUES_AND_SOLUTIONS.md  # 问题记录与解决方案 ⭐
├── COMPLEX_SCRIPTS.md       # 复杂脚本详解
└── verified-operations.md   # 已验证操作记录
```

**完整示例**：
```
knowledge/
├── baimeng/
│   ├── site.yaml
│   ├── login.md
│   ├── operations.md
│   ├── modify-card.md
│   ├── replace-content.md
│   ├── operation-chain.md
│   └── troubleshooting.md
├── coze/
│   ├── site.yaml
│   ├── login.md
│   ├── operations.md
│   └── operation-chain.md
├── fanqie/
│   ├── site.yaml
│   ├── login.md
│   └── operations.md
├── common/
│   └── browser-basics.md
├── ARCHITECTURE.md
├── OPERATION_CHAIN_TEMPLATE.md
├── SCRIPT_DEPENDENCIES.md      # 脚本调用关系图
├── ISSUES_AND_SOLUTIONS.md     # 问题记录与解决方案
├── COMPLEX_SCRIPTS.md
└── verified-operations.md
```

### 1.4 代码模块

```
lib/sites/
├── base.js                  # 基类（所有网站继承）
└── {网站标识}.js            # 具体网站实现
```

---

## 二、网站标识规范

| 网站 | 标识 | 登录方式 | 状态 |
|------|------|----------|------|
| 白梦写作 | `baimeng` | localStorage | ✅ 已配置 |
| 番茄小说 | `fanqie` | Cookies | ✅ 已配置 |
| Coze | `coze` | localStorage + Cookies | ✅ 已配置 |
| 晋江文学城 | `jinjiang` | （待定） | 🔲 待开发 |
| 起点中文网 | `qidian` | （待定） | 🔲 待开发 |

**命名规则**：
- 使用英文小写
- 避免特殊字符
- 简短易记
- 与域名相关

---

## 三、添加新网站流程

### 步骤1：创建知识库

```bash
mkdir -p /workspace/projects/knowledge/{网站标识}
```

创建文件：
- `site.yaml` - 网站 URL、选择器配置
- `login.md` - 登录流程
- `operations.md` - 操作知识

### 步骤2：创建代码模块

```javascript
// lib/sites/{网站标识}.js
const { BaseSite } = require('./base');

class NewSite extends BaseSite {
  constructor(accountId = '1') {
    super('{网站标识}', accountId);
  }
  
  // 实现具体方法...
}

module.exports = { NewSite };
```

### 步骤3：使用

```javascript
const { NewSite } = require('/workspace/projects/lib/sites/{网站标识}');

const site = new NewSite('1');
await site.initBrowser();
await site.restoreAuth();
```

---

## 四、添加新账号流程

### 步骤1：手动登录

```javascript
const { BrowserManager } = require('/workspace/projects/lib/browser/manager');

// 创建新浏览器实例
const { page, context } = await BrowserManager.getInstance('{网站标识}-{新账号ID}');

// 手动登录
await page.goto('网站登录页');
// ... 手动操作登录 ...

// 登录后自动保存在 browser/{网站标识}-{新账号ID}/
```

### 步骤2：备份登录状态

```javascript
const { AuthManager } = require('/workspace/projects/lib/browser/auth');

const auth = new AuthManager('{网站标识}', '{新账号ID}');
await auth.backup(page, context);
// 保存到 cookies-accounts/{网站标识}-account-{新账号ID}-full.json
```

---

## 五、数据隔离原则

1. **每个账号独立目录**：避免登录状态冲突
2. **每个网站独立知识**：便于维护和扩展
3. **通用代码复用**：通过继承 BaseSite
4. **配置集中管理**：site.yaml 统一配置
