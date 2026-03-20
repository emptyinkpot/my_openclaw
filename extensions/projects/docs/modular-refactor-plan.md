# 模块化重构方案

## 一、现有问题分析

### 1.1 大文件问题

| 文件 | 行数 | 问题 |
|------|------|------|
| `src/app/api/historical-narrative/route.ts` | 955行 | 业务逻辑混杂，难以测试 |
| `src/app/page.tsx` | 1500+行 | UI组件定义混合，状态复杂 |
| `src/lib/step-prompt-builders.ts` | 590行 | 21个步骤混在一个文件 |

### 1.2 耦合问题

```
问题1: 直接导入依赖
- route.ts 直接导入并调用 QuoteProtector, TextProcessor 等
- 修改任何一个模块都可能影响 route.ts

问题2: 硬编码配置
- 步骤定义分散在 processing-steps.ts, step-prompt-builders.ts, route.ts
- 新增步骤需要修改3个文件

问题3: 状态管理混乱
- page.tsx 包含大量 useState
- 状态更新逻辑分散
```

### 1.3 命名不统一

```
// 不一致的命名风格
buildPrompt()          // camelCase
build_classical_prompt // snake_case (历史遗留)
STEP_DEFINITIONS       // UPPER_CASE
stepIds                // camelCase
```

---

## 二、模块化拆分方案

