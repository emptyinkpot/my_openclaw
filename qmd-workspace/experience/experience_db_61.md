# OpenClaw control-ui框架集成

**ID**: db_61
**类型**: optimization
**难度**: 3/5
**经验值**: 150
**日期**: 2026-03-20

## 问题描述
修改路由配置，让所有页面都嵌入到OpenClaw原生的control-ui框架中

## 解决方案
1. 分析发现/usr/lib/node_modules/openclaw/dist/control-ui/目录已有完整框架；2. 修改novel-manager插件的getPageHtml函数；3. 建立页面映射：/→index.html, /novel/→novel-home.html等；4. 添加降级机制，control-ui读取失败时使用插件页面；5. 重启服务使配置生效

## 应用的经验
- 路由配置
- 框架集成
- 降级策略

## 获得的经验
- OpenClaw插件架构
- control-ui框架使用
- 路由映射设计
- 降级机制实现

## 标签
`OpenClaw` `control-ui` `路由配置` `框架集成` `降级策略`

---
*从经验管理模块同步*
