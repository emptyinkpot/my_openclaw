# 项目架构分析：耦合度与模块化评估

## 📊 总体评估

| 指标 | 评分 | 说明 |
|------|------|------|
| **模块化程度** | ⭐⭐⭐⭐ (4/5) | 核心逻辑模块化良好，但存在部分大文件 |
| **耦合度** | ⭐⭐⭐ (3/5) | 中等耦合，部分模块依赖过深 |
| **可维护性** | ⭐⭐⭐⭐ (4/5) | 类型定义完善，但部分文件过长 |

---

## 🏗️ 核心调度架构

### 调度流程图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        用户界面层 (page.tsx)                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │ 输入文本    │    │ 配置面板    │    │ 资源管理器  │             │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘             │
│         │                  │                  │                     │
│         └──────────────────┼──────────────────┘                     │
│                            ↓                                        │
│              ┌─────────────────────────────┐                        │
│              │   useStreamRequest Hook     │ ◄── SSE流式请求       │
│              │   /api/historical-narrative │                        │
│              └─────────────┬───────────────┘                        │
└────────────────────────────┼────────────────────────────────────────┘
                             ↓
┌────────────────────────────────────────────────────────────────────┐
│                    API 路由层 (route.ts)                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  /api/historical-narrative/route.ts  (955行 - 核心调度器)    │   │
│  │                                                              │   │
│  │  职责：                                                       │   │
│  │  1. 接收请求 → 解析参数                                       │   │
│  │  2. 引用保护 → QuoteProtector                                │   │
│  │  3. 专有名词检查 → properNounCheck                           │   │
│  │  4. 智能联想 → smart-associate API                           │   │
│  │  5. 构建Prompt → buildPrompt()                               │   │
│  │  6. LLM调用 → invokeLLMWithProgressAndRetry()                │   │
│  │  7. 结果解析 → TextProcessor.parseDetectionResult()          │   │
│  │  8. 引用恢复 → QuoteProtector.restore()                      │   │
│  │  9. 验证 → verifyVocabularyUsage/verifyBannedWordsClean      │   │
│  │  10. 返回SSE流                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬───────────────────────────────────────┘
                             ↓
┌────────────────────────────────────────────────────────────────────┐
│                      核心库层 (src/lib/)                            │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ prompt-builder.ts │  │ llm-client.ts    │  │ text-processor.ts│  │
│  │ (184行)           │  │ (488行)          │  │                  │  │
│  │                   │  │                  │  │                  │  │
│  │ 构建系统Prompt   │  │ LLM调用封装      │  │ 文本处理工具    │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
│           │                     │                     │            │
│           ↓                     │                     │            │
│  ┌──────────────────────────────┴─────────────────────┘            │
│  │  step-prompt-builders.ts (590行)                                │
│  │  21个步骤的指令构建器                                            │
│  └─────────────────────────────────────────────────────────────────┘
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ quote-protector  │  │ smart-replacer   │  │ synonym-mappings │  │
│  │ 引用保护/恢复    │  │ 智能替换         │  │ 同义词映射       │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

---

## 📁 核心调度文件

### 1. 主调度器：`/api/historical-narrative/route.ts` (955行)

**这是整个润色流程的核心调度文件**

```typescript
// 核心流程伪代码
export async function POST(request) {
  // 1. 初始化 (0-5%)
  const { text, settings } = await request.json();
  
  // 2. 引用保护 (5-8%)
  const { protectedText, quoteMap } = QuoteProtector.protect(text);
  
  // 3. 专有名词检查 (8-12%)
  if (enabledSteps.includes("properNounCheck")) {
    protectedText = await checkProperNouns(protectedText);
  }
  
  // 4. 智能联想扩展 (12-16%)
  const expandedSettings = await expandResourcesWithAssociation(settings);
  
  // 5. 构建Prompt (16-15%)
  const { system, user } = buildPrompt(text, expandedSettings, enabledSteps);
  
  // 6. LLM处理 (15-70%) - 核心润色
  const result = await invokeLLMWithProgressAndRetry(llmClient, [
    { role: "system", content: system },
    { role: "user", content: user },
  ], options);
  
  // 7. 解析结果 (70-75%)
  const { detectedContext, processedText } = TextProcessor.parseDetectionResult(result);
  
  // 8. 恢复引用 (75-78%)
  const finalText = QuoteProtector.restore(processedText, quoteMap);
  
  // 9. 验证 (78-88%)
  verifyVocabularyUsage(finalText, settings.vocabulary);
  verifyBannedWordsClean(finalText, settings.bannedWords);
  
  // 10. 返回结果 (88-100%)
  return SSEStream({ text: finalText, reports, analysis });
}
```