### 2.1 新目录结构

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # 主页面 (精简后 ~300行)
│   ├── layout.tsx
│   └── api/                      # API路由层
│       ├── polish/               # 润色模块 (原historical-narrative)
│       │   ├── route.ts          # 入口 (~100行)
│       │   ├── pipeline.ts       # 流水线编排
│       │   ├── progress.ts       # 进度管理
│       │   └── types.ts          # 类型定义
│       ├── detect/               # AI检测模块
│       │   ├── route.ts
│       │   ├── detector.ts
│       │   └── trainer.ts
│       ├── resources/            # 资源管理模块
│       │   ├── vocabulary/
│       │   ├── banned-words/
│       │   └── literature/
│       └── tools/                # 工具API
│           └── route.ts
│
├── modules/                      # 业务模块 (新增)
│   ├── polish/                   # 润色核心模块
│   │   ├── index.ts              # 模块导出
│   │   ├── pipeline.ts           # 处理流水线
│   │   ├── steps/                # 步骤实现
│   │   │   ├── index.ts          # 步骤注册表
│   │   │   ├── base.ts           # 步骤基类
│   │   │   ├── config/           # 配置阶段步骤
│   │   │   │   ├── detect.ts
│   │   │   │   ├── proper-noun.ts
│   │   │   │   ├── narrative.ts
│   │   │   │   └── classical.ts
│   │   │   ├── process/          # 处理阶段步骤
│   │   │   │   ├── polish.ts
│   │   │   │   ├── banned-words.ts
│   │   │   │   └── style.ts
│   │   │   ├── postprocess/      # 后处理阶段步骤
│   │   │   │   ├── markdown-clean.ts
│   │   │   │   └── title-extract.ts
│   │   │   └── review/           # 审稿阶段步骤
│   │   │       ├── semantic.ts
│   │   │       ├── final.ts
│   │   │       └── word-usage.ts
│   │   ├── prompt/               # Prompt构建
│   │   │   ├── builder.ts        # 构建器
│   │   │   ├── templates/        # 模板文件
│   │   │   └── compressor.ts     # 压缩器
│   │   ├── validator/            # 结果验证
│   │   │   ├── vocabulary.ts
│   │   │   └── banned-words.ts
│   │   └── types.ts              # 模块类型
│   │
│   ├── detect/                   # AI检测模块
│   │   ├── index.ts
│   │   ├── detector.ts           # 检测器
│   │   ├── features/             # 特征提取
│   │   │   ├── perplexity.ts
│   │   │   ├── vocabulary.ts
│   │   │   └── structure.ts
│   │   ├── trainer.ts            # 模型训练
│   │   ├── history.ts            # 历史记录
│   │   └── types.ts
│   │
│   └── resources/                # 资源管理模块
│       ├── index.ts
│       ├── vocabulary/           # 词汇库
│       │   ├── manager.ts
│       │   ├── classifier.ts
│       │   └── importer.ts
│       ├── banned-words/         # 禁用词库
│       │   ├── manager.ts
│       │   └── replacer.ts
│       ├── literature/           # 文献库
│       │   ├── manager.ts
│       │   └── citation.ts
│       └── types.ts
│
├── core/                         # 核心基础设施 (新增)
│   ├── llm/                      # LLM客户端
│   │   ├── index.ts              # 导出
│   │   ├── client.ts             # 客户端实现
│   │   ├── providers/            # 不同提供商
│   │   │   ├── openai.ts
│   │   │   ├── deepseek.ts
│   │   │   └── base.ts
│   │   ├── stream.ts             # 流式处理
│   │   └── types.ts
│   │
│   ├── storage/                  # 存储层
│   │   ├── index.ts
│   │   ├── local.ts              # localStorage
│   │   ├── memory.ts             # 内存缓存
│   │   └── types.ts
│   │
│   ├── text/                     # 文本处理工具
│   │   ├── index.ts
│   │   ├── processor.ts          # 文本处理
│   │   ├── quote-protector.ts    # 引用保护
│   │   ├── diff.ts               # 差异比较
│   │   ├── segmenter.ts          # 分词分句
│   │   └── types.ts
│   │
│   └── di/                       # 依赖注入
│       ├── index.ts
│       ├── container.ts          # IoC容器
│       ├── tokens.ts             # 依赖标识
│       └── types.ts
│
├── components/                   # UI组件 (重构)
│   ├── ui/                       # 基础UI组件 (shadcn)
│   ├── layout/                   # 布局组件
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   ├── polish/                   # 润色相关组件
│   │   ├── InputPanel.tsx        # 输入面板
│   │   ├── OutputPanel.tsx       # 输出面板
│   │   ├── ConfigPanel.tsx       # 配置面板
│   │   ├── ProgressDisplay.tsx   # 进度显示
│   │   └── ReplacementRecords.tsx # 替换记录
│   ├── detect/                   # 检测相关组件
│   │   ├── RealtimeDetector.tsx
│   │   ├── HistoryPanel.tsx
│   │   └── TrainingPanel.tsx
│   ├── resources/                # 资源管理组件
│   │   ├── VocabularyManager.tsx
│   │   ├── BannedWordsManager.tsx
│   │   └── LiteratureManager.tsx
│   └── common/                   # 通用组件
│       ├── CollapsiblePanel.tsx
│       ├── HelpCard.tsx
│       └── Badge.tsx
│
├── hooks/                        # 自定义Hooks
│   ├── index.ts
│   ├── useStreamRequest.ts       # SSE流请求
│   ├── usePolish.ts              # 润色逻辑
│   ├── useDetect.ts              # 检测逻辑
│   ├── useResources.ts           # 资源管理
│   └── useLocalStorage.ts
│
├── config/                       # 配置文件 (新增)
│   ├── index.ts                  # 统一导出
│   ├── steps.ts                  # 步骤配置
│   ├── models.ts                 # AI模型配置
│   ├── constants.ts              # 常量定义
│   └── defaults.ts               # 默认值
│
├── types/                        # 类型定义
│   ├── index.ts
│   ├── api.ts
│   ├── settings.ts
│   ├── polish.ts
│   ├── detect.ts
│   └── resources.ts
│
└── lib/                          # 工具函数 (保留)
    ├── index.ts
    ├── utils.ts
    ├── logger.ts
    └── validators.ts
```

### 2.2 模块职责划分

```
┌─────────────────────────────────────────────────────────────────┐
│                         表现层 (Presentation)                    │
│  components/ - UI组件，只负责渲染和用户交互                       │
│  hooks/ - 业务逻辑Hooks，连接UI和业务模块                        │
│  app/page.tsx - 页面组装                                        │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                         业务模块层 (Business)                    │
│  modules/polish/ - 润色核心业务                                  │
│  modules/detect/ - AI检测业务                                    │
│  modules/resources/ - 资源管理业务                               │
│                                                                 │
│  特点：                                                          │
│  - 每个模块独立封装                                              │
│  - 通过接口对外暴露能力                                          │
│  - 模块间通过事件/接口通信                                       │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                         基础设施层 (Infrastructure)              │
│  core/llm/ - LLM调用能力                                        │
│  core/storage/ - 存储能力                                        │
│  core/text/ - 文本处理能力                                      │
│  core/di/ - 依赖注入容器                                        │
│                                                                 │
│  特点：                                                          │
│  - 提供基础能力                                                  │
│  - 无业务逻辑                                                    │
│  - 可独立测试和复用                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 三、依赖注入设计

