# Atramenti Console

公开版导出自 `E:\My Project\Auto`，保留了启动脚本、OpenClaw 工作区源码、控制面板与扩展模块，同时移除了本地运行态、私钥、模型缓存、账号数据与真实凭据。

## 仓库结构

```text
.
├─ openclaw-browser-launch.ps1
├─ openclaw-browser-watch.ps1
├─ openclaw-gateway-child.ps1
├─ openclaw-gateway-run.ps1
├─ start-openclaw-admin.ps1
├─ start-openclaw.bat
├─ start-openclaw.local.example.bat
└─ projects/
   ├─ apps/
   ├─ canvas/
   ├─ control-ui-custom/
   ├─ docs/
   ├─ extensions/
   ├─ hooks-pack/
   ├─ lib/
   ├─ packages/
   ├─ scripts/
   ├─ shared/
   ├─ utils/
   ├─ openclaw.example.json
   ├─ package.json
   └─ pnpm-workspace.yaml
```

## 已做的公开化处理

- 删除 `.git`、`node_modules`、`.runtime`、`.local`、镜像知识库与运行日志
- 删除 `experience-manager` 导出的动态数据和 `qmd`/`memory-lancedb-pro` 的个人镜像内容
- 将网关 token、数据库密码、Feishu 凭据、DeepSeek key 替换为占位符
- 将启动配置改为默认读取 [projects/openclaw.example.json](./projects/openclaw.example.json)

## 本地启动

1. 按需复制 [start-openclaw.local.example.bat](./start-openclaw.local.example.bat) 为 `start-openclaw.local.bat`
2. 在本地文件里设置 `OPENCLAW_GATEWAY_TOKEN`
3. 将 [projects/openclaw.example.json](./projects/openclaw.example.json) 复制为你自己的本地配置，或直接设置 `OPENCLAW_CONFIG_PATH`
4. 进入 [projects/package.json](./projects/package.json) 对应工作区安装依赖
5. 运行 `start-openclaw.bat`

## 说明

- 这个公开版是一个“可阅读、可继续开发”的净化快照，不包含你本机的私有运行态
- `projects/extensions/vscode-key-guard` 包含当前的 Key Guard 面板实现与 Soxio 额度统计适配
- 如果要在此基础上继续公开协作，建议把真实配置继续放在本地未跟踪文件里