### 2. Prompt构建器：`/lib/prompt-builder.ts` (184行)

```typescript
// 核心函数
export function buildPrompt(text, settings, stepIds) {
  // 1. 构建核心约束
  // 2. 识别专有名词生成保护指令
  // 3. 按步骤顺序生成指令
  // 4. 组装最终Prompt
}
```

### 3. 步骤指令构建器：`/lib/step-prompt-builders.ts` (590行)

```typescript
// 21个步骤的指令构建函数
export const STEP_PROMPT_BUILDERS = {
  narrativePerspective: () => buildNarrativePerspectivePrompt(),
  classicalApply: () => buildClassicalApplyPrompt(),
  polish: () => buildPolishPrompt(),
  bannedWords: () => buildBannedWordsPrompt(),
  // ... 共21个
};
```

### 4. LLM客户端：`/lib/llm-client.ts` (488行)

```typescript
// 核心函数
export async function invokeLLMWithProgressAndRetry(
  client, messages, options
) {
  // 1. 重试机制
  // 2. 进度回调
  // 3. 流式处理
  // 4. 异常检测
}
```

---

## 🔗 模块依赖关系

### 依赖层级图

```
Level 0 (无依赖)
├── src/lib/utils.ts           # 工具函数
├── src/lib/logger.ts          # 日志
├── src/lib/storage.ts         # 存储
└── src/types/*.ts             # 类型定义

Level 1 (依赖 Level 0)
├── src/lib/quote-protector.ts # 引用保护
├── src/lib/text-processor.ts  # 文本处理
├── src/lib/synonym-mappings.ts# 同义词映射
└── src/lib/synonym-utils.ts   # 同义词工具

Level 2 (依赖 Level 0-1)
├── src/lib/step-prompt-builders.ts  # 步骤构建器
├── src/lib/prompt-builder.ts        # Prompt构建
├── src/lib/smart-replacer.ts        # 智能替换
└── src/lib/ai-detector.ts           # AI检测

Level 3 (依赖 Level 0-2)
├── src/lib/llm-client.ts            # LLM客户端
├── src/lib/fast-pipeline.ts         # 快速处理流水线
└── src/lib/polish-evaluator.ts      # 润色评估

Level 4 (API层 - 依赖所有下层)
├── src/app/api/historical-narrative/route.ts  # 核心调度
├── src/app/api/ai-detect/route.ts             # AI检测
├── src/app/api/text-tools/route.ts            # 文本工具
└── src/app/api/smart-associate/route.ts       # 智能联想

Level 5 (UI层 - 依赖API层)
├── src/app/page.tsx                  # 主页面 (1500+行)
├── src/components/polish-config.tsx  # 配置组件
└── src/components/resource-manager.tsx # 资源管理
```

---

## ⚠️ 耦合度问题分析

### 高耦合区域

#### 1. `route.ts` 文件过大 (955行)

```
问题：
- 包含了太多业务逻辑（专有名词检查、智能联想、验证等）
- 难以单独测试各个处理阶段
- 修改一个功能可能影响其他功能

建议：
├── 提取为独立模块
│   ├── proper-noun-checker.ts    # 专有名词检查
│   ├── smart-associator.ts       # 智能联想
│   ├── result-validator.ts       # 结果验证
│   └── progress-reporter.ts      # 进度报告
```

#### 2. `page.tsx` 文件过大 (1500+行)

```
问题：
- 混合了太多UI组件定义
- 状态管理逻辑复杂
- 难以复用和测试

建议：
├── 拆分为独立组件
│   ├── components/input-panel.tsx
│   ├── components/output-panel.tsx
│   ├── components/config-panel.tsx
│   └── components/replacement-records.tsx
```

#### 3. 步骤配置硬编码

```typescript
// 当前：硬编码在多个文件中
// src/constants/processing-steps.ts
// src/lib/step-prompt-builders.ts
// src/app/api/historical-narrative/route.ts

// 问题：修改一个步骤需要改动多个文件

// 建议：使用配置驱动
const STEP_CONFIG = {
  properNounCheck: {
    definition: {...},
    builder: buildProperNounCheckPrompt,
    executor: executeProperNounCheck,
    validator: validateProperNounCheck,
  },
  // ...
};
```

