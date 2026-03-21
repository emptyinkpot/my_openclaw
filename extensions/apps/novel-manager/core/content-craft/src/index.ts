/**
 * 润色模块导出
 * 
 * @module modules/polish
 */

// 配置管理器
export { ConfigManager, configManager } from './config-manager';

// 类型
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

// 流水线
export { PolishPipeline } from './pipeline';

// 步骤
export * from './steps';