### 3.1 服务标识定义

```typescript
// src/core/di/tokens.ts

/**
 * 服务依赖标识
 * 用于依赖注入容器的服务注册和解析
 */
export const ServiceTokens = {
  // LLM服务
  LLM_CLIENT: Symbol('ILLMClient'),
  LLM_STREAM: Symbol('ILLMStreamHandler'),
  
  // 文本处理
  TEXT_PROCESSOR: Symbol('ITextProcessor'),
  QUOTE_PROTECTOR: Symbol('IQuoteProtector'),
  TEXT_DIFF: Symbol('ITextDiff'),
  
  // 存储服务
  STORAGE_LOCAL: Symbol('ILocalStorage'),
  STORAGE_MEMORY: Symbol('IMemoryStorage'),
  
  // 业务服务
  POLISH_PIPELINE: Symbol('IPolishPipeline'),
  DETECTOR: Symbol('IDetector'),
  RESOURCE_MANAGER: Symbol('IResourceManager'),
  
  // 配置
  CONFIG_STEPS: Symbol('IStepConfig'),
  CONFIG_MODELS: Symbol('IModelConfig'),
} as const;
```

### 3.2 服务接口定义

```typescript
// src/core/di/types.ts

import type { 
  PolishInput, 
  PolishOutput, 
  PolishProgress 
} from '@/modules/polish/types';

/**
 * 润色流水线接口
 */
export interface IPolishPipeline {
  /**
   * 执行润色处理
   * @param input 输入数据
   * @param onProgress 进度回调
   * @returns 润色结果
   */
  execute(
    input: PolishInput, 
    onProgress?: (progress: PolishProgress) => void
  ): Promise<PolishOutput>;
  
  /**
   * 验证配置是否有效
   */
  validateConfig(config: unknown): boolean;
}

/**
 * LLM客户端接口
 */
export interface ILLMClient {
  /**
   * 调用LLM生成内容
   */
  generate(
    messages: Array<{ role: string; content: string }>,
    options?: LLMOptions
  ): Promise<string>;
  
  /**
   * 流式调用LLM
   */
  generateStream(
    messages: Array<{ role: string; content: string }>,
    options?: LLMOptions,
    onChunk?: (chunk: string) => void
  ): Promise<string>;
}

/**
 * 引用保护器接口
 */
export interface IQuoteProtector {
  /**
   * 保护引用内容
   * @returns 保护后的文本和映射表
   */
  protect(text: string): { text: string; map: Map<string, string> };
  
  /**
   * 恢复引用内容
   */
  restore(text: string, map: Map<string, string>): string;
}
```

### 3.3 依赖注入容器

```typescript
// src/core/di/container.ts

/**
 * 简易依赖注入容器
 * 支持单例和工厂模式
 */
export class DIContainer {
  private static instance: DIContainer;
  private services: Map<symbol, any> = new Map();
  private factories: Map<symbol, () => any> = new Map();
  
  private constructor() {}
  
  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }
  
  /**
   * 注册单例服务
   */
  registerSingleton<T>(token: symbol, instance: T): void {
    this.services.set(token, instance);
  }
  
  /**
   * 注册工厂服务（每次获取创建新实例）
   */
  registerFactory<T>(token: symbol, factory: () => T): void {
    this.factories.set(token, factory);
  }
  
  /**
   * 获取服务实例
   */
  resolve<T>(token: symbol): T {
    // 优先返回单例
    if (this.services.has(token)) {
      return this.services.get(token);
    }
    
    // 使用工厂创建
    if (this.factories.has(token)) {
      return this.factories.get(token)!();
    }
    
    throw new Error(`Service not found: ${token.toString()}`);
  }
  
  /**
   * 检查服务是否已注册
   */
  has(token: symbol): boolean {
    return this.services.has(token) || this.factories.has(token);
  }
}

// 全局容器实例
export const container = DIContainer.getInstance();
```

### 3.4 服务注册

