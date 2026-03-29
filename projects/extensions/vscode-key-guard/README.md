# VS Code Key Guard

用于监视本机 VS Code 中 Codex 与 Roo Code 的 API Key 配置状态，并对配置漂移、失效、错配、回滚、残留缓存等问题进行自动化处理。

## 模块定位

参考平行模块的目录组织方式，这个模块建议作为一个独立扩展单元接入 `projects/extensions`，后续可以继续补齐 `module.json`、前后端页面、脚本、状态目录与知识文档。

本阶段先完成规划，目标是明确：

- 监视哪些配置源
- 如何判断配置异常
- 如何自动修复或引导修复
- 如何记录状态、事件、审计日志
- 如何与 OpenClaw 现有模块体系对齐

## 核心目标

1. 统一读取 Codex 与 Roo Code 的配置源。
2. 检测 API Key、Base URL、模型、当前活动配置名是否发生漂移。
3. 识别 VS Code 扩展运行时与磁盘配置不一致的问题。
4. 对可自动修复的问题执行受控修复。
5. 将每次检测、变更、修复都写入审计日志与状态快照。
6. 提供后续可扩展的 UI、API、脚本和 MCP 接口基础。

## 监控对象

### Codex 侧

建议优先纳入以下配置源：

- `C:/Users/ASUS-KL/.codex/config.toml`
- `C:/Users/ASUS-KL/.codex/auth.json`
- VS Code 用户配置中与 Codex 扩展相关的设置
- Codex 运行时可能使用的环境变量

### Roo Code 侧

建议优先纳入以下配置源：

- `C:/Users/ASUS-KL/.roo/.env.local`
- VS Code `globalStorage` 中 Roo 的配置状态
- Roo 的任务历史、当前活动配置名、provider 绑定信息
- Roo 扩展运行时实际加载到的 key/base/model 组合

### VS Code 侧公共状态

- `AppData/Roaming/Code/User/globalStorage`
- 相关扩展日志
- 扩展宿主重启前后的状态差异
- 自动恢复任务带来的旧配置污染

## 关键问题模型

这个模块重点处理以下类型的问题：

1. 磁盘配置已更新，但扩展宿主仍持有旧 key。
2. 当前活动配置名被回滚到旧配置。
3. 任务历史或缓存残留导致重新使用旧 provider。
4. Base URL、模型名、Key 三者组合不一致。
5. 用户手工改动多个配置源后出现分叉。
6. 某个配置文件损坏、缺失或字段不完整。

## 实现思路

## 1. 配置采集层

职责：从多个来源采集结构化配置快照。

建议实现内容：

- Codex 配置读取器
- Roo 配置读取器
- VS Code global storage 读取器
- 扩展日志解析器
- 环境变量采样器

输出统一格式示例：

```json
{
  "source": "roo-env-local",
  "provider": "roo",
  "keyFingerprint": "cr_7592...",
  "baseUrl": "https://apikey.soxio.me/openai/v1",
  "model": "gpt-5",
  "configName": "env_global",
  "updatedAt": "2026-03-29T12:00:00Z"
}
```

## 2. 对比诊断层

职责：将多个来源的快照合并，输出诊断结果。

建议规则：

- 同一 provider 的主配置源与运行时源必须一致
- `configName` 必须落在允许列表中
- key 指纹变化必须伴随日志记录
- base URL 必须符合 provider 预期路径
- 恢复任务若引用旧配置，应标记为高风险

诊断结果分类：

- `healthy`
- `drift_detected`
- `stale_runtime`
- `invalid_config`
- `auto_fixable`
- `manual_action_required`

## 3. 自动修复层

职责：在满足安全条件时执行自动化处理。

建议支持的动作：

- 重写 Roo 当前活动配置名
- 同步 Codex 或 Roo 的标准配置模板
- 清理可安全清理的缓存索引或状态映射
- 触发扩展宿主重启提示或自动化脚本
- 将异常任务标记为不可自动恢复

安全约束：

- 默认只改白名单文件
- 先备份，再写入
- 每一步都有审计日志
- 敏感值只记录指纹，不记录明文
- 高风险修复必须进入人工确认态

## 4. 事件与审计层

职责：沉淀所有检测和修复过程。

建议落盘内容：

- 最新状态快照
- 历史事件流
- 修复执行记录
- 对比前后差异摘要
- 告警与人工处理建议

## 5. 服务接入层

后续可扩展为：

- 后端 API：提供状态查询、诊断、修复触发
- 前端页面：展示当前配置健康度和最近修复记录
- MCP 工具：允许外部智能体查询状态或触发安全修复
- 定时任务：周期巡检与异常告警

