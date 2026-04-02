# AI-Tools 作为当前会话 `cwd` 事件复盘

## 1. 事件概述

本次会话中，代理一开始将当前工作目录识别为：

`C:\Users\ASUS-KL\Documents\AI-Tools`

随后围绕该目录展开了多次命令执行与上下文判断。你后续指出，自己平时更关注的主工程环境是 `E:\My Project\Atramenti-Console`，并怀疑这次会话默认落到 `AI-Tools`，可能与此前为 Cline / Roo / 相关代理所做的入口调整有关。

本次复盘的目标不是排查业务代码，而是还原这个 `cwd` 是如何出现的、哪些证据支持当前判断、哪些地方仍然未完全验证，以及后续如何确认和消除影响。

---

## 2. 直接现象

本次会话开头，代理收到了一段宿主注入的环境上下文，内容等价于：

```text
<environment_context>
  <cwd>c:\Users\ASUS-KL\Documents\AI-Tools</cwd>
  <shell>powershell</shell>
  <current_date>2026-04-01</current_date>
  <timezone>Asia/Shanghai</timezone>
</environment_context>
```

这意味着：

1. 代理不是自己猜测当前目录，而是直接收到了宿主提供的 `cwd`
2. 本轮会话开始时，宿主程序认定当前工作目录就是 `AI-Tools`
3. 后续所有未显式指定 `workdir` 的动作，都会自然围绕这个目录展开

这也是为什么在你没有主动再次说明 `Auto` 之前，代理会把 `AI-Tools` 视作默认工作环境。

---

## 3. 已确认的事实证据

### 3.1 这不是代理凭空生成的目录

本轮会话的 `cwd = AI-Tools` 并非推测，而是来自宿主注入的环境上下文。

结论：

- `AI-Tools` 不是模型“记住”的
- 不是模型自行推断出来的
- 是当前这次会话启动时，由宿主程序传入的会话元数据

### 3.2 你的 VS Code / Roo 侧确实存在对 `AI-Tools` 的强关联

在以下文件中发现了对 `AI-Tools` 的直接引用：

[`C:\Users\ASUS-KL\AppData\Roaming\Code\User\settings.json`](C:\Users\ASUS-KL\AppData\Roaming\Code\User\settings.json)

其中 `roo-cline.customInstructions` 包含了对这一路径的引用：

`C:/Users/ASUS-KL/Documents/AI-Tools/docs/GLOBAL_MEMORY.md`

这说明：

1. 你此前给 Roo / Cline 的自定义说明中，已经把 `AI-Tools` 作为一个事实源或规则入口接入
2. `AI-Tools` 至少在你的 VS Code AI 工作流中，不是一个偶然目录，而是一个被显式引用过的目录

### 3.3 代理历史会话表明 `cwd` 本来就是“启动时上下文”，不是固定死值

在 Codex 历史会话记录中，能看到 `session_meta` 内存在不同的 `cwd`。例如某条历史记录显示过：

- `cwd: C:\Users\ASUS-KL\Desktop`
- `originator: Codex Desktop`
- `source: vscode`

这证明：

1. `cwd` 是会话启动元数据的一部分
2. 它会随着不同启动场景改变
3. 它不是某个永久写死在模型里的固定值

也就是说，本次出现 `AI-Tools`，更像是当前启动上下文落在了这个目录，而不是代理配置被永久污染。

### 3.4 当前机器上 OpenClaw 的实际主配置并不在 `AI-Tools`

本机已确认 OpenClaw 的实际配置位置是：

[`C:\Users\ASUS-KL\.openclaw\openclaw.json`](C:\Users\ASUS-KL\.openclaw\openclaw.json)

以及：

[`C:\Users\ASUS-KL\.openclaw\agents\main\agent\models.json`](C:\Users\ASUS-KL\.openclaw\agents\main\agent\models.json)

这说明：

1. OpenClaw 的真实用户配置目录在 `C:\Users\ASUS-KL\.openclaw`
2. 本次 `cwd = AI-Tools` 不等于 OpenClaw 把自己的主配置目录改到了 `AI-Tools`
3. `AI-Tools` 更像是“当前会话工作区”或“你某套代理提示体系关联的工程目录”

### 3.5 `Auto` 本身是一个独立工程根目录，且有自己的规则体系

以下路径已确认存在：

[`E:\My Project\Atramenti-Console\AGENTS.md`](E:\My Project\Atramenti-Console\AGENTS.md)

这说明：

1. `Auto` 是你机器上的一个独立工程根
2. 它有自己的项目规则与结构约束
3. 本次会话没有自动落到 `Auto`，并不代表 `Auto` 不存在，只说明本次宿主没有把它当成当前工作目录传进来

---

## 4. 事件形成的最可能过程

基于当前证据，最可能的前因后果如下：

1. 你此前为 Roo / Cline / VS Code AI 工作流配置过与 `AI-Tools` 强相关的自定义说明
2. 在这些说明中，`AI-Tools` 被当作规则或记忆入口目录使用
3. 本次会话启动时，宿主程序从当前 VS Code 工作区、当前激活目录、或当前发起会话的上下文中，取到了 `AI-Tools`
4. 宿主把该目录作为 `cwd` 注入给代理
5. 代理据此将 `AI-Tools` 视为本轮默认工作环境
6. 直到你后续指出自己更关心的是 `Auto`，这条上下文偏移才被显式暴露出来

换句话说，本次问题不是“代理擅自跳到了错误目录”，而更像是：