```typescript
// src/core/di/bootstrap.ts

import { container } from './container';
import { ServiceTokens } from './tokens';

// 导入实现
import { OpenAIClient } from '../llm/providers/openai';
import { DeepSeekClient } from '../llm/providers/deepseek';
import { QuoteProtector } from '../text/quote-protector';
import { TextProcessor } from '../text/processor';
import { LocalStorage } from '../storage/local';
import { PolishPipeline } from '@/modules/polish/pipeline';
import { Detector } from '@/modules/detect/detector';

/**
 * 应用启动时注册所有服务
 */
export function bootstrapServices() {
  // 基础设施层
  container.registerFactory(ServiceTokens.LLM_CLIENT, () => {
    const provider = process.env.LLM_PROVIDER || 'openai';
    return provider === 'deepseek' 
      ? new DeepSeekClient() 
      : new OpenAIClient();
  });
  
  container.registerSingleton(
    ServiceTokens.QUOTE_PROTECTOR, 
    new QuoteProtector()
  );
  
  container.registerSingleton(
    ServiceTokens.TEXT_PROCESSOR, 
    new TextProcessor()
  );
  
  container.registerSingleton(
    ServiceTokens.STORAGE_LOCAL, 
    new LocalStorage()
  );
  
  // 业务层
  container.registerFactory(
    ServiceTokens.POLISH_PIPELINE, 
    () => new PolishPipeline()
  );
  
  container.registerFactory(
    ServiceTokens.DETECTOR, 
    () => new Detector()
  );
}
```

---

## 四、步骤模块重构

### 4.1 步骤基类

```typescript
// src/modules/polish/steps/base.ts

import type { 
  StepContext, 
  StepResult, 
  StepConfig 
} from '../types';

/**
 * 处理步骤基类
 * 所有步骤都继承此类
 */
export abstract class BaseStep {
  /** 步骤ID */
  abstract readonly id: string;
  
  /** 步骤名称 */
  abstract readonly name: string;
  
  /** 所属阶段 */
  abstract readonly phase: 'config' | 'process' | 'postprocess' | 'review';
  
  /** 步骤描述 */
  abstract readonly description: string;
  
  /** 是否为固定步骤（不可关闭） */
  readonly fixed: boolean = false;
  
  /** 依赖的步骤 */
  readonly dependencies: string[] = [];
  
  /**
   * 执行步骤
   * @param context 执行上下文
   * @returns 执行结果
   */
  abstract execute(context: StepContext): Promise<StepResult>;
  
  /**
   * 构建该步骤的Prompt指令
   * @param settings 用户设置
   * @returns Prompt指令字符串
   */
  buildPrompt(settings: StepConfig['settings']): string {
    // 默认实现，子类可覆盖
    return '';
  }
  
  /**
   * 验证步骤是否可执行
   */
  canExecute(context: StepContext): boolean {
    // 检查依赖步骤是否已完成
    return this.dependencies.every(
      dep => context.completedSteps.includes(dep)
    );
  }
  
  /**
   * 估算步骤执行进度占比
   */
  getProgressWeight(): number {
    const weights: Record<string, number> = {
      config: 1,
      process: 3,
      postprocess: 1,
      review: 2,
    };
    return weights[this.phase] || 1;
  }
}
```

### 4.2 具体步骤实现示例

