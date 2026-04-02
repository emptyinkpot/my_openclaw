# VS Code Key Guard

`vscode-key-guard` 的目标不是“再找一个地方改 key”，而是先把 Codex 与 Roo 在 VS Code 本机上的真实配置源看清楚，再在此基础上做诊断、切换、审计与恢复。

这份 README 现在对应的是 2026-03-31 修正后的真实状态：

- 先认清“当前活动真源”。
- Codex 仍然是文件真源。
- Roo 不能再按 `.roo/.env.local` 的旧假设处理。
- Windows 上的 Roo Secret bridge 已接通，项目现在可以真实读取活动 Roo key，并在受控备份后改写它。

## 1. 修正后的真源模型

| 对象 | 角色 | 当前结论 |
| --- | --- | --- |
| `C:\Users\ASUS-KL\.codex\auth.json` | Codex 密钥真源 | 真实可读写 |
| `C:\Users\ASUS-KL\.codex\config.toml` | Codex provider / base URL / model 真源 | 真实可读写 |
| `state.vscdb` 中 `ItemTable.key = "RooVeterinaryInc.roo-cline"` | Roo 活动 profile 选择器与非密钥元数据 | 真实活动元数据源 |
| `state.vscdb` 中 Roo SecretStorage 行 | Roo 活动 key 与 profile secret blob | 真实密钥源，当前已可通过桥接读写 |
| `rooveterinaryinc.roo-cline\\tasks\\_index.json` | Roo 运行态证据 | 用于判断活动 profile 与任务恢复是否漂移 |
| `C:\Users\ASUS-KL\.roo\.env.local` | Roo 候选文件 / 历史输入 | 只能降级为 candidate-only，不再视为活动真源 |

Roo 的关键变化是：

1. 活动 selector 不在 `.roo/.env.local`。
2. 活动 secret 不在普通文本文件里。
3. 只改 `.env.local` 无法保证 Roo 当前会话真正切到新 key。

## 2. 这台机器上的已验证事实

截至 2026-03-31，仓库已经按真实环境修正到了下面这组事实：

- `C:\Users\ASUS-KL\AppData\Roaming\Code\User\globalStorage\state.vscdb` 中存在 Roo 全局状态行 `RooVeterinaryInc.roo-cline`。
- 同一个 `state.vscdb` 中存在 Roo SecretStorage 行：
  - `secret://{"extensionId":"rooveterinaryinc.roo-cline","key":"openAiApiKey"}`
  - `secret://{"extensionId":"rooveterinaryinc.roo-cline","key":"roo_cline_config_api_config"}`
- `C:\Users\ASUS-KL\AppData\Roaming\Code\Local State` 中存在 `os_crypt.encrypted_key`，当前 Windows 用户上下文可以解开它。
- Roo active key 现已可从加密 SecretStorage 解密读出。
- `C:\Users\ASUS-KL\AppData\Roaming\Code\User\globalStorage\rooveterinaryinc.roo-cline\tasks\_index.json` 仍可能保留旧的 `apiConfigName`，这是当前剩余漂移来源。

## 3. 当前已经做对的能力

仓库中的诊断主链已经对齐到新的模型：

- `backend/services/vscode-state-service.ts`
  - 读取 Roo 的 `state.vscdb` 普通状态行
  - 探测并解密 Roo SecretStorage 行
  - 读取 `tasks/_index.json` 作为运行态证据
- `backend/services/vscode-roo-secret-bridge-service.ts`
  - 从 `Local State` 读取主密钥信息
  - 用 Windows DPAPI 解开 VS Code 主密钥
  - 对 Roo 的 `v10` SecretStorage payload 做 AES-GCM 解密/加密
- `backend/services/diagnosis-service.ts`
  - 当 Secret bridge 可用时，不再把 Roo 归类为 `manual_action_required`
  - 当前会把 task index 与 active profile 的不一致归类为 `auto_fixable`
- `backend/services/provider-status-service.ts`
  - Roo 当前状态改为基于 `state.vscdb`、SecretStorage 与 `tasks/_index.json` 生成

## 4. 当前真实可用的能力

### 4.1 Codex

- 可以真实读取活动 key 指纹
- 可以真实读取 `baseUrl` / `model` / `provider`
- 可以真实切换到 registry 中保存的目标 key
- 可以对 `auth.json` / `config.toml` 做备份后写入

### 4.2 Roo

- 可以读取活动 profile 选择器与非密钥元数据
- 可以直接解密并读取当前活动 key
- 可以将活动 Roo key 与 registry entry 做真实匹配
- 可以在备份 `state.vscdb`、task index 与原始 secret blobs 后真实改写当前活动 Roo key
- 可以在 Roo 切换时同步对齐当前工作区 task index

当前的剩余限制不再是“能否读写 SecretStorage”，而是“当前 task index 是否仍与活动 profile 漂移”。任何基于 `.roo/.env.local` 的“Roo 已切换成功”仍应被视为伪成功。

