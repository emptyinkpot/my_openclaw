/**
 * content-craft 模块入口
 * 
 * 包含文本润色和文本生成功能
 * 
 * @module content-craft
 */

// ==========================================
// 配置管理器
// ==========================================
export { ConfigManager, configManager } from './config-manager';

// ==========================================
// 润色模块
// ==========================================
export type {
  // 基础类型
  ProcessPhase,
  StepSettings,
  PolishStepConfig,
  // 替换记录
  ReplacementRecord,
  ReplacementStats,
  // 报告
  StepReport,
  ProcessReport,
  // 执行上下文
  StepContext,
  StepResult,
  // 输入输出
  PolishInput,
  PolishOutput,
  PolishProgress,
  // 设置
  PolishSettings,
  // 验证
  ValidationResult,
  TextValidator,
  // Prompt
  PromptTemplate,
  PromptBuildOptions,
} from './types';

export { PolishPipeline } from './pipeline';
export * from './steps';

// ==========================================
// 生成模块
// ==========================================
export type {
  // 基础类型
  Character,
  StoryBackground,
  Outline,
  VolumeOutline,
  ChapterOutline,
  RelatedChapter,
  // 输入输出
  GenerationInput,
  GenerationOutput,
  GenerationSettings,
  GenerationProgress,
  GenerationPhase,
  GenerationReport,
  PolishReport,
} from './generation-types';

export { GenerationPipeline } from './generation-pipeline';
