# Roo Code升级计划书

## 1. 目标与范围

本计划用于把 Roo Code 的能力增强放在 **Roo/Cursor 自身目录**，而不是业务仓库内，达到以下目标：

1. 提升自动化验收与回归效率（页面、API、日志、截图闭环）
2. 强化可复用工程流程（Skill 编排）
3. 保持可回滚、可审计、低侵入（业务代码与代理能力解耦）

本计划覆盖：

- MCP 服务接入
- Skill 体系建设
- 运行权限与安全边界配置
- 目录结构与版本管理规范

---

## 2. 当前环境与关键路径

### 2.1 Roo/Cursor 侧目录（用户配置）

- `C:/Users/ASUS-KL/.cursor/permissions.json`
- `C:/Users/ASUS-KL/.cursor/sandbox.json`
- `C:/Users/ASUS-KL/.cursor/skills-cursor/`
- `C:/Users/ASUS-KL/.cursor/projects/e-Auto/mcps/`

### 2.2 业务仓库侧可复用能力入口

- `E:/Auto/projects/extensions/experience-manager/mcp/experience-manager-mcp.mjs`
- `E:/Auto/projects/extensions/experience-manager/package.json`（已有 `mcp` 启动脚本）

### 2.3 配置落位分层（已更新）

- Roo 运行时根目录（真实生效）：
  - `C:/Users/ASUS-KL/.cursor/projects/e-Auto/mcps/`
- 仓库映射根目录（可版本化提交）：
  - `E:/Auto/.cursor/projects/e-Auto/mcps/`

说明：本计划优先在 Roo 目录注册能力；业务仓库仅作为部分 MCP 的实现来源，不改变你“能力增强在 Roo 目录”的主诉求。

运行参数解耦约定（新增）：

- `start.cmd` 运行时优先读取 `ROO_TARGET_REPO`，未设置时回退到当前工作目录 `%CD%`
- `playwright-browser` 支持 `ROO_PLAYWRIGHT_MCP` 显式指定入口，未设置时按 `ROO_TARGET_REPO` 自动探测
- 禁止在启动脚本中硬编码 `E:/Auto` 作为唯一目标仓库路径

---

## 3. 需要新增的能力清单

## 3.1 MCP（优先级从高到低）

### MCP-1: playwright-browser（高优先）

作用：

- 页面级真验收（加载、控制台错误、关键元素）
- 回归截图归档
- 批量 URL 巡检

落位建议：

- 启动包装脚本：`C:/Users/ASUS-KL/.cursor/projects/e-Auto/mcps/playwright-browser/`
- 输出目录：`C:/Users/ASUS-KL/.cursor/projects/e-Auto/mcps/_artifacts/playwright/`

### MCP-2: experience-manager-mcp（高优先）

作用：

- 经验库读写、检索、同步
- 为 Skill 提供结构化经验回写能力

落位建议：

- 注册文件放 Roo：`C:/Users/ASUS-KL/.cursor/projects/e-Auto/mcps/experience-manager/`
- 实际服务进程调用：
  - `node E:/Auto/projects/extensions/experience-manager/mcp/experience-manager-mcp.mjs`

### MCP-3: repo-inspector（中优先）

作用：

- 统一暴露 Git 状态、变更摘要、风险文件扫描
- 给 Skill 提供“改动前后对比”能力

落位建议：

- `C:/Users/ASUS-KL/.cursor/projects/e-Auto/mcps/repo-inspector/`

### MCP-4: log-diagnose（中优先）

作用：

- 聚合 gateway、模块日志与 pageerror 诊断
- 输出统一错误报告

落位建议：

- `C:/Users/ASUS-KL/.cursor/projects/e-Auto/mcps/log-diagnose/`

### MCP-5: db-readonly（中低优先）

作用：

- 只读 SQL 诊断（禁止 DDL/DML）
- 快速定位接口异常数据

落位建议：

- `C:/Users/ASUS-KL/.cursor/projects/e-Auto/mcps/db-readonly/`

---

## 3.2 Skills（建议首批 6 个）

### SKILL-1: module-acceptance

标准化模块验收：

1. 启动隔离端口
2. 健康检查
3. 页面/API 验证
4. 收集日志和截图
5. 输出验收结论

目录：

- `C:/Users/ASUS-KL/.cursor/skills-cursor/module-acceptance/`

### SKILL-2: gateway-restart-safe

标准化网关重启：