```typescript
// src/modules/polish/steps/config/proper-noun.ts

import { BaseStep } from '../base';
import type { StepContext, StepResult } from '../../types';
import { ServiceTokens, container } from '@/core/di';

/**
 * 专有名词检查步骤
 * 
 * 职责：
 * 1. 检测文本中的现实世界专有名词
 * 2. 调用LLM替换为通用表达
 */
export class ProperNounCheckStep extends BaseStep {
  readonly id = 'properNounCheck';
  readonly name = '专有名词检查';
  readonly phase = 'config' as const;
  readonly description = '检测并替换昭和/唐朝/法兰西等现实专有名词';
  readonly fixed = false;
  readonly dependencies = ['detect'];
  
  // 专有名词分类
  private readonly PROPER_NOUNS = {
    eras: ['昭和', '明治', '大正', '平成', '令和', '庆应', '元治'],
    dynasties: ['唐朝', '宋代', '明朝', '清代', '汉朝', '秦朝'],
    countries: ['法兰西', '英吉利', '德意志', '美利坚', '俄罗斯'],
    techCompanies: ['华为', '苹果', '谷歌', '微软', '阿里巴巴'],
  };
  
  async execute(context: StepContext): Promise<StepResult> {
    const { text, settings, reportProgress } = context;
    
    // 1. 检测专有名词
    const foundNouns = this.detectNouns(text);
    
    if (foundNouns.length === 0) {
      return {
        text,
        modified: false,
        report: { step: this.name, report: '未发现专有名词' },
      };
    }
    
    reportProgress?.(`发现 ${foundNouns.length} 个专有名词，正在替换...`);
    
    // 2. 获取LLM客户端
    const llmClient = container.resolve(ServiceTokens.LLM_CLIENT);
    
    // 3. 构建替换Prompt
    const prompt = this.buildReplacePrompt(text, foundNouns);
    
    // 4. 调用LLM替换
    const replacedText = await llmClient.generate([
      { role: 'user', content: prompt }
    ], { temperature: 0.2 });
    
    // 5. 分析替换记录
    const replacements = this.analyzeReplacements(text, replacedText, foundNouns);
    
    return {
      text: replacedText,
      modified: true,
      replacements,
      report: { 
        step: this.name, 
        report: `替换 ${replacements.length} 处专有名词` 
      },
    };
  }
  
  /**
   * 检测文本中的专有名词
   */
  private detectNouns(text: string): string[] {
    const found: string[] = [];
    const allNouns = Object.values(this.PROPER_NOUNS).flat();
    
    allNouns.forEach(noun => {
      if (text.includes(noun) && !found.includes(noun)) {
        found.push(noun);
      }
    });
    
    return found;
  }
  
  /**
   * 构建替换Prompt
   */
  private buildReplacePrompt(text: string, nouns: string[]): string {
    return `你是一位文学编辑，请将文本中的特定名称改为通用表达。

【需要改写的名称】
${nouns.join('、')}

【原文】
${text}

【改写要求】
1. 将年号改为"那年"、"当年"等时间词
2. 将朝代名改为"前朝"、"古时"等
3. 将国名改为"邻国"、"异国"等
4. 将现代公司名改为通用称呼
5. 保持文意不变，语句通顺
6. 直接输出改写后的文本

【改写后的文本】`;
  }
  
  /**
   * 分析替换记录
   */
  private analyzeReplacements(
    original: string, 
    replaced: string, 
    nouns: string[]
  ): Array<{ original: string; replaced: string; reason: string }> {
    return nouns
      .filter(noun => !replaced.includes(noun))
      .map(noun => ({
        original: noun,
        replaced: '已替换',
        reason: '专有名词净化',
      }));
  }
  
  buildPrompt(settings: any): string {
    // 配置阶段的Prompt由execute动态生成
    return '';
  }
}
```

### 4.3 步骤注册表

