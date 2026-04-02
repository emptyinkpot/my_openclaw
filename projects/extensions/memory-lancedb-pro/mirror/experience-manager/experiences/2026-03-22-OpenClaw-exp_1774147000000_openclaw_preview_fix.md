---
id: "exp_1774147000000_openclaw_preview_fix"
title: "OpenClaw 预览服务一直\"预览准备中\"问题排查与修复"
type: "problem_solving"
date: "2026-03-22T02:36:40.000Z"
updated_at: "2026-03-25T05:42:23.000Z"
difficulty: 3
xp_gained: 150
tags: ["OpenClaw", "预览服务", "目录结构", "插件加载", "配置验证", "问题排查"]
source_project: ""
source_file: ""
---
# OpenClaw 预览服务一直"预览准备中"问题排查与修复

## Summary
用户反馈 OpenClaw 预览服务一直显示"预览准备中"，无法正常使用。通过深入调查，发现问题是由于新创建的 database 目录被 OpenClaw 误认为是插件目录导致的。

## Problem
预览准备中 ... 怎么一直是这样

## Solution
## 问题排查过程

### 1. 初步状态检查
- 运行 `openclaw --version` 确认版本
- 运行 `openclaw status --all` 发现配置验证失败
- 错误信息：`plugin manifest not found: /workspace/projects/extensions/database/openclaw.plugin.json`

### 2. 问题原因定位
- 新创建的 `extensions/database/` 目录被 OpenClaw 误认为是插件目录
- OpenClaw 会扫描 `extensions/` 下的所有目录作为插件候选
- 非插件代码应该放在 `extensions/core/` 或其他子目录下

### 3. 解决方案
- 将 `extensions/database/` 移动到 `extensions/core/database/`
- 更新所有相关文件的引用路径
- 修复兼容层的引用
- 验证配置并重启服务

### 4. 关键文件更新清单
- `extensions/core/audit/repository.ts`
- `extensions/core/content-craft/src/generation-pipeline.ts`
- `extensions/core/content-pipeline/AuditService.ts`
- `extensions/core/content-pipeline/ChapterRepository.ts`
- `extensions/core/content-pipeline/ContentPipeline.ts`
- `extensions/core/publishing/ChapterRepository.ts`
- `extensions/core/storage/database.ts` (兼容层)
- `extensions/core/database/manager.ts`
- `extensions/plugins/novel-manager/index.ts`
- `extensions/plugins/novel-manager/services/novel-service.ts`

### 5. 验证步骤
```bash
# 1. 验证配置
openclaw config validate

# 2. 重启服务
./scripts/restart.sh

# 3. 探测 Gateway
openclaw gateway probe
```

## Applied
- OpenClaw 配置排查
- 目录结构设计
- 相对路径引用管理

## Gained
- OpenClaw 会扫描 extensions/ 下的所有目录作为插件候选
- 非插件代码应该放在 extensions/core/ 或其他子目录下，避免被当成插件
- 目录结构变更后一定要检查所有相对路径引用
- 兼容层设计可以保证平滑迁移
- openclaw config validate 是快速验证配置的好工具
- openclaw gateway probe 可以检查 Gateway 连通性

## Verification
-

## Source
- project: 
- branch: 
- file: 
- url: 