1. 检测端口占用
2. 判断是否 stale 进程
3. 安全重启
4. 就绪探测（三层检查）
5. 失败回滚提示

目录：

- `C:/Users/ASUS-KL/.cursor/skills-cursor/gateway-restart-safe/`

### SKILL-3: regression-snapshot

批量回归：

1. 读取 URL 清单
2. 页面截图
3. 收集 console/pageerror
4. 生成差异摘要

目录：

- `C:/Users/ASUS-KL/.cursor/skills-cursor/regression-snapshot/`

### SKILL-4: migration-boundary-check

迁移边界检查：

- 路径根是否正确
- plugin id 与导出是否一致
- 历史路由别名是否残留
- 共享导航是否正确注入

目录：

- `C:/Users/ASUS-KL/.cursor/skills-cursor/migration-boundary-check/`

### SKILL-5: incident-triage

线上故障分诊：

- 快照系统状态
- 定位首个错误源
- 分级输出修复建议

目录：

- `C:/Users/ASUS-KL/.cursor/skills-cursor/incident-triage/`

### SKILL-6: release-preflight

上线前检查：

- 配置一致性
- 关键路由健康
- 核心页面可用性
- 结果归档

目录：

- `C:/Users/ASUS-KL/.cursor/skills-cursor/release-preflight/`

---

## 3.3 其他配套模块

### OPS-1: 配置模板层

目录：

- `C:/Users/ASUS-KL/.cursor/projects/e-Auto/mcps/_templates/`

内容：

- MCP 启动参数模板
- 环境变量模板
- 日志策略模板

### OPS-2: 报告与证据归档层

目录：

- `C:/Users/ASUS-KL/.cursor/projects/e-Auto/mcps/_artifacts/`
  - `acceptance/`
  - `regression/`
  - `triage/`

### OPS-3: 风险控制层

配置文件：

- `C:/Users/ASUS-KL/.cursor/permissions.json`
- `C:/Users/ASUS-KL/.cursor/sandbox.json`

目标：

- 仅对高风险命令保留人工确认
- 对低风险读写与检测动作实现自动化

## 3.4 开源降本增效模块（新增）

> 目标：降低上下文 token 消耗，同时提高回答相关性与稳定性。

### COST-1: Prompt Compression（LLMLingua）

开源项目：

- `microsoft/LLMLingua`

作用：

- 在发送给模型前压缩上下文，通常可减少 30%~70% 输入 token（视文本类型而定）
- 保留高信息密度片段，减少无关上下文

落位建议：

- `C:/Users/ASUS-KL/.cursor/projects/e-Auto/mcps/prompt-compressor/`

接入位置：

- 接在 `module-acceptance`、`incident-triage`、`release-preflight` 的“请求组包前”步骤

### COST-2: Reranker（二阶段检索重排）

开源项目：

- `BAAI/bge-reranker-base` 或 `jinaai/jina-reranker-v2-base-multilingual`

作用：

- 先召回再重排，只把 Top-K 高相关片段送入模型
- 减少“长上下文全量喂入”造成的 token 浪费

落位建议：

- `C:/Users/ASUS-KL/.cursor/projects/e-Auto/mcps/context-reranker/`

### COST-3: 向量检索（LanceDB / Qdrant）

开源项目：

- `lancedb/lancedb`（本地优先）
- `qdrant/qdrant`（服务化优先）

作用：

- 把“全量日志/文档扫描”改成“语义召回”
- 提升命中率并减少传给模型的候选文本

落位建议：

- `C:/Users/ASUS-KL/.cursor/projects/e-Auto/mcps/context-store/`

### COST-4: 结构化输出约束（JSON Schema / Guardrails）

开源项目：

- `guardrails-ai/guardrails`

作用：

- 约束输出格式，减少反复追问和重试
- 间接节省 token（少走纠错回合）

落位建议：

- `C:/Users/ASUS-KL/.cursor/projects/e-Auto/mcps/output-guard/`

### COST-5: 记忆蒸馏与会话摘要（轻量化长期记忆）

开源项目：

- `mem0ai/mem0`（可选）
- 或继续沿用现有 memory 体系，新增“日终蒸馏”脚本

作用：

- 把长会话压缩为高价值摘要，后续只加载摘要与关键证据
- 降低跨天任务的上下文成本

落位建议：

- `C:/Users/ASUS-KL/.cursor/projects/e-Auto/mcps/memory-distill/`

