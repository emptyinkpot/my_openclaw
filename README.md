# Atramenti-Console

## 中文

### 项目定位

`Atramenti-Console` 是一个围绕 OpenClaw 工作区搭建的本地优先控制台工程。
它不是单一页面，而是一个可扩展的控制台集合：既承载启动壳、控制 UI、插件模块，也承载业务工作流、运维检查、部署约定和云端同步入口。

当前项目的目标不是“先堆功能”，而是逐步收敛成一个结构清晰、真源明确、插件可扩展、部署可验证的控制台体系。

### 项目规划

当前阶段的规划重点如下：

- 统一控制台入口：把本地启动、Control UI、业务插件页面和云端网关纳入同一套访问体系。
- 统一插件结构：把业务能力收敛到 `projects/extensions` 下，以模块化方式组织。
- 统一导航真源：共享导航栏以 `projects/extensions/shared` 为唯一真源，避免副本漂移。
- 统一路由真源：每个模块只保留一个 canonical path，去掉长期兼容路径。
- 统一部署认知：把“仓库副本”“运行目录”“真配置路径”“服务入口”区分清楚。
- 统一验收方式：把健康检查、路由校验、插件加载校验、导航一致性校验沉淀成脚本。
- 面向长期维护：减少镜像目录、软兼容、历史残留和隐式依赖。

### 构建思想

这个项目遵循几条核心构建思想：

- 单一真源：共享资源、导航、配置入口、正式路由都应只有一份真源。
- 去兼容优先：优先消灭长期兼容层，而不是继续叠更多别名和 fallback。
- 模块自治：每个扩展模块尽量低耦合、高内聚，边界清晰。
- 本地优先：优先保证本地开发体验，同时支持同步到云端运行。
- 运行态与源码分离：缓存、日志、状态快照不应混入源码真源。
- 可验证优先：任何关键结构都尽量有脚本化检查，而不靠记忆排障。
- 壳层不吞错：Control UI 或壳层页面不能伪装插件失败，错误要能被快速识别。

### 目录树概览

```text
Atramenti-Console/
├─ projects/
│  ├─ control-ui-custom/        # 定制后的 Control UI 前端壳层
│  ├─ extensions/               # 核心扩展模块集合
│  │  ├─ shared/                # 共享导航与共享静态资源真源
│  │  ├─ kernel/                # 内核级测试、验收与边界检查
│  │  ├─ novel-manager/         # 小说管理模块
│  │  ├─ experience-manager/    # 经验中心模块
│  │  ├─ automation-hub/        # 自动化中心模块
│  │  ├─ file-manager/          # 文件管理模块
│  │  ├─ ai-model-hub/          # 模型聚合与管理模块
│  │  ├─ vscode-key-guard/      # 密钥守护与桥接模块
│  │  ├─ ops-observer/          # 运维观测模块
│  │  ├─ aghub-bridge/          # AGHub 桥接模块
│  │  ├─ superset-bridge/       # Superset 桥接模块
│  │  ├─ feishu-openclaw/       # 飞书相关集成
│  │  ├─ memory-lancedb-pro/    # 记忆系统模块
│  │  ├─ qmd/                   # 知识检索相关模块
│  │  └─ plugins/               # 历史/兼容插件区域，后续应继续收敛
│  ├─ apps/                     # 其他应用层内容
│  ├─ assets/                   # 静态资源
│  ├─ docs/                     # 项目文档
│  ├─ scripts/                  # 项目级脚本
│  ├─ openclaw.json             # 项目内配置副本/参考配置
│  └─ package.json              # 项目工作区脚本入口
├─ scripts/                     # 启动与部署辅助脚本
├─ tools/                       # 本地工具集
├─ workspace/                   # 工作区数据
├─ memory/                      # 记忆相关目录
├─ skills/                      # 本地技能与扩展说明
├─ .local/                      # 本地运行数据目录
├─ start-openclaw.bat           # Windows 本地启动入口
├─ start-openclaw-admin.ps1     # 管理员方式启动入口
├─ openclaw-gateway-run.ps1     # 网关启动脚本
├─ openclaw-gateway-child.ps1   # 网关子进程脚本
├─ openclaw-bootstrap.html      # 浏览器 token 引导页
├─ DEPLOYMENT-RUNBOOK.md        # 部署运行手册
├─ NETDATA-SETUP.md             # 监控相关记录
├─ OBSERVABILITY-TOOLS-GUIDE.md # 可观测工具说明
└─ README.md                    # 项目首页说明
```

### 关键目录说明

#### 根目录

