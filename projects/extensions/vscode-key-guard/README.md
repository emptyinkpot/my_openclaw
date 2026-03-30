# VS Code Key Guard

`vscode-key-guard` 是一个本地优先的 VS Code 配置守护模块，目标不是“保存 key”这么简单，而是把下面三件事收口到一个统一前端面板和一组安全 API 里：

1. 看清楚 Codex 和 Roo Code 当前实际在用哪个 API Key
2. 看清楚这个 key 已经用了多少额度、剩余额度和按模型的使用分布
3. 在受控前提下手动切换本机已存储的 key，并把切换结果同步到真实配置源

这份 README 不是单纯的模块介绍，而是当前阶段的实施手册。它会把：

- 真实配置源
- 目标功能
- 详细实现步骤
- 操作规范
- 前后端树状图
- 安全边界

都整理到一份文档里，后面按这份落代码即可。

## 1. 目标功能

这个模块最终要做到的不是“诊断配置漂移”而已，而是升级成一个可直接操作的前端控制面板。

### 1.1 前端面板要能看到什么

面板里至少要能看到以下信息：

- Codex 当前实际生效的是哪一个 key
- Roo Code 当前实际生效的是哪一个 key
- 这两个 key 分别来自哪个真实配置源
- 这两个 key 的指纹、标签、apiId、provider、baseUrl、model
- 这两个 key 已经消耗了多少额度
- 配额剩余多少
- 最近 24h / 7d / 30d 的 usage / cost 趋势
- 按模型拆分的使用分布
- 最近一次切换是谁、何时切到哪一个 key

### 1.2 前端面板要能做什么

面板里至少要能执行以下动作：

- 手动刷新 Codex / Roo / VS Code 运行态快照
- 手动刷新某个 key 的额度统计
- 在已存储 key 列表里切换 Codex 当前 key
- 在已存储 key 列表里切换 Roo 当前 key
- 在切换前看到预期写入目标、受影响文件和是否需要 reload
- 在切换后看到操作结果、审计记录和下一步提示

### 1.3 不做什么

当前阶段明确不做：

- 前端页面直接显示明文 API Key
- 前端直接把明文 key 发给第三方统计站
- 无备份地覆盖真实配置文件
- 自动切换 key
- 在没有显式确认时修改高风险运行态文件

## 2. 参考实现与外部接口

你给的参考页是：

`https://apikey.soxio.me/admin-next/api-stats?apiId=04ed07da-df57-46a7-affe-2d821e94d3a1`

当前对这个站点做的本地检查结果是：

- 该地址返回的是一个 SPA 管理后台页面，不是直接 JSON
- 页面路由里存在 `ApiStats` 详情页
- 从前端 bundle 可以看到它会调用一组 stats 接口

当前已经确认到的接口形态包括：

- `/apiStats/api/get-key-id`
- `/apiStats/api/user-stats`
- `/apiStats/api/user-model-stats`
- `/apiStats/api/batch-stats`
- `/apiStats/api/batch-model-stats`

这说明实现上应当这样处理：

- 不要把这个外部后台页直接 iframe 到本模块里
- 不要让前端页面直接依赖这个站点的页面结构
- 正确做法是后端写一个 `usage stats adapter`，去对接它的 stats API
- 本模块前端只读取本模块自己的 `/api/key-guard/*` API

也就是说，参考的是它的“统计页模式”和“接口能力”，不是直接复用它的页面代码。

## 3. 当前真实配置源

这一部分要严格对齐：

`E:\My Project\MyBlog\source\_posts\roo-code-vscode-migration-and-usage-guide.md`

不要再把 `.cursor`、临时目录或旧备份当成活动真源。

### 3.1 Codex 真源

- `C:\Users\ASUS-KL\.codex\auth.json`
- `C:\Users\ASUS-KL\.codex\config.toml`

其中：

- `auth.json` 是 key 真源
- `config.toml` 是 base_url / model / provider 等连接参数真源

### 3.2 Roo Code 真源

- `C:\Users\ASUS-KL\.roo\.env.local`