```typescript
// src/modules/polish/steps/index.ts

import type { BaseStep } from './base';

// 导入所有步骤
import { DetectStep } from './config/detect';
import { ProperNounCheckStep } from './config/proper-noun';
import { NarrativePerspectiveStep } from './config/narrative';
import { ClassicalApplyStep } from './config/classical';
import { CitationApplyStep } from './config/citation';
import { ParticleApplyStep } from './config/particle';
import { PunctuationApplyStep } from './config/punctuation';
import { QuoteProtectStep } from './config/quote-protect';

import { PolishStep } from './process/polish';
import { BannedWordsStep } from './process/banned-words';
import { SentencePatternsStep } from './process/sentence-patterns';
import { MemeFuseStep } from './process/meme-fuse';
import { StyleForgeStep } from './process/style-forge';

import { MarkdownCleanStep } from './postprocess/markdown-clean';
import { TitleExtractStep } from './postprocess/title-extract';

import { SemanticCheckStep } from './review/semantic';
import { FinalReviewStep } from './review/final';
import { WordUsageCheckStep } from './review/word-usage';
import { SmartFixStep } from './review/smart-fix';
import { BreathSegmentStep } from './review/breath-segment';

/**
 * 步骤注册表
 * 统一管理所有步骤的创建和获取
 */
export class StepRegistry {
  private static steps: Map<string, BaseStep> = new Map();
  private static initialized = false;
  
  /**
   * 初始化注册表
   */
  static initialize(): void {
    if (this.initialized) return;
    
    // 注册所有步骤
    const stepInstances: BaseStep[] = [
      // 配置阶段
      new DetectStep(),
      new ProperNounCheckStep(),
      new NarrativePerspectiveStep(),
      new ClassicalApplyStep(),
      new CitationApplyStep(),
      new ParticleApplyStep(),
      new PunctuationApplyStep(),
      new QuoteProtectStep(),
      
      // 处理阶段
      new PolishStep(),
      new BannedWordsStep(),
      new SentencePatternsStep(),
      new MemeFuseStep(),
      new StyleForgeStep(),
      
      // 后处理阶段
      new MarkdownCleanStep(),
      new TitleExtractStep(),
      
      // 审稿阶段
      new SemanticCheckStep(),
      new FinalReviewStep(),
      new WordUsageCheckStep(),
      new SmartFixStep(),
      new BreathSegmentStep(),
    ];
    
    stepInstances.forEach(step => {
      this.steps.set(step.id, step);
    });
    
    this.initialized = true;
  }
  
  /**
   * 获取步骤实例
   */
  static get(id: string): BaseStep | undefined {
    this.initialize();
    return this.steps.get(id);
  }
  
  /**
   * 获取所有步骤
   */
  static getAll(): BaseStep[] {
    this.initialize();
    return Array.from(this.steps.values());
  }
  
  /**
   * 按阶段获取步骤
   */
  static getByPhase(phase: BaseStep['phase']): BaseStep[] {
    return this.getAll().filter(step => step.phase === phase);
  }
  
  /**
   * 获取步骤执行顺序
   */
  static getExecutionOrder(enabledSteps: string[]): string[] {
    const phaseOrder = ['config', 'process', 'postprocess', 'review'];
    const allSteps = this.getAll();
    
    return phaseOrder.flatMap(phase => 
      allSteps
        .filter(s => s.phase === phase && enabledSteps.includes(s.id))
        .map(s => s.id)
    );
  }
}

// 导出便捷方法
export const getStep = StepRegistry.get;
export const getAllSteps = StepRegistry.getAll;
export const getStepsByPhase = StepRegistry.getByPhase;
```

---

## 五、润色流水线重构

### 5.1 流水线实现

```typescript
// src/modules/polish/pipeline.ts

import { StepRegistry } from './steps';
import { ServiceTokens, container } from '@/core/di';
import type { 
  PolishInput, 
  PolishOutput, 
  PolishProgress,
  StepContext,
  StepResult,
} from './types';

/**
 * 润色处理流水线
 * 
 * 职责：
 * 1. 编排各处理步骤
 * 2. 管理执行进度
 * 3. 处理异常和重试
 * 4. 生成处理报告
 */
export class PolishPipeline {
  private quoteProtector = container.resolve(ServiceTokens.QUOTE_PROTECTOR);
  private textProcessor = container.resolve(ServiceTokens.TEXT_PROCESSOR);
  
  /**
   * 执行润色处理
   */
  async execute(
    input: PolishInput, 
    onProgress?: (progress: PolishProgress) => void
  ): Promise<PolishOutput> {
    const { text, settings } = input;
    const startTime = Date.now();
    
    // 1. 初始化
    this.reportProgress(onProgress, 0, '初始化处理环境...');
    
    // 2. 引用保护
    const { text: protectedText, map: quoteMap } = 
      this.quoteProtector.protect(text);
    this.reportProgress(onProgress, 5, `引用保护完成（${quoteMap.size} 处）`);
    
    // 3. 获取启用的步骤
    const enabledSteps = this.getEnabledSteps(settings);
    const stepOrder = StepRegistry.getExecutionOrder(enabledSteps);
    
    this.reportProgress(
      onProgress, 8, 
      `将执行 ${stepOrder.length} 个步骤`
    );
    
    // 4. 执行各步骤
    const context: StepContext = {
      text: protectedText,
      settings,
      completedSteps: [],
      replacements: [],
      reports: [],
    };
    
    let currentProgress = 10;
    const progressPerStep = 75 / stepOrder.length;
    
    for (const stepId of stepOrder) {
      const step = StepRegistry.get(stepId);
      if (!step) continue;
      
      // 检查依赖
      if (!step.canExecute(context)) {
        console.warn(`Step ${stepId} skipped: dependencies not met`);
        continue;
      }
      
      this.reportProgress(
        onProgress, 
        currentProgress, 
        `执行：${step.name}...`
      );
      
      try {
        const result = await step.execute({
          ...context,
          reportProgress: (msg) => 
            this.reportProgress(onProgress, currentProgress, msg),
        });
        
        // 更新上下文
        if (result.modified) {
          context.text = result.text;
          context.replacements.push(...(result.replacements || []));
        }
        context.completedSteps.push(stepId);
        context.reports.push(result.report);
        
      } catch (error) {
        console.error(`Step ${stepId} failed:`, error);
        context.reports.push({
          step: step.name,
          report: `执行失败：${error instanceof Error ? error.message : '未知错误'}`,
        });
      }
      
      currentProgress += progressPerStep;
    }
    
    // 5. 恢复引用
    const finalText = this.quoteProtector.restore(context.text, quoteMap);
    this.reportProgress(onProgress, 90, '引用恢复完成');
    
    // 6. 生成最终报告
    const output: PolishOutput = {
      text: finalText,
      title: '', // 标题提取步骤会填充
      replacements: context.replacements,
      reports: context.reports,
      metadata: {
        processingTime: Date.now() - startTime,
        stepsExecuted: context.completedSteps.length,
        totalSteps: stepOrder.length,
      },
    };
    
    this.reportProgress(onProgress, 100, '处理完成');
    
    return output;
  }
  
  /**
   * 获取启用的步骤列表
   */
  private getEnabledSteps(settings: PolishInput['settings']): string[] {
    const steps = settings.steps || {};
    return Object.entries(steps)
      .filter(([_, config]) => config.enabled)
      .map(([id]) => id);
  }
  
  /**
   * 报告进度
   */
  private reportProgress(
    callback: ((progress: PolishProgress) => void) | undefined,
    progress: number,
    message: string
  ): void {
    callback?.({ progress, message, timestamp: Date.now() });
  }
}
```