- `start-openclaw.bat`：Windows 下最直接的本地启动入口。
- `openclaw-gateway-run.ps1`：用于组织 gateway 启动流程与检查。
- `openclaw-bootstrap.html`：用于在浏览器打开 Control UI 前种入 token。
- `.local/`：本地运行数据目录，避免污染用户目录下的全局 OpenClaw 数据。
- `tools/`：本地工具存放区，例如 `gh`、辅助命令等。

#### `projects/`

`projects/` 是这个仓库真正的应用主体。
除了启动壳之外，绝大多数业务和控制台能力都在这里继续展开。

#### `projects/control-ui-custom/`

这是自定义的 Control UI 壳层目录。
它承接 OpenClaw 原生控制台能力，同时逐步对接本项目自己的共享导航、入口规范和部署路径。

#### `projects/extensions/`

这是项目最核心的模块区域。
之后的长期建设重点都应尽量往这里收敛。

推荐理解方式：

- `shared/`：共享真源
- `kernel/`：检查、验收、结构约束
- 其他模块目录：各自负责一块业务或桥接能力

### 插件与模块体系

当前扩展模块大体可以分成几类：

- 业务控制台模块：如 `novel-manager`、`experience-manager`、`automation-hub`、`file-manager`
- 平台能力模块：如 `ai-model-hub`、`vscode-key-guard`
- 桥接模块：如 `aghub-bridge`、`superset-bridge`
- 基础共享模块：如 `shared`、`kernel`
- 知识与记忆模块：如 `qmd`、`memory-lancedb-pro`

### 开发约定

当前项目已经明确的一些重要约定：

- 共享导航真源在 `projects/extensions/shared`
- 扩展开发规范说明在 `projects/extensions/README.md`
- 共享导航使用说明在 `projects/extensions/shared/README.md`
- 内核测试与结构检查说明在 `projects/extensions/kernel/testing/README.md`
- 不鼓励长期兼容路径、镜像副本和历史 fallback
- 模块页面应该逐步统一到 canonical path
- 模块健康检查应优先于页面猜测

### 脚本与检查入口

根目录 `package.json` 当前暴露的关键脚本包括：

- `npm run start`：启动本地启动壳
- `npm run restore`：从 GitHub 恢复启动壳相关文件
- `npm run check:gateway:health`：检查 gateway 健康
- `npm run check:plugin:health`：检查插件健康
- `npm run check:route:verify`：检查路由与旧入口收口情况
- `npm run check:plugin:load`：检查插件加载完整性
- `npm run check:nav:sync`：检查共享导航是否漂移
- `npm run check:extensions:all`：串联执行整套检查

注意：

- 默认脚本优先检查本地运行态。
- 如果要校验云端，需要额外传入对应的 `--base-url`。

### 当前项目对应服务器

当前这个项目已经确认对应一台可操作的云端目标机：

- 主机 IP：`124.220.233.126`
- SSH 用户：`ubuntu`
- SSH 命令：`ssh ubuntu@124.220.233.126`
- 主机名：`VM-0-12-ubuntu`
- 服务器上的 OpenClaw 项目副本目录：`/srv/openclaw`
- 当前 gateway 服务名：`openclaw-gateway.service`
- 服务查看命令：`systemctl --user status openclaw-gateway.service --no-pager`
- Gateway 健康检查地址：`http://124.220.233.126:5000/health`
- Control UI 地址：`http://124.220.233.126:5000/control-ui-custom/index.html`

关键说明：

- 当前运行态配置真源是 `/home/ubuntu/.openclaw/openclaw.json`
- 不要默认认为 `/srv/openclaw/openclaw.json` 或 `/srv/openclaw/openclaw.linux.json` 就一定是线上实际生效配置
- `gateway.controlUi.basePath` 应保持为 `/control-ui-custom`
- `gateway.controlUi.root` 应保持为 `/srv/openclaw/control-ui-custom`

快速校验：

```powershell
ssh ubuntu@124.220.233.126 "hostname"
curl.exe http://124.220.233.126:5000/health
ssh ubuntu@124.220.233.126 "systemctl --user status openclaw-gateway.service --no-pager"
```

### 推荐阅读顺序

如果你是第一次接触这个仓库，建议按这个顺序理解：

1. 先看本 README，理解项目定位和目录结构。
2. 再看 `projects/extensions/README.md`，理解模块开发规范。
3. 再看 `projects/extensions/shared/README.md`，理解共享导航与共享资源真源。
4. 再看 `projects/extensions/kernel/testing/README.md`，理解结构检查脚本。
5. 最后再进入具体业务模块阅读实现。