---

## ✅ 模块化良好的区域

### 1. 类型定义 (`src/types/`)

```
src/types/
├── index.ts          # 统一导出
├── api.ts            # API类型
├── settings.ts       # 设置类型
├── vocabulary.ts     # 词汇类型
└── enhancements.ts   # 增强类型

优点：
- 类型定义独立
- 自动生成API文档
- 编译时类型检查
```

### 2. 工具模块 (`src/lib/`)

```
独立的纯函数模块：
├── quote-protector.ts    # 引用保护 - 无副作用
├── synonym-mappings.ts   # 同义词映射 - 纯数据
├── text-processor.ts     # 文本处理 - 纯函数
└── text-diff.ts          # 差异比较 - 纯函数

优点：
- 可独立测试
- 无外部依赖
- 可复用
```

### 3. API路由 (`src/app/api/`)

```
每个API独立文件：
├── historical-narrative/  # 润色主流程
├── ai-detect/             # AI检测
├── text-tools/            # 文本工具
├── smart-associate/       # 智能联想
└── model-training/        # 模型训练

优点：
- API边界清晰
- 可独立部署
- 易于扩展
```

---

## 🔧 改进建议

### 1. 拆分大文件

```typescript
// 当前
src/app/api/historical-narrative/route.ts (955行)

// 建议
src/app/api/historical-narrative/
├── route.ts              # 主入口 (200行)
├── pipeline.ts           # 处理流水线 (300行)
├── validators.ts         # 验证器 (150行)
├── reporters.ts          # 报告生成 (100行)
└── proper-nouns.ts       # 专有名词处理 (100行)
```

### 2. 引入依赖注入

```typescript
// 当前：硬编码依赖
import { QuoteProtector } from '@/lib/quote-protector';
import { TextProcessor } from '@/lib/text-processor';

// 建议：依赖注入
class PolishPipeline {
  constructor(
    private quoteProtector: QuoteProtector,
    private textProcessor: TextProcessor,
    private llmClient: LLMClient,
  ) {}
  
  async process(text: string, settings: Settings): Promise<Result> {
    // ...
  }
}
```

### 3. 统一步骤配置

```typescript
// 建议：步骤配置中心
// src/config/steps.ts
export const STEP_REGISTRY = {
  properNounCheck: {
    id: 'properNounCheck',
    title: '专有名词检查',
    phase: 'config',
    builder: () => import('@/lib/step-builders/proper-noun'),
    executor: () => import('@/lib/executors/proper-noun'),
    validator: () => import('@/lib/validators/proper-noun'),
    dependencies: ['detect'],
    optional: true,
  },
  // ...
};
```

---

## 📈 模块化评分详情

| 维度 | 评分 | 说明 |
|------|------|------|
| **类型安全** | ⭐⭐⭐⭐⭐ | TypeScript全覆盖，类型定义完善 |
| **API设计** | ⭐⭐⭐⭐ | RESTful + SSE，边界清晰 |
| **组件拆分** | ⭐⭐⭐ | 部分组件过大，需要进一步拆分 |
| **业务逻辑** | ⭐⭐⭐ | 核心流程耦合度较高 |
| **工具函数** | ⭐⭐⭐⭐⭐ | 纯函数设计，可测试性好 |
| **配置管理** | ⭐⭐⭐⭐ | 常量集中管理，但有分散 |

**综合评分：⭐⭐⭐⭐ (4/5)**

---

## 🎯 核心调度文件总结

### 主要调度文件：`/api/historical-narrative/route.ts`

这是整个润色流程的**唯一入口点**，负责：

1. **请求解析** - 接收并验证输入
2. **流程编排** - 按顺序调用各处理模块
3. **进度管理** - SSE流式输出进度
4. **异常处理** - 重试和降级策略
5. **结果组装** - 生成最终输出

### 调用链路

```
page.tsx (UI)
    ↓ execute({ text, settings })
useStreamRequest (Hook)
    ↓ POST /api/historical-narrative
route.ts (调度器)
    ↓ buildPrompt()
prompt-builder.ts
    ↓ STEP_PROMPT_BUILDERS[id]()
step-prompt-builders.ts
    ↓ invokeLLMWithProgressAndRetry()
llm-client.ts
    ↓ 调用AI模型
返回流式结果
```
