---
id: "exp_1774353000000_experience_visibility_fix"
title: "经验积累中心不显示经验：认证 token 与 API 前缀不一致"
type: "bug_fix"
date: "2026-03-24T11:50:00.000Z"
updated_at: "2026-03-25T05:42:22.000Z"
difficulty: 4
xp_gained: 210
tags: ["OpenClaw", "experience-manager", "authentication", "frontend", "debugging", "api", "visibility"]
source_project: ""
source_file: ""
---
# 经验积累中心不显示经验：认证 token 与 API 前缀不一致

## Summary
经验中心页面实际请求走的是 /api/experience，但旧页面还在使用写死的 gateway token 或错误前缀，导致前端加载阶段拿到 401，看起来像没有经验数据。

## Problem
经验积累中心不显示经验啊，页面好像是空的。

## Solution
1. 把 /experience.html 对应的页面和 control-ui-custom/experience.html 都改成动态读取 openclaw.control.bootstrap.token.v1。
2. 统一 API 前缀为 /api/experience，不再使用旧的 /novel/api。
3. 所有经验请求都带 Authorization: Bearer <bootstrap token>。
4. 搜索/筛选基于 allExpData 重新计算，避免越搜越少。
5. 用实际接口验证 /api/experience/records 和 /api/experience/stats 返回 200 并能看到 records。

## Applied
- 401 鉴权排查
- Bootstrap token 读取
- API 路由统一
- 搜索筛选状态管理
- 实际接口验证

## Gained
- 经验中心空白不一定是“没数据”，首先要排查前端是否带了对的 token。
- 同类页面必须共享同一套 API 前缀与鉴权读取逻辑，不要一个页面写死 token、另一个页面读 bootstrap。
- 搜索/筛选不能基于已经过滤过的数组继续过滤，否则会让数据看起来丢失。
- 最有效的验证方式是：接口返回 200 + 页面真正渲染出 records。

## Verification
-

## Source
- project: 
- branch: 
- file: 
- url: 