### 适合后续继续补充到 README 的内容

后续还可以继续往这个 README 里补充：

- 架构图
- 模块依赖图
- 页面入口清单
- 云端部署拓扑图
- 插件发布规范
- 常见问题与排障手册索引
- 版本演进记录

---

## English

### Project Positioning

`Atramenti-Console` is a local-first console workspace built around the OpenClaw ecosystem.
It is not a single page application in the narrow sense. It is a structured control surface that includes the startup shell, Control UI, extension modules, business workflows, validation scripts, deployment conventions, and cloud synchronization entry points.

The goal of this project is not to keep stacking features blindly. The goal is to converge toward a console system with clear structure, explicit sources of truth, extensible plugins, and verifiable deployment behavior.

### Project Roadmap

The current planning focus is centered on the following:

- Unify console entry points: local startup, Control UI, business plugin pages, and cloud gateway access should live in one coherent access model.
- Unify plugin structure: business capabilities should converge under `projects/extensions`.
- Unify navbar source of truth: the shared navbar should live only in `projects/extensions/shared`.
- Unify route source of truth: each module should keep exactly one canonical path.
- Unify deployment understanding: repository copy, runtime directory, live config path, and service entry should be treated as different concepts.
- Unify validation: health checks, route verification, plugin load verification, and navbar consistency checks should all be scriptable.
- Optimize for long-term maintenance: reduce mirrored directories, soft compatibility layers, historical leftovers, and implicit dependencies.

### Build Philosophy

This project follows several core ideas:

- Single source of truth: shared resources, navbar definitions, config entry points, and formal routes should each have one source of truth.
- Prefer cleanup over compatibility: remove long-lived compatibility layers instead of stacking aliases and fallbacks.
- Module autonomy: each extension should remain cohesive and loosely coupled.
- Local-first development: preserve a strong local development workflow while still supporting cloud synchronization.
- Separate runtime from source: cache, logs, and runtime state snapshots should not become source-of-truth code.
- Verification first: important structural assumptions should be backed by scripts instead of memory-based troubleshooting.
- Shells must not hide failures: Control UI or shell pages should not mask real plugin failures.

### Directory Tree Overview

```text
Atramenti-Console/
├─ projects/
│  ├─ control-ui-custom/        # Customized Control UI shell
│  ├─ extensions/               # Core extension module collection
│  │  ├─ shared/                # Shared navbar and shared static source of truth
│  │  ├─ kernel/                # Kernel-level testing, acceptance, and boundary checks
│  │  ├─ novel-manager/         # Novel management module
│  │  ├─ experience-manager/    # Experience center module
│  │  ├─ automation-hub/        # Automation center module
│  │  ├─ file-manager/          # File management module
│  │  ├─ ai-model-hub/          # AI model aggregation and management module
│  │  ├─ vscode-key-guard/      # Key guard and bridge module
│  │  ├─ ops-observer/          # Operations observer module
│  │  ├─ aghub-bridge/          # AGHub bridge module
│  │  ├─ superset-bridge/       # Superset bridge module
│  │  ├─ feishu-openclaw/       # Feishu integration module
│  │  ├─ memory-lancedb-pro/    # Memory system module
│  │  ├─ qmd/                   # Knowledge retrieval module
│  │  └─ plugins/               # Historical / compatibility area to be reduced over time
│  ├─ apps/                     # Additional app-level content
│  ├─ assets/                   # Static assets
│  ├─ docs/                     # Project documents
│  ├─ scripts/                  # Project-level scripts
│  ├─ openclaw.json             # Project-side config copy / reference config
│  └─ package.json              # Project workspace script entry
├─ scripts/                     # Startup and deployment helper scripts
├─ tools/                       # Local tools
├─ workspace/                   # Workspace data
├─ memory/                      # Memory-related directories
├─ skills/                      # Local skills and extension instructions
├─ .local/                      # Local runtime data
├─ start-openclaw.bat           # Windows local startup entry
├─ start-openclaw-admin.ps1     # Elevated startup entry
├─ openclaw-gateway-run.ps1     # Gateway launcher script
├─ openclaw-gateway-child.ps1   # Gateway child process script
├─ openclaw-bootstrap.html      # Browser token bootstrap page
├─ DEPLOYMENT-RUNBOOK.md        # Deployment runbook
├─ NETDATA-SETUP.md             # Monitoring setup notes
├─ OBSERVABILITY-TOOLS-GUIDE.md # Observability tools guide
└─ README.md                    # Project homepage document
```

