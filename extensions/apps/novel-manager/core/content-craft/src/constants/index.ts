/**
 * ============================================================================
 * 常量配置集中导出
 * ============================================================================
 */

export * from './ai-models';
export * from './perspectives';
export * from './particles';

// 统一处理步骤系统
export {
  STEP_DEFINITIONS,
  STEP_PHASES,
  DEFAULT_STEP_ORDER,
  createDefaultSteps,
  getStepPhase,
  getStepsByPhase,
  getStepDependency,
  migrateLegacySteps,
  migrateLegacyStepOrder,
  LEGACY_STEP_MAPPING,
} from './processing-steps';