---

## 3.5 对标 Cursor 原生能力的开源参考（新增，2026-03 更新）

> 目标：补齐“原生工程助手”常见能力带宽（检索、记忆、结构化输出、自动化浏览器、代码索引、观察性）。

### PARITY-1: 代码检索与索引

- `sourcegraph/zoekt`：超快代码检索后端，适合大仓库本地索引
- `tree-sitter/tree-sitter`：语法级代码结构解析，可用于 Skill 的精确片段提取

### PARITY-2: 浏览器自动化与 E2E

- `microsoft/playwright`：已接入，建议持续使用其 MCP 能力作为页面验收主链路
- `browser-use/browser-use`（可选）：适合复杂多步网页代理任务

### PARITY-3: 检索增强与长上下文降本

- `microsoft/LLMLingua`：输入压缩
- `BAAI/bge-reranker-base` 或 `jinaai/jina-reranker-v2-base-multilingual`：重排
- `lancedb/lancedb` 或 `qdrant/qdrant`：语义检索存储

### PARITY-4: 结构化输出与治理

- `guardrails-ai/guardrails`：输出校验与重试约束
- `json-schema-org/json-schema-spec`：标准结构约束基础

### PARITY-5: 长期记忆与经验沉淀

- `mem0ai/mem0`：会话记忆抽取与召回
- `langchain-ai/langgraph`（可选）：多步骤 Agent 工作流编排

### PARITY-6: 观测与故障诊断

- `open-telemetry/opentelemetry-collector`：链路与日志统一采集
- `grafana/loki` + `grafana/grafana`：日志检索与可视化

---

## 4. 实施步骤（详细）

## 阶段 A：目录与骨架初始化（Day 1）

1. 创建 Roo 项目级 MCP 目录
   - `C:/Users/ASUS-KL/.cursor/projects/e-Auto/mcps/`
2. 创建通用目录
   - `_templates/`
   - `_artifacts/`
3. 创建 Skill 目录骨架
   - `C:/Users/ASUS-KL/.cursor/skills-cursor/module-acceptance/`
   - `C:/Users/ASUS-KL/.cursor/skills-cursor/gateway-restart-safe/`
   - `C:/Users/ASUS-KL/.cursor/skills-cursor/regression-snapshot/`
   - `C:/Users/ASUS-KL/.cursor/skills-cursor/migration-boundary-check/`
   - `C:/Users/ASUS-KL/.cursor/skills-cursor/incident-triage/`
   - `C:/Users/ASUS-KL/.cursor/skills-cursor/release-preflight/`
4. 每个 Skill 目录内至少包含
   - `SKILL.md`
   - `examples.md`
   - `checklist.md`

交付标准：

- 目录完整可见
- Skill 骨架文件可读取

---

## 阶段 B：MCP 接入与单点验证（Day 2-3）

1. 接入 `playwright-browser` MCP
   - 完成启动脚本与基础参数
   - 通过 3 个 URL 的截图+console 验证
2. 接入 `experience-manager-mcp`
   - 使用现有实现：`E:/Auto/projects/extensions/experience-manager/mcp/experience-manager-mcp.mjs`
   - 验证最小可用工具链路（读写/查询至少一条）
3. 新增 `repo-inspector` MCP
   - 提供 git 状态与差异摘要工具
4. 报告落盘
   - 统一输出到 `_artifacts/acceptance/`

交付标准：

- 至少 2 个 MCP 可用
- 形成可复现验收证据

---

## 阶段 C：Skill 编排落地（Day 4-5）

1. 完成 `module-acceptance` 与 `regression-snapshot`
   - 以“输入 URL 清单 -> 产出报告”闭环
2. 完成 `gateway-restart-safe`
   - 统一重启流程，避免误判
3. 完成 `migration-boundary-check`
   - 固化迁移硬约束检查项
4. 将通用步骤沉淀到模板
   - `_templates/skill-output-template.md`

交付标准：

- 至少 3 个 Skill 可直接复用
- 一次完整验收可由 Skill 自动跑通

---

## 阶段 D：安全策略收口与优化（Day 6）

1. 审核 `permissions.json`
   - 允许常规工程命令自动执行
   - 保留高风险动作确认
2. 审核 `sandbox.json`
   - 确保网络与文件边界符合预期
3. 建立回滚指引
   - 记录禁用某 MCP/Skill 的最短路径

