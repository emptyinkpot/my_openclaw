/**
 * 步骤模块导出
 * 
 * @module modules/polish/steps
 */

// 基类
export { BaseStep } from './base';
export type { Step } from './base';

// 注册表
export { 
  StepRegistry, 
  getStep, 
  getAllSteps, 
  getStepsByPhase, 
  getExecutionOrder 
} from './registry';

// 配置阶段步骤
export { DetectStep } from './config/detect';
export { ProperNounCheckStep } from './config/proper-noun';
export { NarrativePerspectiveStep } from './config/narrative';
export { ClassicalApplyStep } from './config/classical';
export { CitationApplyStep } from './config/citation';
export { ParticleApplyStep } from './config/particle';
export { PunctuationApplyStep } from './config/punctuation';
export { QuoteProtectStep } from './config/quote-protect';
export { TitleExtractStep } from './config/title-extract';

// 处理阶段步骤
export { PolishStep } from './process/polish';
export { BannedWordsStep } from './process/banned-words';
export { SentencePatternsStep } from './process/sentence-patterns';
export { MemeFuseStep } from './process/meme-fuse';
export { StyleForgeStep } from './process/style-forge';

// 后处理阶段步骤
export { MarkdownCleanStep } from './postprocess/markdown-clean';

// 审稿阶段步骤
export { SemanticCheckStep } from './review/semantic';
export { FinalReviewStep } from './review/final';
export { WordUsageCheckStep } from './review/word-usage';
export { SmartFixStep } from './review/smart-fix';
export { BreathSegmentStep } from './review/breath-segment';
