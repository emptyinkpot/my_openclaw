/**
 * 步骤注册表
 * 
 * 统一管理所有处理步骤的注册和获取
 * 
 * @module modules/polish/steps/registry
 */

import type { BaseStep, Step } from './base';
import type { ProcessPhase, PolishStepConfig } from '../types';

// 导入所有步骤
import { BannedWordsStep } from './process/banned-words';
import { PreferredWordsStep } from './process/preferred-words';
import { DetectStep } from './config/detect';
import { ProperNounCheckStep } from './config/proper-noun';
import { NarrativePerspectiveStep } from './config/narrative';
import { ClassicalApplyStep } from './config/classical';
import { CitationApplyStep } from './config/citation';
import { ParticleApplyStep } from './config/particle';
import { PunctuationApplyStep } from './config/punctuation';
import { QuoteProtectStep } from './config/quote-protect';
import { QuoteRestoreStep } from './config/quote-restore';
import { TitleExtractStep } from './config/title-extract';
import { PolishStep } from './process/polish';
import { SentencePatternsStep } from './process/sentence-patterns';
import { MemeFuseStep } from './process/meme-fuse';
import { StyleForgeStep } from './process/style-forge';
import { MarkdownCleanStep } from './postprocess/markdown-clean';
import { SemanticCheckStep } from './review/semantic';
import { WordUsageCheckStep } from './review/word-usage';
import { SmartFixStep } from './review/smart-fix';
import { FinalReviewStep } from './review/final';
import { BreathSegmentStep } from './review/breath-segment';

/**
 * 步骤注册表
 * 
 * 使用示例：
 * ```ts
 * // 初始化
 * StepRegistry.initialize();
 * 
 * // 获取步骤
 * const step = StepRegistry.get('detect');
 * 
 * // 获取所有配置阶段步骤
 * const configSteps = StepRegistry.getByPhase('config');
 * ```
 */
export class StepRegistry {
  private static steps: Map<string, BaseStep> = new Map();
  private static initialized = false;
  
  // ==========================================
  // 初始化
  // ==========================================
  
  /**
   * 初始化注册表
   * 
   * 自动注册所有步骤实例
   */
  static initialize(): void {
    if (this.initialized) return;
    
    // 注册所有真实步骤
    // config 阶段
    this.register(new DetectStep());
    this.register(new ProperNounCheckStep());
    this.register(new NarrativePerspectiveStep());
    this.register(new ClassicalApplyStep());
    this.register(new CitationApplyStep());
    this.register(new ParticleApplyStep());
    this.register(new PunctuationApplyStep());
    this.register(new QuoteProtectStep());
    this.register(new QuoteRestoreStep());
    this.register(new TitleExtractStep());
    
    // process 阶段
    this.register(new PolishStep());
    this.register(new BannedWordsStep());
    this.register(new PreferredWordsStep());
    this.register(new SentencePatternsStep());
    this.register(new MemeFuseStep());
    this.register(new StyleForgeStep());
    
    // postprocess 阶段
    this.register(new MarkdownCleanStep());
    
    // review 阶段
    this.register(new SemanticCheckStep());
    this.register(new WordUsageCheckStep());
    this.register(new SmartFixStep());
    this.register(new FinalReviewStep());
    this.register(new BreathSegmentStep());
    
    this.initialized = true;
  }
  
  /**
   * 注册步骤
   */
  static register(step: BaseStep): void {
    if (this.steps.has(step.id)) {
      console.warn(`Step "${step.id}" already registered, overwriting...`);
    }
    this.steps.set(step.id, step);
  }
  
  /**
   * 批量注册步骤
   */
  static registerAll(steps: BaseStep[]): void {
    steps.forEach(step => this.register(step));
  }
  
  // ==========================================
  // 查询方法
  // ==========================================
  
  /**
   * 获取步骤实例
   * 
   * @param id 步骤ID
   * @returns 步骤实例或undefined
   */
  static get(id: string): BaseStep | undefined {
    this.ensureInitialized();
    return this.steps.get(id);
  }
  
  /**
   * 获取步骤（带类型）
   */
  static getAs<T extends BaseStep>(id: string): T | undefined {
    return this.get(id) as T | undefined;
  }
  
  /**
   * 检查步骤是否存在
   */
  static has(id: string): boolean {
    return this.steps.has(id);
  }
  
  /**
   * 获取所有步骤
   */
  static getAll(): BaseStep[] {
    this.ensureInitialized();
    return Array.from(this.steps.values());
  }
  
  /**
   * 按阶段获取步骤
   */
  static getByPhase(phase: ProcessPhase): BaseStep[] {
    return this.getAll().filter(step => step.phase === phase);
  }
  
  /**
   * 获取所有步骤配置
   */
  static getAllConfigs(): PolishStepConfig[] {
    return this.getAll().map(step => step.getConfig());
  }
  
  /**
   * 获取固定步骤
   */
  static getFixedSteps(): BaseStep[] {
    return this.getAll().filter(step => step.fixed);
  }
  
  // ==========================================
  // 执行顺序
  // ==========================================
  
  /**
   * 获取步骤执行顺序
   * 
   * 按阶段排序，返回启用的步骤ID列表
   * 
   * @param enabledSteps 启用的步骤ID列表
   * @returns 排序后的步骤ID列表
   */
  static getExecutionOrder(enabledSteps: string[]): string[] {
    const phaseOrder: ProcessPhase[] = ['config', 'process', 'postprocess', 'review'];
    const allSteps = this.getAll();
    
    // 按阶段分组并排序
    return phaseOrder.flatMap(phase => 
      allSteps
        .filter(s => s.phase === phase && enabledSteps.includes(s.id))
        .sort((a, b) => {
          // 确保依赖在前
          if (a.dependencies.includes(b.id)) return 1;
          if (b.dependencies.includes(a.id)) return -1;
          return 0;
        })
        .map(s => s.id)
    );
  }
  
  /**
   * 验证步骤依赖
   * 
   * @param enabledSteps 启用的步骤ID列表
   * @returns 验证结果
   */
  static validateDependencies(enabledSteps: string[]): {
    valid: boolean;
    missing: Array<{ step: string; missingDeps: string[] }>;
  } {
    const missing: Array<{ step: string; missingDeps: string[] }> = [];
    
    enabledSteps.forEach(stepId => {
      const step = this.get(stepId);
      if (!step) return;
      
      const missingDeps = step.dependencies.filter(
        dep => !enabledSteps.includes(dep)
      );
      
      if (missingDeps.length > 0) {
        missing.push({ step: stepId, missingDeps });
      }
    });
    
    return {
      valid: missing.length === 0,
      missing,
    };
  }
  
  // ==========================================
  // 工具方法
  // ==========================================
  
  /**
   * 确保已初始化
   */
  private static ensureInitialized(): void {
    if (!this.initialized) {
      this.initialize();
    }
  }
  
  /**
   * 清空注册表（仅用于测试）
   */
  static clear(): void {
    this.steps.clear();
    this.initialized = false;
  }
  
  /**
   * 获取注册的步骤数量
   */
  static get size(): number {
    return this.steps.size;
  }
}

// ==========================================
// 便捷导出
// ==========================================

export const getStep = StepRegistry.get;
export const getAllSteps = StepRegistry.getAll;
export const getStepsByPhase = StepRegistry.getByPhase;
export const getExecutionOrder = StepRegistry.getExecutionOrder;