## 建议目录结构

```text
projects/
`-- extensions/
    `-- vscode-key-guard/
        |-- README.md
        |-- module.json
        |-- package.json
        |-- tsconfig.json
        |-- index.ts
        |-- backend/
        |   |-- app.ts
        |   |-- routes/
        |   |   |-- diagnosis.ts
        |   |   |-- repair.ts
        |   |   `-- snapshots.ts
        |   |-- services/
        |   |   |-- codex-config-service.ts
        |   |   |-- roo-config-service.ts
        |   |   |-- vscode-state-service.ts
        |   |   |-- diagnosis-service.ts
        |   |   |-- repair-service.ts
        |   |   `-- audit-service.ts
        |   `-- jobs/
        |       `-- periodic-scan.ts
        |-- core/
        |   |-- types/
        |   |   |-- config-snapshot.ts
        |   |   |-- diagnosis.ts
        |   |   `-- repair-action.ts
        |   |-- rules/
        |   |   |-- codex-rules.ts
        |   |   |-- roo-rules.ts
        |   |   `-- shared-rules.ts
        |   `-- utils/
        |       |-- fingerprint.ts
        |       |-- file-backup.ts
        |       |-- redact.ts
        |       `-- time.ts
        |-- frontend/
        |   |-- pages/
        |   |   `-- vscode-key-guard/
        |   |       |-- index.html
        |   |       |-- app.ts
        |   |       |-- style.css
        |   |       `-- components/
        |   |           |-- status-card.ts
        |   |           |-- source-list.ts
        |   |           |-- drift-table.ts
        |   |           `-- repair-panel.ts
        |   `-- shared/
        |       `-- api.ts
        |-- contracts/
        |   |-- api.ts
        |   `-- events.ts
        |-- docs/
        |   |-- architecture.md
        |   |-- diagnosis-rules.md
        |   `-- repair-playbooks.md
        |-- scripts/
        |   |-- export-snapshot.ps1
        |   |-- restart-vscode-host.ps1
        |   `-- safe-repair.ps1
        |-- knowledge/
        |   |-- known-issues.md
        |   |-- config-locations.md
        |   `-- incident-log.md
        |-- mcp/
        |   `-- vscode-key-guard-mcp.mjs
        |-- state/
        |   |-- latest.json
        |   |-- history/
        |   `-- locks/
        |-- logs/
        |   `-- .gitkeep
        |-- cache/
        |   `-- .gitkeep
        `-- temp/
            `-- .gitkeep
```

## 建议的模块元数据草案

后续可以补一个 `module.json`，大致可参考：

```json
{
  "id": "vscode-key-guard",
  "displayName": "密钥守护",
  "version": "1.0.0",
  "owner": "auto",
  "routePrefix": "/key-guard",
  "apiPrefix": "/api/key-guard",
  "nav": [
    {
      "path": "/key-guard",
      "label": "密钥守护"
    }
  ],
  "pages": [
    {
      "id": "key-guard-home",
      "path": "/key-guard",
      "source": "frontend/pages/vscode-key-guard/index.html"
    }
  ],
  "capabilities": [
    "codex-config-watch",
    "roo-config-watch",
    "drift-detection",
    "auto-repair",
    "audit-log"
  ],
  "mcp": [
    "vscode-key-guard"
  ],
  "dependencies": [],
  "runtimeDirs": [
    "cache",
    "logs",
    "temp",
    "state"
  ],
  "featureFlags": [
    "dangerous-repair-guard"
  ]
}
```

## 推荐实施阶段

### Phase 1

只做只读监控：

- 采集 Codex 与 Roo 配置
- 输出统一快照
- 检测漂移
- 生成日志和诊断结论

### Phase 2

加入受控修复：

- 备份后改写关键配置
- 修复 Roo 活动配置名
- 处理已知缓存状态
- 触发宿主重启流程

### Phase 3

加入完整接入：

- 前端页面
- 后端 API
- MCP 工具
- 周期巡检与告警

## 风险与边界

- 不能直接把敏感明文写入日志或前端页面。
- 不应默认清空所有任务历史，避免破坏用户上下文。
- 对 VS Code 全局状态数据库的改写要谨慎，必须先备份。
- 自动修复动作必须具备幂等性和回滚路径。
- 对 Codex 与 Roo 的配置格式差异要做适配，不能混用字段语义。

## 下一步建议

1. 先补 `module.json` 与基础空目录。
2. 再实现只读扫描器与统一快照类型。
3. 最后增加修复动作与审计 API。
