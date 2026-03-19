/**
 * 小说管理模块 - 统一入口
 * 
 * @module novel-manager
 * @version 3.0.0
 * 
 * 架构说明：
 * - core/      核心业务逻辑（配置、数据库、流水线）
 * - services/  业务服务层
 * - utils/     工具函数
 * - dist/      编译产物（被 extensions/novel-manager 调用）
 */

// ============ 配置 ============
export { config, loadConfig, reloadConfig, saveConfig, getConfig, type ModuleConfig } from './core/config';

// ============ 数据库 ============
export {
  DatabaseManager,
  SqliteManager,
  getDatabaseManager,
  withTransaction,
  type QueryResult
} from './core/database';

// ============ 流水线 ============
export {
  ContentPipeline,
  type PipelineOptions,
  type TaskResult,
  type PipelineTask,
  type PipelineProgressEvent,
  type PipelineStep,
} from './core/ContentPipeline';

// ============ 流水线组件 ============
export { StateService, type PipelineState, type DailyStats, type EfficiencyReport } from './core/pipeline/StateService';
export { TaskMonitor, type ErrorAnalysis, type FailureRecord } from './core/pipeline/TaskMonitor';
export { PolishFeatureDetector, type PolishFeatures, type ValidationRules } from './core/pipeline/PolishFeatureDetector';
export { ContentValidator, cleanContentEnhanced, type ContentIssue, type ValidationResult } from './core/pipeline/ContentValidator';
export { PublishService, type PublishOptions, type PublishResult, type PlatformConfig } from './core/pipeline/PublishService';
export { FanqiePublisher, type FanqieAccount, type ChapterToPublish } from './core/pipeline/FanqiePublisher';
export { FanqieScanner, getFanqieScanner, type ScanResult, type ScannedWork, type ScanProgress, type ScanOptions } from './core/pipeline/FanqieScanner';
export { AuditService, type AuditStatus, type SuggestedAction, type AuditIssue, type AuditResult, type ChapterAuditStatus, type AuditConfig } from './core/pipeline/AuditService';
export { ChapterRepository, getChapterRepository, type ChapterData } from './core/pipeline/ChapterRepository';

// ============ 服务层 ============
export { NovelService } from './services/novel-service';
export { AIService } from './services/ai-service';
export { FanqieSyncService } from './services/fanqie-sync-service';

// ============ 工具函数 ============
export { delay, retry } from './utils/helpers';
export { logger, type LogLevel } from './utils/logger';
export { chineseToNumber, extractChapterNumber } from './core/utils/text';

// ============ 兼容旧名称 ============
export { ContentPipeline as PolishScheduler } from './core/ContentPipeline';
export { AuditService as AuditScheduler } from './core/pipeline/AuditService';