交付标准：

- 自动化效率提升且风险可控
- 具备一键停用能力

---

## 5. 完整树状图（当前 + 目标，已更新）

```text
[运行时生效根]
C:/Users/ASUS-KL/.cursor/
├── permissions.json
├── sandbox.json
├── skills-cursor/
│   ├── .cursor-managed-skills-manifest.json
│   ├── module-acceptance/
│   ├── gateway-restart-safe/
│   ├── regression-snapshot/
│   ├── migration-boundary-check/
│   ├── incident-triage/
│   └── release-preflight/
└── projects/
    └── e-Auto/
        ├── mcps/
        │   ├── _templates/
        │   ├── _artifacts/
        │   │   ├── acceptance/
        │   │   ├── regression/
        │   │   └── triage/
        │   ├── playwright-browser/
        │   │   ├── server.json
        │   │   ├── start.cmd
        │   │   └── README.md
        │   ├── experience-manager/
        │   │   ├── server.json
        │   │   ├── start.cmd
        │   │   └── README.md
        │   ├── repo-inspector/
        │   │   ├── server.json
        │   │   ├── start.cmd
        │   │   └── README.md
        │   ├── log-diagnose/
        │   │   ├── server.json
        │   │   ├── start.cmd
        │   │   └── README.md
        │   ├── db-readonly/
        │   ├── prompt-compressor/
        │   ├── context-reranker/
        │   ├── context-store/
        │   ├── output-guard/
        │   └── memory-distill/
        ├── agent-transcripts/
        └── terminals/

[仓库映射根（用于版本管理与审计）]
E:/Auto/
├── .cursor/
│   └── projects/
│       └── e-Auto/
│           └── mcps/
│               ├── README.md
│               ├── playwright-browser/
│               │   └── start.cmd
│               ├── repo-inspector/
│               │   └── start.cmd
│               └── log-diagnose/
│                   └── start.cmd
├── Roo Code升级计划书.md
└── projects/
    └── extensions/
        └── experience-manager/
            ├── mcp/
            │   └── experience-manager-mcp.mjs
            └── package.json
```

---

## 6. 配置与运维规范

1. 不在业务仓库硬编码 Roo 私有路径
2. MCP 配置统一放 `mcps/<name>/server.json`
3. 每个 Skill 必须有输入、输出、失败回退说明
4. 证据必须落盘（截图、日志、摘要）
5. 高风险操作必须保留人工确认

---

## 7. 验收标准

1. 至少 3 个 MCP 可稳定调用
2. 至少 3 个 Skill 可完整执行并产出报告
3. 关键页面回归可自动截图并生成错误摘要
4. 网关重启流程可标准化执行并具备失败回滚指引
5. 全部新增能力均可通过删除对应目录快速回退

---

## 8. 风险与回滚

### 8.1 风险

- MCP 进程异常导致能力不可用
- 权限策略过宽导致误操作风险
- Skill 编排过复杂导致维护成本上升

### 8.2 回滚

1. 先停用目标 MCP/Skill 对应目录
2. 恢复 `permissions.json` 与 `sandbox.json` 的上一版
3. 仅保留已验证稳定的最小能力集（playwright + module-acceptance）

---

## 9. 首周执行顺序建议

- Day 1: 阶段 A
- Day 2-3: 阶段 B
- Day 4-5: 阶段 C
- Day 6: 阶段 D
- Day 7: 总体验收与留档

此计划完成后，Roo Code 的能力将从“代码建议”升级为“工程流程自动执行 + 证据化验收 + 可回滚治理”。

---

## 10. 部署状态报告（执行回填）

执行时间（UTC）：2026-03-28T06:38:00Z

### 10.1 已完成项

- 已创建 Skill 目录与基线文件（6 组）：
  - `module-acceptance`
  - `gateway-restart-safe`
  - `regression-snapshot`
  - `migration-boundary-check`
  - `incident-triage`
  - `release-preflight`
- 已创建 MCP 包装目录与基线文件（10 组）：
  - `playwright-browser`
  - `experience-manager`
  - `repo-inspector`
  - `log-diagnose`
  - `db-readonly`
  - `prompt-compressor`
  - `context-reranker`
  - `context-store`
  - `output-guard`
  - `memory-distill`
- 已完成 `experience-manager` 启动器接线（已升级为 env-first）：
  - 优先读取 `ROO_EXPERIENCE_MANAGER_MCP`
  - 未设置时按 `ROO_TARGET_REPO` 自动探测入口
  - 已消除单一仓库硬绑定