其中至少要读取：

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`
- `ROO_CODE_CONFIG_NAME`

### 3.3 VS Code 运行态证据源

- `C:\Users\ASUS-KL\AppData\Roaming\Code\User\globalStorage\state.vscdb`
- `C:\Users\ASUS-KL\AppData\Roaming\Code\User\globalStorage\rooveterinaryinc.roo-cline`
- `C:\Users\ASUS-KL\AppData\Roaming\Code\User\globalStorage\rooveterinaryinc.roo-cline\tasks\_index.json`

这层不是“主配置真源”，而是“运行态证据源”。

这点要写死：

> 磁盘配置负责定义 canonical source，VS Code runtime 负责证明当前实际生效状态。  

## 4. 当前模块已有基础

`vscode-key-guard` 现在已经不是空目录，当前已有这些基础能力：

- `backend/services/codex-config-service.ts`
- `backend/services/roo-config-service.ts`
- `backend/services/vscode-state-service.ts`
- `backend/services/diagnosis-service.ts`
- `backend/services/audit-service.ts`
- `backend/routes/snapshots.ts`
- `backend/routes/diagnosis.ts`
- `backend/routes/repair.ts`
- `backend/routes/http.ts`
- `frontend/pages/vscode-key-guard/index.html`

当前已经做好的事情：

- 读取 Codex 磁盘配置
- 读取 Roo 磁盘配置
- 读取 VS Code / Roo 运行态证据
- 生成快照和诊断结果
- 渲染一个基础诊断页面

当前还没做的事情：

- key 注册表
- 额度统计聚合
- 当前活动 key 的“注册项匹配”
- 手动切换 stored key
- 面向切换的审计链
- 切换后的 reload 指导流程

所以这次 README 的目标，不是重写旧模块，而是在当前基础上把它升级成“可视化 key 面板 + 额度统计 + 手动切换”的完整方案。

## 5. 功能设计总览

最终结构建议拆成 5 条主链：

```text
配置快照链
├─ 读 Codex 真源
├─ 读 Roo 真源
└─ 读 VS Code 运行态证据

注册表链
├─ 存储可切换 key 列表
├─ 维护 label / fingerprint / apiId 映射
└─ 给前端提供“当前可选 key”

额度统计链
├─ 对接 Soxio stats API
├─ 缓存 usage / cost / quota
└─ 产出 provider 级和 key 级统计

切换执行链
├─ 按 provider 写入真实配置源
├─ 备份
├─ 审计
└─ 给出 reload 提示