### Key Directory Notes

#### Root Directory

- `start-openclaw.bat`: the most direct local startup entry on Windows.
- `openclaw-gateway-run.ps1`: orchestrates gateway startup and checks.
- `openclaw-bootstrap.html`: seeds browser tokens before the Control UI opens.
- `.local/`: local runtime data directory to avoid polluting the global user-level OpenClaw data.
- `tools/`: local tool storage, including helper executables such as `gh`.

#### `projects/`

`projects/` is the real application body of this repository.
Beyond the startup shell, most business and console capabilities expand from this directory.

#### `projects/control-ui-custom/`

This is the customized Control UI shell.
It hosts the native OpenClaw control surface while gradually aligning with this project's own navbar, route, and deployment conventions.

#### `projects/extensions/`

This is the most important module area in the project.
Most long-term architecture work should continue converging here.

A useful mental model is:

- `shared/`: shared source of truth
- `kernel/`: validation, acceptance, structural rules
- other module folders: isolated business or bridge capabilities

### Plugin And Module System

The current extension set can be understood in several groups:

- Business console modules: `novel-manager`, `experience-manager`, `automation-hub`, `file-manager`
- Platform capability modules: `ai-model-hub`, `vscode-key-guard`
- Bridge modules: `aghub-bridge`, `superset-bridge`
- Shared foundation modules: `shared`, `kernel`
- Knowledge and memory modules: `qmd`, `memory-lancedb-pro`

### Development Conventions

Some important conventions are already established:

- The shared navbar source of truth lives in `projects/extensions/shared`
- Extension development rules are documented in `projects/extensions/README.md`
- Shared navbar usage is documented in `projects/extensions/shared/README.md`
- Kernel testing and structure checks are documented in `projects/extensions/kernel/testing/README.md`
- Long-lived compatibility routes, mirrored copies, and historical fallbacks are discouraged
- Module pages should gradually converge to canonical paths
- Module health checks should come before guessing at page-level UI issues

### Script And Validation Entry Points

The root `package.json` currently exposes these important scripts:

- `npm run start`: start the local startup shell
- `npm run restore`: restore startup-shell files from GitHub
- `npm run check:gateway:health`: verify gateway health
- `npm run check:plugin:health`: verify plugin health
- `npm run check:route:verify`: verify route behavior and legacy-entry cleanup
- `npm run check:plugin:load`: verify plugin load integrity
- `npm run check:nav:sync`: verify shared navbar consistency
- `npm run check:extensions:all`: run the full validation chain

Notes:

- The default scripts target the local runtime first.
- When validating cloud deployment, pass an explicit `--base-url`.

### Current Server Target For This Project

This project is currently confirmed to map to one operable cloud target:

- Host IP: `124.220.233.126`
- SSH user: `ubuntu`
- SSH command: `ssh ubuntu@124.220.233.126`
- Hostname: `VM-0-12-ubuntu`
- OpenClaw project copy on server: `/srv/openclaw`
- Active gateway service: `openclaw-gateway.service`
- Service status command: `systemctl --user status openclaw-gateway.service --no-pager`
- Gateway health URL: `http://124.220.233.126:5000/health`
- Control UI URL: `http://124.220.233.126:5000/control-ui-custom/index.html`

Important notes:

- The runtime config source of truth is `/home/ubuntu/.openclaw/openclaw.json`
- Do not assume `/srv/openclaw/openclaw.json` or `/srv/openclaw/openclaw.linux.json` is the live production config
- `gateway.controlUi.basePath` should remain `/control-ui-custom`
- `gateway.controlUi.root` should remain `/srv/openclaw/control-ui-custom`

Quick verification:

```powershell
ssh ubuntu@124.220.233.126 "hostname"
curl.exe http://124.220.233.126:5000/health
ssh ubuntu@124.220.233.126 "systemctl --user status openclaw-gateway.service --no-pager"
```

### Recommended Reading Order

If this is your first time exploring the repository, a good reading order is:

1. Start with this README to understand project positioning and top-level structure.
2. Read `projects/extensions/README.md` to understand extension development rules.
3. Read `projects/extensions/shared/README.md` to understand the shared navbar and shared resources source of truth.
4. Read `projects/extensions/kernel/testing/README.md` to understand the validation scripts.
5. Then dive into specific business modules.

### Good Future Additions To This README

Useful additions for the future include:

- architecture diagrams
- module dependency graphs
- page entry inventories
- cloud deployment topology diagrams
- plugin publishing conventions
- troubleshooting indexes
- version evolution notes
