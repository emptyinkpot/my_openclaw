# 前端流水线执行日志实时显示

**ID**: db_3
**类型**: feature_dev
**难度**: 2/5
**经验值**: 100
**日期**: 2026-03-20

## 问题描述
前端添加执行日志输出区域，实时显示流水线每一步的日志。通过 SSE 接收进度事件，解析后写入日志区域并自动滚动到底部。

## 解决方案
1. 添加 #pipelineLog 日志区域：textarea 或 div，设置 pre-wrap 样式
2. SSE onmessage 回调中解析 JSON 数据
3. 使用 textContent += 追加日志，避免 innerHTML 导致的闪烁
4. 自动滚动：logEl.scrollTop = logEl.scrollHeight
5. 时间戳格式化：new Date().toLocaleTimeString()

## 应用的经验
- SSE 客户端
- DOM 操作
- 实时更新

## 获得的经验
- SSE 消息格式：data: {JSON}\n\n
- textContent 比 innerHTML 性能更好，不会重新解析整个 HTML
- 自动滚动到底部让用户看到最新日志
- 日志区域使用 pre-wrap 样式保留换行和空格
- 清空日志直接设置 textContent = "" 

## 标签
`frontend` `sse` `log` `realtime` `ui`

---
*从经验管理模块同步*