“启动当前会话的宿主环境，本身就把 `AI-Tools` 当成了当前工作目录。”

---

## 5. 当前最可信的判断

### 5.1 高可信判断

以下判断目前可信度较高：

1. `AI-Tools` 是宿主传入的本轮 `cwd`
2. 这个 `cwd` 不是永久写死在模型中的
3. `AI-Tools` 与你此前的 Roo / Cline 自定义指令存在真实关联
4. OpenClaw 的主配置目录并没有迁移到 `AI-Tools`
5. 本次问题更像“当前启动工作区上下文”问题，而不是“模型配置被污染”

### 5.2 仍未完全验证的点

以下事项当前仍属于“高概率推测”，尚未形成最终铁证：

1. 究竟是 VS Code 当前打开的工作区直接决定了 `cwd`
2. 还是某个扩展在启动会话时，把默认目录显式设置成了 `AI-Tools`
3. 还是某个桥接脚本 / 启动脚本在更上层固定了当前目录

目前没有找到一条明确配置项类似：

- `defaultCwd = C:\Users\ASUS-KL\Documents\AI-Tools`
- `workdir = AI-Tools`
- `workspaceRoot = AI-Tools`

因此暂时不能武断说“就是某个扩展永久写死了入口”。

---

## 6. 为什么重启 VS Code 可能会变，也可能不会变

这是本次事件里最容易误判的点。

### 6.1 为什么“可能会变”

如果你重启 VS Code 后：

1. 不再打开 `AI-Tools`
2. 只打开 `E:\My Project\Atramenti-Console`
3. 再从 `Auto` 对应窗口内发起新的会话

那么新的宿主很可能会把 `cwd` 传成 `Auto`，而不是 `AI-Tools`。

### 6.2 为什么“也可能不会变”

如果你重启后：

1. 还是从当前包含 `AI-Tools` 的窗口里继续发起会话
2. 或者宿主恢复的仍是旧工作区状态
3. 或者某个扩展内部继续沿用上次会话上下文

那新的会话依然可能继续带出 `AI-Tools`。

因此，单纯“重启 VS Code”不一定消除这个现象，关键在于：

**下次会话到底是从哪个工作区 / 哪个窗口 / 哪个扩展上下文里发起的。**

---

## 7. 本次排查中已经排除的误区

### 7.1 不是 OpenClaw 主配置目录跑偏

OpenClaw 真实配置在：

- `C:\Users\ASUS-KL\.openclaw\openclaw.json`
- `C:\Users\ASUS-KL\.openclaw\agents\main\agent\models.json`

所以这不是 OpenClaw 把主运行态迁移到了 `AI-Tools`。

### 7.2 不是模型“记忆错乱”

因为 `cwd` 是由宿主直接注入的环境上下文，所以不是模型自己把某个旧目录硬记成了当前目录。

### 7.3 不是 `Auto` 不存在或无效

`Auto` 本身是一个结构完整的工程根目录，并且存在自己的 `AGENTS.md`。

因此问题不是 `Auto` 工程失效，而只是这轮会话没有从 `Auto` 作为当前工作区启动。

---

## 8. 后续建议

### 8.1 最直接的验证方法

建议按以下顺序做一次最小验证：

1. 完全关闭 VS Code
2. 只打开 `E:\My Project\Atramenti-Console`
3. 不打开 `AI-Tools`
4. 在这个窗口内重新发起新会话
5. 观察新会话开头收到的 `cwd` 是否变成 `E:\My Project\Atramenti-Console`

如果变了，基本可以证明：

本次问题主要是“当前工作区上下文决定的”。

### 8.2 如果仍然不变

如果你只打开 `Auto` 后，新会话仍然继续显示 `AI-Tools`，那就说明：

1. 有某个扩展或桥接程序在更上层保存了默认目录
2. 下一步就要重点查：
   - VS Code 扩展全局存储
   - 启动脚本
   - 桥接代理
   - 会话恢复逻辑

### 8.3 工程侧建议

如果你长期希望代理工作在 `Auto`，建议逐步统一：

1. 将 AI 规则的“总入口目录”从 `AI-Tools` 迁到 `Auto`
2. 把当前分散在 VS Code / Roo / Cline 中对 `AI-Tools` 的强引用逐步收口
3. 以后从 `Auto` 的窗口发起会话，而不是在混合窗口中复用旧上下文

---

## 9. 最终结论

本次“代理默认把 `AI-Tools` 当成当前工作目录”的根因，当前最可信的解释是：

**本轮会话启动时，宿主程序将 `C:\Users\ASUS-KL\Documents\AI-Tools` 作为 `cwd` 注入给了代理，而这一现象又与此前你在 VS Code / Roo / Cline 工作流中对 `AI-Tools` 的显式引用存在关联。**

更直白地说：

- 不是 OpenClaw 主配置被改坏了
- 不是模型自己乱记目录
- 更像是当前会话启动时的工作区上下文落在了 `AI-Tools`

因此，这件事的正确处理方式不是优先怀疑模型，而是优先检查：

1. 你是从哪个 VS Code 窗口发起会话的
2. 当前窗口绑定的是哪个工程目录
3. 是否有旧的 Roo / Cline / 自定义说明仍把 `AI-Tools` 作为规则入口

---

## 10. 本文档用途

本文档用于记录一次“会话 `cwd` 与用户预期主工程不一致”的定位过程，方便后续在 `Auto` 工程中继续做统一入口治理、工作区规范化和 AI 规则收口时作为事实依据。