## 5. 当前执行规则

### 第零步：纠正 Roo 真源模型

这一步已经完成，也是本仓库这次修正的核心。

- 不再把 `.roo/.env.local` 当作 Roo 当前活动真源。
- 不再把“能改候选文件”等同于“能改当前活动 key”。
- 不再把 Roo 的问题归结成单一文本文件写入问题。

### 第一步：保持快照与诊断为第一优先级

当前必须先保证：

- 快照能看见真实的 Codex 真源
- 快照能看见 Roo 的活动 selector
- 快照能看见 Roo SecretStorage 是否可解密
- 快照能看见 Roo task index 是否漂移

### 第二步：实现 Roo Secret bridge

这一步在当前 Windows 机器上已经完成。

桥接链路是：

1. 从 `Local State` 读取 `os_crypt.encrypted_key`
2. 用当前用户的 Windows DPAPI 解开 VS Code 主密钥
3. 对 `state.vscdb` 里的 `v10` SecretStorage payload 做 AES-GCM 解密/加密
4. 将变更写回 Roo 的两个 secret rows

桥接范围：

- `openAiApiKey`
- `roo_cline_config_api_config`

### 第三步：在 Secret bridge 之上补 Roo 真正的读写

当前已经成立的能力：

- 读取 Roo 当前活动 key 指纹
- 将 Roo 当前活动 key 与 registry entry 精确匹配
- 按目标 entry 改写 Roo 当前活动 key
- 在必要时同步 profile/base URL/model
- 在写入后对齐当前工作区 task index

## 6. 当前项目计划

### Phase 0: Source-of-truth correction

已完成：

- Roo 真源从 `.env.local` 修正为 `state.vscdb + SecretStorage + task index`
- Roo 诊断逻辑切换到真实快照模型
- Repair playbook 从“继续错写 `.env.local`”改为“先看真实活动源”

### Phase 1: Read-only truth inspection

已完成：

- `GET /api/key-guard/snapshots`
- `GET /api/key-guard/diagnosis`
- `GET /api/key-guard/repair`
- `GET /api/key-guard/providers`

### Phase 2: Registry and usage

已进入真实可用状态：

- registry 可以管理已保存 key
- Codex 可与 registry 做真实切换
- Roo active key 已可真实读取并拉取 usage

### Phase 3: Roo Secret bridge

当前状态：Windows 上已打通。

- 已能读取 Roo 加密 secret
- 已能写回 Roo 加密 secret
- 已能备份 blob 与状态文件
- 已把 Roo 从“只可诊断”推进到“可真实切换”

### Phase 4: Drift auto-fix polish

当前待补：

- 将 task index 漂移修复独立成明确 repair action
- 在 UI 中把“active secret 正常、task index 漂移”单独显示

## 7. API 现状

当前 API 的解释应按下面理解：

- `GET /api/key-guard/snapshots`
  - 返回快照集合
- `GET /api/key-guard/diagnosis`
  - 返回当前诊断结果
- `GET /api/key-guard/repair`
  - 返回修正后的执行计划
- `GET /api/key-guard/providers`
  - 返回 Codex / Roo 当前 provider 状态
- `GET /api/key-guard/usage`
  - Codex 与 registry key 可正常走 usage
  - Roo 活动 key 现在可以通过本机 Secret bridge 做真实读取
- `POST /api/key-guard/switch`
  - Codex 可执行
  - Roo 现在可执行真实切换，并会同步写回 `state.vscdb`

## 8. 安全边界

下面这些规则现在是强约束，不是建议：

- 不在日志、页面、缓存或返回体中输出明文 key
- 每次写入前先做备份
- 对 `state.vscdb` 的任何写入都必须经过受控桥接，而不是直接文本替换
- `.roo/.env.local` 只能作为候选输入或历史参考，不能再当 Roo 活动真源
- 任何 Roo 切换都必须先备份 `state.vscdb`、task index 和原始 secret blobs

## 9. 建议的 Roo 备份集合

在进行 Roo 切换前，至少应准备这些备份：

- `state.vscdb`
- `rooveterinaryinc.roo-cline\\tasks\\_index.json`
- `rooveterinaryinc.roo-cline` 目录中的相关状态文件
- 原始 Roo SecretStorage blobs

## 10. 相关文档

- 配置位置总表：[`knowledge/config-locations.md`](./knowledge/config-locations.md)
- 架构说明：[`docs/architecture.md`](./docs/architecture.md)
- 诊断规则：[`docs/diagnosis-rules.md`](./docs/diagnosis-rules.md)
- 已知问题：[`knowledge/known-issues.md`](./knowledge/known-issues.md)

一句话总结这次修正：

> Codex 仍然是“文件可直写”的系统；Roo 则是“活动 selector 在 `state.vscdb`、活动 secret 在加密 SecretStorage、运行态证据在 task index”的系统。现在 Windows 本机桥接已经打通，所以项目既能真实读取 Roo key，也能在受控备份后改写 Roo key。