前端展示链
├─ 概览卡片
├─ provider 面板
├─ 使用量图表
└─ 手动切换面板
```

## 6. 推荐前端页面结构

前端不要只停留在“原始 JSON”页面，建议升级成下面这个布局。

### 6.1 顶部概览区

展示 4 张总览卡片：

- `Codex Active Key`
- `Roo Active Key`
- `Total Usage`
- `Needs Action`

每张卡片至少显示：

- key label
- key fingerprint
- apiId
- health status
- last refreshed

### 6.2 Provider 分栏区

分成两个主区块：

- `Codex`
- `Roo Code`

每个区块展示：

- 当前生效 key
- canonical source 文件路径
- runtime evidence 文件路径
- baseUrl
- model
- active config name
- 是否与运行态一致

### 6.3 额度统计区

参考 `api-stats` 详情页的设计思路，做成：

- 总额度 / 已用额度 / 剩余额度
- 近 7 天 usage 趋势
- 近 7 天 cost 趋势
- 按模型的使用量表格

这里建议先做“卡片 + 表格 + 简单柱状图/折线图”，不要一开始就追复杂图表系统。

### 6.4 Key Registry 区

展示当前已存储 key 列表，每一项至少有：

- `keyId`
- `label`
- `provider`
- `fingerprint`
- `apiId`
- `baseUrl`
- `model`
- `isActiveForCodex`
- `isActiveForRoo`
- `lastUsageSyncAt`

### 6.5 手动切换区

每个 provider 都有自己的切换面板。

切换面板里要显示：

- 当前活动 key
- 目标 key
- 将修改哪些文件
- 是否需要 VS Code reload
- 风险说明
- 切换按钮

## 7. 推荐后端 API

当前已有：

- `GET /api/key-guard/health`
- `GET /api/key-guard/snapshots`
- `GET /api/key-guard/diagnosis`
- `GET /api/key-guard/repair`

这次建议新增：

### 7.1 活动状态类

- `GET /api/key-guard/providers`
  作用：返回 Codex / Roo 当前活动 key 视图

- `GET /api/key-guard/providers/:provider`
  作用：返回单个 provider 的完整活动视图

### 7.2 注册表类

- `GET /api/key-guard/keys`
  作用：返回已存储 key 列表

- `POST /api/key-guard/keys`
  作用：新增一个可切换 key

- `PATCH /api/key-guard/keys/:keyId`
  作用：修改 label、apiId、描述等元数据

- `DELETE /api/key-guard/keys/:keyId`
  作用：删除一个 stored key

### 7.3 额度统计类

- `GET /api/key-guard/usage?provider=codex`
- `GET /api/key-guard/usage?keyId=codex-main`
- `POST /api/key-guard/usage/refresh`

返回内容建议至少包含：

- total usage
- total cost
- total quota
- remaining quota
- usage trend
- cost trend
- model breakdown

### 7.4 切换类

- `POST /api/key-guard/switch`

请求体建议：

```json
{
  "provider": "codex",
  "targetKeyId": "codex-main"
}
```

返回内容建议：

```json
{
  "success": true,
  "provider": "codex",
  "fromKeyId": "codex-old",
  "toKeyId": "codex-main",
  "wroteFiles": [
    "C:/Users/ASUS-KL/.codex/auth.json",
    "C:/Users/ASUS-KL/.codex/config.toml"
  ],
  "backupFiles": [
    "..."
  ],
  "reloadRequired": false,
  "auditId": "switch-20260330-001"
}
```

## 8. 建议新增的数据结构

建议在 `core/types` 里新增这些类型：

### 8.1 `stored-key.ts`

```ts
export interface StoredKeyEntry {
  id: string;
  label: string;
  providerHints: Array<"codex" | "roo" | "shared">;
  fingerprint: string;
  apiId?: string;
  baseUrl?: string;
  model?: string;
  note?: string;
  secretRef: string;
  createdAt: string;
  updatedAt: string;
}
```

### 8.2 `provider-status.ts`

```ts
export interface ProviderActiveStatus {
  provider: "codex" | "roo";
  activeKeyFingerprint?: string;
  activeKeyId?: string;
  activeLabel?: string;
  apiId?: string;
  baseUrl?: string;
  model?: string;
  configName?: string;
  sourcePath?: string;
  runtimeAligned: boolean;
  observedAt: string;
}
```

### 8.3 `usage-stats.ts`

```ts
export interface UsageStatsSummary {
  keyId?: string;
  apiId?: string;
  totalUsage?: number;
  totalCost?: number;
  quota?: number;
  remainingQuota?: number;
  period: "daily" | "weekly" | "monthly";
  series: Array<{ date: string; usage: number; cost?: number }>;
  models: Array<{ model: string; usage: number; cost?: number }>;
  syncedAt: string;
}
```

## 9. Secret 存储方案

“手动切换 stored key” 这个能力一定涉及“key 存哪”。

这里必须先定规范，不然前面全做了，最后会卡在安全边界上。

### 9.1 推荐方案

优先级建议如下：

1. 首选：Windows Credential Manager
2. 次选：系统级 secret store
3. 最后兜底：本地 ignored 文件

### 9.2 不要这样做

不要把明文 key 放到：

- `module.json`
- `README.md`
- `logs/`
- `state/latest.json`
- 前端 API 响应
- git 可跟踪文件

### 9.3 本模块里推荐的 secret 引用方式

在 key registry 里只保存：

- `keyId`
- `label`
- `fingerprint`
- `apiId`
- `secretRef`

其中 `secretRef` 形态建议类似：

```text
wincred://vscode-key-guard/codex-main
```

或者兜底：

```text
file://.runtime/extensions/vscode-key-guard/state/registry/keys.local.json#codex-main
```

## 10. Soxio Usage 统计接入方式

这里建议新增一条独立的 usage adapter 链路，而不是把外部请求直接塞进已有 diagnosis service。

### 10.1 推荐新增服务

- `backend/services/key-registry-service.ts`
- `backend/services/usage-stats-service.ts`
- `backend/services/soxio-stats-client.ts`
- `backend/services/key-switch-service.ts`
- `backend/services/codex-write-service.ts`
- `backend/services/roo-write-service.ts`

### 10.2 Soxio 统计接入顺序

建议按下面顺序做：

1. 如果 registry 里已经有 `apiId`，直接查 stats
2. 如果只有 secret，没有 `apiId`，先通过 `get-key-id` 换出 `apiId`
3. 再拉 `user-stats`
4. 再拉 `user-model-stats`
5. 将结果写入本地 usage cache
6. 前端只读本模块自己的 `/api/key-guard/usage`

### 10.3 注意事项

- 不要让前端直接请求 Soxio
- 不要把 raw key 直接传给前端
- 外部 stats 请求失败时，不要阻断本地配置诊断
- 额度统计应做缓存，避免每次打开页面都打远端

## 11. 切换流程规范

手动切换 key 的实现一定要是“受控写入”，不能做成一个随便改配置的危险按钮。

### 11.1 Codex 切换

切换 `Codex` 时：

1. 从 registry 取出目标 `StoredKeyEntry`
2. 解出真实 secret
3. 备份 `C:\Users\ASUS-KL\.codex\auth.json`
4. 必要时读取并维持 `config.toml` 中既有 `base_url / model / provider`
5. 写入新 key
6. 重采样 snapshot
7. 写入 audit

### 11.2 Roo 切换

切换 `Roo Code` 时：

1. 从 registry 取出目标 `StoredKeyEntry`
2. 解出真实 secret
3. 备份 `C:\Users\ASUS-KL\.roo\.env.local`
4. 写入 `OPENAI_API_KEY`
5. 必要时同步 `OPENAI_BASE_URL`、`OPENAI_MODEL`、`ROO_CODE_CONFIG_NAME`
6. 如果 diagnosis 判断运行态仍旧指向旧配置，提示 reload
7. 需要时执行“对齐活动配置名”的受控修复
8. 写入 audit

### 11.3 切换后必须做的事

切换后必须：

- 重采样当前 provider snapshot
- 比对 fingerprint 是否已变成目标 key
- 记录 `from → to`
- 标记是否需要 `Developer: Reload Window`
- 如果失败，提示恢复备份

## 12. 操作规范

这一部分要当成强约束，不是“建议”。

### 12.1 只显示指纹，不显示明文

前端面板里“当前在用哪个 key” 的含义应当是：

- label
- fingerprint
- apiId
- provider
- source path

不是显示整串 key。

### 12.2 先备份，后写入

凡是会改：

- `auth.json`
- `config.toml`
- `.env.local`
- VS Code 运行态相关文件

都必须先备份。

### 12.3 运行态修改默认保守

对于：

- `state.vscdb`
- Roo task index
- VS Code globalStorage

默认只读和诊断，不默认直接写。

只有在明确属于“受控修复剧本”的情况下才允许写。

### 12.4 前端不直接保存 raw key

前端提交 raw key 的场景只允许发生在“新增 stored key”这一个入口，且提交后：

- 服务端立即转存到 secret store
- 响应里不再返回 raw key

### 12.5 切换按钮必须带确认信息

切换前至少显示：

- 当前 key
- 目标 key
- 将改哪些文件
- 是否会要求 reload
- 是否存在高风险运行态对齐

## 13. 推荐实施步骤

这部分按顺序做，最稳。

### 第一步：保留现有 snapshot / diagnosis 链

不要先推翻已有代码，直接在现有基础上加能力。

### 第二步：补 key registry

先实现：

- `GET /api/key-guard/keys`
- `POST /api/key-guard/keys`

先让“有哪些可切换 key” 成立。

### 第三步：补 provider active view

新增：

- `GET /api/key-guard/providers`

把当前生效 key 和 registry 对上号。

### 第四步：补 usage adapter

先实现只读统计：

- `GET /api/key-guard/usage`
- `POST /api/key-guard/usage/refresh`

先把“看得到额度”做出来，再做切换。

### 第五步：升级前端页面

把现有 `index.html` 从“诊断 JSON 页面”升级成：

- 概览卡片
- provider 状态面板
- usage 图表区
- key registry 列表
- switch 面板

### 第六步：补 switch route

新增：

- `POST /api/key-guard/switch`

切换默认只支持：

- Codex
- Roo

不要一开始就碰更多 provider。

### 第七步：补审计和回滚信息

切换完成后写入：

- latest state
- switch history
- backup path
- reload required flag

## 14. 推荐目录树

下面这棵树是当前模块做完本次升级后建议采用的结构。

```text
vscode-key-guard/
├─ README.md
├─ module.json
├─ package.json
├─ tsconfig.json
├─ index.ts
├─ backend/
│  ├─ app.ts
│  ├─ routes/
│  │  ├─ diagnosis.ts
│  │  ├─ http.ts
│  │  ├─ keys.ts
│  │  ├─ providers.ts
│  │  ├─ repair.ts
│  │  ├─ snapshots.ts
│  │  ├─ switch.ts
│  │  └─ usage.ts
│  ├─ services/
│  │  ├─ audit-service.ts
│  │  ├─ codex-config-service.ts
│  │  ├─ codex-write-service.ts
│  │  ├─ diagnosis-service.ts
│  │  ├─ key-registry-service.ts
│  │  ├─ key-switch-service.ts
│  │  ├─ roo-config-service.ts
│  │  ├─ roo-write-service.ts
│  │  ├─ runtime-state-paths.ts
│  │  ├─ soxio-stats-client.ts
│  │  ├─ usage-stats-service.ts
│  │  └─ vscode-state-service.ts
│  └─ jobs/
│     ├─ periodic-scan.ts
│     └─ periodic-usage-refresh.ts
├─ core/
│  ├─ types/
│  │  ├─ config-snapshot.ts
│  │  ├─ diagnosis.ts
│  │  ├─ provider-status.ts
│  │  ├─ repair-action.ts
│  │  ├─ stored-key.ts
│  │  └─ usage-stats.ts
│  └─ utils/
│     ├─ fingerprint.ts
│     ├─ redact.ts
│     ├─ secret-store.ts
│     └─ time.ts
├─ frontend/
│  ├─ pages/
│  │  └─ vscode-key-guard/
│  │     ├─ index.html
│  │     ├─ app.ts
│  │     ├─ style.css
│  │     └─ components/
│  │        ├─ key-registry-table.ts
│  │        ├─ overview-cards.ts
│  │        ├─ provider-panel.ts
│  │        ├─ switch-panel.ts
│  │        ├─ usage-chart.ts
│  │        └─ usage-summary.ts
│  └─ shared/
│     └─ api.ts
├─ docs/
│  ├─ architecture.md
│  ├─ diagnosis-rules.md
│  ├─ stats-adapter.md
│  └─ switch-playbook.md
├─ knowledge/
│  ├─ config-locations.md
│  ├─ incident-log.md
│  └─ known-issues.md
├─ mcp/
│  └─ vscode-key-guard-mcp.mjs
└─ .runtime/
   └─ extensions/
      └─ vscode-key-guard/
         ├─ cache/
         │  └─ usage-cache.json
         ├─ logs/
         ├─ state/
         │  ├─ latest.json
         │  ├─ history/
         │  │  ├─ diagnosis-history.jsonl
         │  │  └─ switch-history.jsonl
         │  ├─ backups/
         │  └─ registry/
         │     └─ keys.local.json
         └─ temp/
```

## 15. 前端面板落地顺序

为了不把事情做炸，建议按这个顺序加：

1. 保留现有 `diagnosis` 页
2. 增加顶部概览卡片
3. 增加 `Codex / Roo` provider 卡片
4. 增加 key registry 表格
5. 增加 usage summary 卡片
6. 增加 usage 趋势图
7. 最后再加 switch 面板

不要一开始就把图表、切换、注册表一起上。

## 16. 一句话收束

这次要做的不是“再加一个页面”，而是把 `vscode-key-guard` 从：

> 配置漂移诊断模块

升级成：

> **Codex / Roo Key 活动状态面板 + 额度统计面板 + 手动切换控制台**

而且这套实现必须继续遵守最开始那条底线：

> **Roo Code 和 Codex 只认固定配置真源，前端只看本模块 API，敏感信息只显示指纹，不显示明文。**
