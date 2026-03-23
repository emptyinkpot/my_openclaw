# 恢复原本流水线流程，添加 SSE 实时进度支持

**ID**: db_64
**类型**: bug_fix
**难度**: 4/5
**经验值**: 200
**日期**: 2026-03-21

## 问题描述
用户反馈修改后流水线流程变了，需要恢复原本能自动找到应该发布章节的版本，同时添加 SSE 实时进度推送

## 解决方案
## 修复内容

### 1. 恢复原本的完美流程
- 从 git 历史中恢复 ContentPipeline.ts（commit 8ec5bd79）
- 流程：自动从番茄获取最新章节号 → 从数据库找到下一章 → 只发布下一章（不是遍历所有）

### 2. 添加 SSE 实时进度支持
- ContentPipeline.ts: 
  - 修改 emitProgress() 返回 PipelineProgressEvent
  - 在 publishToFanqie() 和 run() 中调用 onProgress 回调
- NovelService.ts:
  - 在 startPipeline() 中生成 progressId
  - 设置 onProgress 回调并调用 broadcastProgress(progressId, event)
  - 后台异步执行，立即返回响应
- index.ts:
  - 注册 SSE 路由 /novel/sse/progress/:progressId
  - handleSse() 处理连接，设置响应头
  - 立即发送连接确认消息
  - 心跳保活（15秒）
- ProgressManager.ts:
  - 管理活跃客户端
  - 缓存最新进度
  - 广播给所有连接的客户端
- 前端 index.html:
  - 点击按钮启动流水线
  - 获取 progressId 后连接 EventSource
  - 实时显示进度（步骤、任务、百分比）
  - 完成/失败时自动更新状态

### 3. 修复前端问题
- 修复 'pipelineRunning' 重复声明错误
- 移除 SSE URL 中 token 的 encodeURIComponent
- 添加详细日志，用 ====== 标记关键节点

### 关键修复点
- ContentPipeline.emitProgress() 必须返回事件对象
- NovelService.startPipeline() 必须设置 onProgress 回调并调用 broadcastProgress
- handleSse() 不能是 async function
- 前端 EventSource 默认会自动重连，无需手动处理

## 应用的经验
无

## 获得的经验
- 从 git 历史恢复代码（git restore/git show）
- 先最小改动，保持核心逻辑不变
- emitProgress 返回事件对象供外部使用
- onProgress 回调 + broadcastProgress 实现 SSE
- 前端 EventSource 用法

## 标签
`OpenClaw` `流水线` `SSE` `前端` `后端` `git`

---
*从经验管理模块同步*