- 已创建模板与归档目录：
  - `_templates/`、`_artifacts/acceptance/`、`_artifacts/regression/`、`_artifacts/triage/`

### 10.2 验证结果

结构验证（目录/文件存在性）：

- Skills：6/6 通过
- MCP wrappers：10/10 通过

配置验证（`server.json` 可解析性）：

- MCP `server.json`：10/10 通过 JSON 解析

### 10.3 运行态测试说明

- 本轮已完成“结构与配置”测试，确认可用于下一步接入真实 MCP 进程。
- `experience-manager/start.cmd` 已接入真实服务入口。
- `playwright-browser`、`repo-inspector`、`log-diagnose` 已从骨架升级为 env-first 最小可用启动器。
- 其余 MCP 仍为骨架启动器（占位），将在后续逐个实现真实服务。

### 10.4 Phase-2 实施进展（2026-03-28）

- 已完成 `playwright-browser/start.cmd` env-first 入口接线：
  - 优先 `ROO_PLAYWRIGHT_MCP`
  - 未设置时按 `ROO_TARGET_REPO` 自动探测：
    - `%ROO_TARGET_REPO%\projects\node_modules\playwright\lib\mcp\index.js`
    - `%ROO_TARGET_REPO%\node_modules\playwright\lib\mcp\index.js`
- 已完成 `repo-inspector/start.cmd` env-first 最小功能实现：
  - 目标仓库：`ROO_TARGET_REPO`（回退 `%CD%`）
  - 输出 `git status --short`
  - 输出 `git diff --shortstat`

### 10.5 Phase-2 Smoke 测试证据

执行命令：

- `"C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\playwright-browser\start.cmd" --smoke`
- `"C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\repo-inspector\start.cmd" --smoke`

关键输出：

- `set "ROO_TARGET_REPO=e:\Auto"`
- `[playwright-browser] smoke ok`
- `[playwright-browser] target_repo=e:\Auto`
- `[playwright-browser] entry=e:\Auto\projects\node_modules\playwright\lib\mcp\index.js`
- `[repo-inspector] mode=smoke`
- `[repo-inspector] target_repo=e:\Auto`
- `--- git status --short ---`（成功输出仓库变更列表）
- `--- git diff --shortstat ---`（成功输出差异统计）

结论：

- `playwright-browser` 入口存在且可执行（smoke 通过）
- `repo-inspector` 最小诊断链路可执行（smoke 通过）

### 10.6 Phase-3 实施进展（2026-03-28）

- 已完成 `log-diagnose/start.cmd` env-first 最小功能实现：
  - 目标仓库：`ROO_TARGET_REPO`（回退 `%CD%`）
  - `--smoke`：检查关键启动脚本存在性
  - 默认模式：扫描常见脚本中的错误关键词（`error`/`exception`/`failed`/`fatal`）

### 10.7 Phase-3 Smoke 与运行证据

执行命令：

- `"C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\log-diagnose\start.cmd" --smoke`
- `"C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\log-diagnose\start.cmd"`

关键输出：

- `[log-diagnose] mode=smoke`
- `[log-diagnose] found openclaw-gateway-run.ps1`
- `[log-diagnose] found openclaw-gateway-child.ps1`
- `[log-diagnose] found start-openclaw-admin.ps1`
- `[log-diagnose] found start-openclaw.bat`
- 默认扫描模式成功输出多条命中行并正常结束：`[log-diagnose] done`

结论：

- `log-diagnose` 已从骨架升级为最小可用 MCP 启动器。
- 具备可复现的 smoke 与默认扫描链路。

### 10.8 当前结论

- 计划的骨架部署已达成。
- 已有 3 个 MCP 启动器具备最小可用能力并通过运行态验证：
  - `playwright-browser`
  - `repo-inspector`
  - `log-diagnose`
- 在目录与配置层面已实现隔离、低耦合、高内聚、可扩展。
- 完整生产可用性仍取决于其余 MCP 的真实实现与联调。

### 10.9 路径治理修正（2026-03-28）

- 已完成“根目录误放文件”纠偏：
  - 从仓库根下临时路径迁移到映射根 `.cursor/projects/e-Auto/mcps/`
