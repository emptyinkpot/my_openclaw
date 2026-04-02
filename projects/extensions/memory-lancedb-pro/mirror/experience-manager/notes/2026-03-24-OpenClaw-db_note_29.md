---
id: "db_note_29"
title: "OpenClaw 调试专题：启动器、登录态与运行态收口"
category: "dev"
created_at: "2026-03-24T08:09:23.000Z"
updated_at: "2026-03-25T05:42:30.000Z"
tags: ["OpenClaw", "调试专题", "Gateway", "Control UI", "登录态", "Ollama", "经验沉淀"]
related_experience_ids: []
---
# OpenClaw 调试专题：启动器、登录态与运行态收口

## Summary
OpenClaw 调试专题：启动器、登录态与运行态收口

## Content
# OpenClaw 调试专题：启动器、登录态与运行态收口

这次连续调试的核心不是单一 bug，而是三个相互关联的问题：

1. Windows 本地 OpenClaw 启动不稳定，网关会复用失败、旧服务态会干扰新进程。
2. Control UI 能进入主页，但登录态会在跳转链路中丢失，出现 `gateway token mismatch`。
3. 用户目录和仓库目录同时存放运行态与模型数据，容易出现“两个 OpenClaw”“两个 Ollama”的错觉。

---

## 一、启动稳定化

### 现象
- 桌面快捷方式有时打开的是默认浏览器页，或者卡在登录页。
- `openclaw gateway status` 和真正可用的网关状态不一致。
- 旧的计划任务、残留进程或过时的兼容入口会制造假象。

### 解决方式
- 启动器先做健康检查，再决定是复用现有网关还是重新拉起。
- 健康判据以 RPC probe 为准，而不是只看 5000 端口是否监听。
- 真正的冷启动路径是：清理旧状态 -> 启动前台 gateway -> 等待健康 -> 打开 UI。

### 经验结论
- 网关“能连上”不等于“状态正确”。
- 对 Windows 启动问题，最优先排查的是旧进程、计划任务、端口和 token 是否一致。

---

## 二、登录态修复

### 现象
- 页面标题是对的，路径也到了 `control-ui-custom`，但仍然停在登录页。
- 前端报 `unauthorized: gateway token mismatch`。

### 解决方式
- 启动器把 token 放进 URL hash，而不是 query。
- `launch.html` 先把 token 写入 `localStorage`、`sessionStorage`、`window.name` 和设置项，再跳转到 `index.html`。
- `index.html` 在 bundle 加载前再做一次 bootstrap，作为二次兜底。
- 如果前端读取 key 失败，则用本地 bootstrap token 回退。

### 经验结论
- 多段前端路由里，query 参数最容易丢。
- 登录态要同时照顾 URL、localStorage、sessionStorage、window.name 四个面。
- 只改一个入口页通常不够，真正稳定要在跳转前后都做预热。

---

## 三、运行态收口

### 现象
- 用户目录下有 `.openclaw` 和 `.ollama`，仓库里也有一份运行态。
- 配置、模型和工作区分散，排查时很难确认“到底读的是哪一份”。

### 解决方式
- 将实际运行态统一到 `E:\Auto\.local`。
- 用户目录保留 junction 兼容旧路径，但不再作为唯一真相。
- `openclaw.json` 明确指定 workspace、control UI 根目录、插件路径和 Ollama 地址。

### 经验结论
- 运行态和源码仓库要分开，但配置入口必须统一。
- 路径收口以后，UI、插件、模型、工作区的责任边界会清晰很多。

---

## 四、当前实现链路

现在这套功能是这样串起来的：

- [E:\Auto\start-openclaw.bat](E:\Auto\start-openclaw.bat) 负责入口。
- [E:\Auto\openclaw-gateway-run.ps1](E:\Auto\openclaw-gateway-run.ps1) 负责健康检查、冷启动、复用网关和打开浏览器。
- [E:\Auto\projects\control-ui-custom\launch.html](E:\Auto\projects\control-ui-custom\launch.html) 负责把 token 预热到浏览器存储里。
- [E:\Auto\projects\control-ui-custom\index.html](E:\Auto\projects\control-ui-custom\index.html) 负责二次 bootstrap 和导航栏加载。
- [E:\Auto\.local\openclaw\openclaw.json](E:\Auto\.local\openclaw\openclaw.json) 负责网关端口、token、control UI 根目录、插件加载路径和 Ollama 模型配置。
- [E:\Auto\projects\extensions\plugins\experience-manager\data\experiences.json](E:\Auto\projects\extensions\plugins\experience-manager\data\experiences.json) 保存经验记录。
- [E:\Auto\projects\data\memory-lancedb\experience-sync.jsonl](E:\Auto\projects\data\memory-lancedb\experience-sync.jsonl) 保存同步到 memory 层的经验文本。

### 经验模块写入方式
- 新经验会先写入 `experiences.json`。
- 写入后会异步同步到 memory 队列文件。
- 这样 UI 可以直接展示，检索层也能复用。

---

## 五、这次最值得保留的调试原则

- 先确认“网关是否真的健康”，再判断 UI 问题。
- token 问题要同时看 URL、浏览器存储和前端跳转链。
- 运行态收口比到处修补路径更重要。
- 经验记录要写成结构化条目，不要只留零散聊天结论。

## Sections
-