---

## 六、API路由层重构

### 6.1 新的API入口

```typescript
// src/app/api/polish/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { container, ServiceTokens } from '@/core/di';
import { bootstrapServices } from '@/core/di/bootstrap';
import type { PolishInput, PolishProgress } from '@/modules/polish/types';

// 确保服务已注册
bootstrapServices();

/**
 * 润色API入口
 * 
 * POST /api/polish
 * 
 * 请求体：
 * {
 *   text: string;           // 待润色文本
 *   settings: Settings;     // 润色配置
 * }
 * 
 * 返回：SSE流
 * - data: { progress, message }  进度更新
 * - data: { text, reports }      最终结果
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, settings } = body as PolishInput;
    
    // 验证输入
    if (!text?.trim()) {
      return NextResponse.json(
        { error: '请提供有效的文本内容' },
        { status: 400 }
      );
    }
    
    // 获取流水线实例
    const pipeline = container.resolve(ServiceTokens.POLISH_PIPELINE);
    
    // 创建SSE流
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const output = await pipeline.execute(text, settings, 
            (progress: PolishProgress) => {
              // 发送进度更新
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(progress)}\n\n`)
              );
            }
          );
          
          // 发送最终结果
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              status: 'completed', 
              ...output 
            })}\n\n`)
          );
          
          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              error: error instanceof Error ? error.message : '处理失败' 
            })}\n\n`)
          );
          controller.close();
        }
      },
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error) {
    console.error('[api/polish] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}
```

---

## 七、UI组件拆分

### 7.1 主页面精简

```typescript
// src/app/page.tsx (重构后 ~300行)

'use client';

import { useState, useCallback } from 'react';
import { InputPanel } from '@/components/polish/InputPanel';
import { OutputPanel } from '@/components/polish/OutputPanel';
import { ConfigPanel } from '@/components/polish/ConfigPanel';
import { ProgressDisplay } from '@/components/polish/ProgressDisplay';
import { usePolish } from '@/hooks/usePolish';
import { useResources } from '@/hooks/useResources';
import type { HistoricalNarrativeSettings } from '@/types';

export default function HomePage() {
  // 状态管理
  const [inputText, setInputText] = useState('');
  const [settings, setSettings] = useState<HistoricalNarrativeSettings>(defaultSettings);
  
  // 自定义Hooks处理业务逻辑
  const { 
    outputText, 
    outputTitle,
    progress, 
    statusMessage,
    isProcessing,
    error,
    execute,
    reset,
  } = usePolish();
  
  const {
    vocabulary,
    bannedWords,
    literature,
    addVocabulary,
    removeVocabulary,
    // ...
  } = useResources();
  
  // 处理润色
  const handlePolish = useCallback(() => {
    if (!inputText.trim()) return;
    reset();
    execute({
      text: inputText,
      settings: {
        ...settings,
        vocabulary,
        bannedWords,
        literature,
      },
    });
  }, [inputText, settings, vocabulary, bannedWords, literature, execute, reset]);
  
  return (
    <main className="min-h-screen p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 输入面板 */}
        <InputPanel
          value={inputText}
          onChange={setInputText}
          disabled={isProcessing}
        />
        
        {/* 配置面板 */}
        <ConfigPanel
          settings={settings}
          onChange={setSettings}
          resources={{ vocabulary, bannedWords, literature }}
          onResourcesChange={{ /* ... */ }}
        />
        
        {/* 输出面板 */}
        <OutputPanel
          text={outputText}
          title={outputTitle}
          progress={progress}
          statusMessage={statusMessage}
          isProcessing={isProcessing}
          error={error}
        />
      </div>
      
      {/* 进度显示 */}
      {isProcessing && (
        <ProgressDisplay 
          progress={progress} 
          message={statusMessage} 
        />
      )}
      
      {/* 操作按钮 */}
      <div className="flex justify-center gap-4 mt-4">
        <button
          onClick={handlePolish}
          disabled={isProcessing || !inputText.trim()}
          className="btn-primary"
        >
          {isProcessing ? '处理中...' : '开始润色'}
        </button>
      </div>
    </main>
  );
}
```

### 7.2 输入面板组件

```typescript
// src/components/polish/InputPanel.tsx

import { memo, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Copy, Upload, Trash2 } from 'lucide-react';
import { useWordCount } from '@/hooks/useWordCount';

interface InputPanelProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * 输入面板组件
 * 
 * 功能：
 * - 文本输入
 * - 字数统计
 * - 粘贴/清空操作
 */
export const InputPanel = memo(function InputPanel({
  value,
  onChange,
  disabled,
}: InputPanelProps) {
  const wordCount = useWordCount(value);
  
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      onChange(text);
    } catch (e) {
      console.error('粘贴失败:', e);
    }
  }, [onChange]);
  
  const handleClear = useCallback(() => {
    onChange('');
  }, [onChange]);
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" />
          <span className="font-semibold">输入文本</span>
          <Badge variant="secondary">{wordCount} 字</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={handlePaste}>
            <Copy className="w-4 h-4 mr-1" />粘贴
          </Button>
          <Button size="sm" variant="ghost" onClick={handleClear}>
            <Trash2 className="w-4 h-4 mr-1" />清空
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="请输入需要润色的文本..."
          disabled={disabled}
          className="min-h-[400px] resize-none"
        />
      </CardContent>
    </Card>
  );
});
```

---

## 八、优化效果

### 8.1 对比

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| **单文件最大行数** | 1500+ | ~300 |
| **步骤新增成本** | 修改3个文件 | 1个新文件 |
| **单元测试覆盖** | 困难 | 容易 |
| **模块可复用性** | 低 | 高 |
| **依赖关系** | 硬编码 | 依赖注入 |

### 8.2 优势

1. **模块独立性**
   - 每个步骤独立文件，可单独测试
   - 修改一个步骤不影响其他步骤

2. **依赖可替换**
   - 通过接口定义依赖
   - 可轻松替换实现（如切换LLM提供商）

3. **配置驱动**
   - 步骤配置集中管理
   - 运行时动态调整

4. **易于扩展**
   - 新增步骤：创建新文件并注册
   - 新增功能：创建新模块

### 8.3 注意事项

1. **渐进式重构**
   - 不要一次性全部重写
   - 先重构核心模块，再逐步迁移

2. **保持向后兼容**
   - API接口保持不变
   - 旧配置能正常工作

3. **测试覆盖**
   - 每个模块独立测试
   - 集成测试验证流程

4. **文档同步**
   - 模块文档与代码同步
   - 接口注释完整