- 版本库中的可审计配置以映射根为准；Roo 运行时目录继续作为实际生效目录。
- 本文档树状图与实施描述已同步到最新分层策略，避免后续路径漂移。

---

## 11. 详细部署指南（可复现、可运行）

> 本章节提供从零到可运行的命令级步骤。默认环境：Windows + `cmd.exe` + Node.js + Git。

### 11.1 前置条件

1. 已安装 Node.js（建议 18+）
2. 已安装 Git 并可在命令行执行
3. Roo 运行时目录可写：`C:/Users/ASUS-KL/.cursor/projects/e-Auto/mcps/`
4. 目标仓库可访问（示例：`E:/Auto`）

验证命令：

```cmd
node -v
git --version
if exist C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps (echo MCP_ROOT_OK) else (echo MCP_ROOT_MISSING)
if exist E:\Auto (echo TARGET_REPO_OK) else (echo TARGET_REPO_MISSING)
```

### 11.2 建立环境变量（当前会话）

```cmd
set "ROO_TARGET_REPO=E:\Auto"
set "ROO_PLAYWRIGHT_MCP="
```

说明：

- `ROO_TARGET_REPO`：所有 env-first 启动器的统一目标仓库
- `ROO_PLAYWRIGHT_MCP`：可选，手工指定 Playwright MCP 入口；留空时自动探测

### 11.3 部署映射根配置到 Roo 运行时根

> 推荐做法：以仓库映射根为“版本源”，复制到 Roo 运行时根。

```cmd
copy /y E:\Auto\.cursor\projects\e-Auto\mcps\playwright-browser\start.cmd C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\playwright-browser\start.cmd
copy /y E:\Auto\.cursor\projects\e-Auto\mcps\repo-inspector\start.cmd C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\repo-inspector\start.cmd
copy /y E:\Auto\.cursor\projects\e-Auto\mcps\log-diagnose\start.cmd C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\log-diagnose\start.cmd
```

### 11.4 执行 smoke 验证（必做）

```cmd
set "ROO_TARGET_REPO=E:\Auto"
"C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\playwright-browser\start.cmd" --smoke
"C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\repo-inspector\start.cmd" --smoke
"C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\log-diagnose\start.cmd" --smoke
```

通过判定：

- `playwright-browser` 输出 `smoke ok`
- `repo-inspector` 输出 `mode=smoke` 且无 Git 致命错误
- `log-diagnose` 输出 `mode=smoke` 且关键脚本存在性结果合理

### 11.5 运行态验证（建议）

```cmd
set "ROO_TARGET_REPO=E:\Auto"
"C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\repo-inspector\start.cmd"
"C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\log-diagnose\start.cmd"
```

通过判定：

- `repo-inspector` 能输出 `git status --short` 与 `git diff --shortstat`
- `log-diagnose` 能扫描目标文件并正常结束 `done`

### 11.6 Roo 调用侧最小接入建议

- 在 Roo MCP 注册处保持 `command` 指向对应 `start.cmd`
- 不在 `start.cmd` 内硬编码仓库路径
- 会话前统一设定 `ROO_TARGET_REPO`，确保多 MCP 一致目标

---

## 12. 验证清单与验收门槛

### 12.1 文件级检查

```cmd
if exist C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\playwright-browser\start.cmd (echo OK_PLAYWRIGHT) else (echo MISS_PLAYWRIGHT)
if exist C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\repo-inspector\start.cmd (echo OK_REPO_INSPECTOR) else (echo MISS_REPO_INSPECTOR)
if exist C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\log-diagnose\start.cmd (echo OK_LOG_DIAGNOSE) else (echo MISS_LOG_DIAGNOSE)
```

### 12.2 行为级检查

- `playwright-browser --smoke` 成功
- `repo-inspector --smoke` 成功
- `log-diagnose --smoke` 成功
- `repo-inspector` 默认模式成功
- `log-diagnose` 默认模式成功

### 12.3 一致性检查

- 文档路径与实际路径一致
- 运行时根与映射根分层明确
- 启动器参数遵循 env-first 规则

---

## 13. 回滚与故障排查（确定性）

### 13.1 快速回滚（单 MCP）

1. 备份当前启动器
2. 还原上一版本启动器
3. 运行 `--smoke` 确认恢复

示例：

```cmd
copy /y C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\playwright-browser\start.cmd C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\playwright-browser\start.cmd.bak
copy /y E:\Auto\.cursor\projects\e-Auto\mcps\playwright-browser\start.cmd C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\playwright-browser\start.cmd
set "ROO_TARGET_REPO=E:\Auto"
"C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\playwright-browser\start.cmd" --smoke
```

