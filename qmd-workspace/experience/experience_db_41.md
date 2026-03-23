# 在OpenClaw原生界面添加番茄扫描流水线进度UI

**ID**: db_41
**类型**: feature_dev
**难度**: 4/5
**经验值**: 200
**日期**: 2026-03-20

## 问题描述
用户要求在小说管理主界面集成番茄扫描流水线进度UI，显示发布流程进度条和实时状态。关键是需要修改正确的位置：OpenClaw原生界面是通过 extensions/ 插件机制加载的，而不是 web-ui/ 或 apps/novel-manager/views/。

## 解决方案
1. 定位正确文件：extensions/novel-manager/public/index.html（OpenClaw原生界面通过插件加载）
2. 在番茄扫描子页面添加流水线进度面板：进度条、步骤指示器（初始化→扫描→审核→发布）、任务详情、时间统计
3. 添加流水线相关JavaScript函数：scanFanqieWorks、startPipeline、stopPipeline、subscribePipelineProgress、updatePipelineUI
4. 修改 extensions/novel-manager/index.ts 添加 API：/fanqie/works/:accountId、/fanqie/publish、/fanqie/publish/progress/:id（SSE）
5. 使用 EventSource 实现 SSE 实时进度推送
6. 步骤指示器用不同背景色区分状态：active（当前）、completed（完成）、默认（未开始）

## 应用的经验
- OpenClaw插件架构
- HTML页面结构
- SSE实时通信
- 进度UI设计

## 获得的经验
- OpenClaw原生界面定位：extensions/{plugin}/public/index.html，不是web-ui/或views/
- OpenClaw插件加载机制：通过registerHttpRoute注册路由，public目录提供静态文件
- SSE进度推送：使用EventSource客户端，服务端返回text/event-stream
- 流水线UI设计：进度条+步骤指示器+任务详情+结果列表
- 子页面切换：showSubPage函数控制.display，使用.sub-page和.active类

## 标签
`openclaw` `plugin` `ui` `sse` `pipeline` `progress` `extensions`

---
*从经验管理模块同步*