### 13.2 常见故障矩阵

1. 现象：`playwright-browser` 提示 missing entry
   - 原因：目标仓库下无 Playwright MCP 文件
   - 处理：设置 `ROO_TARGET_REPO` 指向正确仓库，或设置 `ROO_PLAYWRIGHT_MCP` 绝对路径

2. 现象：`repo-inspector` 提示 not a git worktree
   - 原因：`ROO_TARGET_REPO` 未指向 Git 仓库
   - 处理：修正 `ROO_TARGET_REPO`，执行 `git -C <repo> rev-parse --is-inside-work-tree`

3. 现象：`log-diagnose` 全部 missing
   - 原因：目标仓库路径错误或脚本不存在
   - 处理：确认 `ROO_TARGET_REPO` 与目标脚本清单是否匹配

4. 现象：命令输出路径尾部有空格导致判断异常
   - 原因：`set` 语法错误（写成 `set VAR=... `）
   - 处理：统一使用 `set "ROO_TARGET_REPO=E:\Auto"`

### 13.3 发布前最终检查（建议固定流程）

```cmd
set "ROO_TARGET_REPO=E:\Auto"
"C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\playwright-browser\start.cmd" --smoke && "C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\repo-inspector\start.cmd" --smoke && "C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\log-diagnose\start.cmd" --smoke
```

全部返回成功后再进入下一步联调或自动化编排。

---

## 14. Phase-8 执行回填（2026-03-28）

### 14.1 已完成改造

- `experience-manager/start.cmd` 已改为 env-first：
  - `ROO_EXPERIENCE_MANAGER_MCP` 优先
  - 未设置时按 `ROO_TARGET_REPO` 自动探测：
    - `%ROO_TARGET_REPO%\projects\extensions\experience-manager\mcp\experience-manager-mcp.mjs`
    - `%ROO_TARGET_REPO%\extensions\experience-manager\mcp\experience-manager-mcp.mjs`
- `db-readonly/start.cmd` 已从 TODO 占位改为最小只读探测实现：
  - `--smoke`：验证目标仓库为 Git worktree
  - 默认模式：只读列举 DB 相关候选文件关键字（不执行任何写操作）

### 14.2 部署落位

- Roo 运行时根：
  - `C:/Users/ASUS-KL/.cursor/projects/e-Auto/mcps/experience-manager/start.cmd`
  - `C:/Users/ASUS-KL/.cursor/projects/e-Auto/mcps/db-readonly/start.cmd`
- 仓库映射根：
  - `E:/Auto/.cursor/projects/e-Auto/mcps/experience-manager/start.cmd`
  - `E:/Auto/.cursor/projects/e-Auto/mcps/db-readonly/start.cmd`

### 14.3 运行与验证证据

执行命令：

- `set "ROO_TARGET_REPO=E:\Auto"`
- `"C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\playwright-browser\start.cmd" --smoke && "C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\repo-inspector\start.cmd" --smoke && "C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\log-diagnose\start.cmd" --smoke && "C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\experience-manager\start.cmd" --smoke && "C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\db-readonly\start.cmd" --smoke`
- `"C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\db-readonly\start.cmd"`

关键输出：

- `[playwright-browser] smoke ok`
- `[repo-inspector] mode=smoke`（随后输出 `git status --short` 与 `git diff --shortstat`）
- `[log-diagnose] mode=smoke`（4 个目标脚本均 found）
- `[experience-manager] smoke ok`
- `[experience-manager] entry=E:\Auto\projects\extensions\experience-manager\mcp\experience-manager-mcp.mjs`
- `[db-readonly] smoke ok`
- `db-readonly` 默认模式输出候选文件列表（示例）：
  - `.vs/Auto/CopilotIndices/.../CodeChunks.db`
  - `.vs/Auto/CopilotIndices/.../SemanticSymbols.db`
  - `.vs/slnx.sqlite`

### 14.4 当前状态更新

- 已通过运行态验证的最小可用 MCP 启动器：
  - `playwright-browser`
  - `repo-inspector`
  - `log-diagnose`
  - `experience-manager`（smoke 通过）
  - `db-readonly`（smoke + default 通过）
- 仍待后续实现：其余占位 MCP 的真实服务链路与联调。
