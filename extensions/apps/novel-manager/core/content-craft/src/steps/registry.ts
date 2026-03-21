/**
 * 步骤注册表
 * 
 * 统一管理所有处理步骤的注册和获取
 * 
 * @module modules/polish/steps/registry
 */

import type { BaseStep, Step } from './base';
import type { ProcessPhase, PolishStepConfig } from '../types';
import { BannedWordsStep } from './process/banned-words';

// 其他步骤占位类（后续逐步实现）
class PlaceholderStep extends BaseStep {
  constructor(
    readonly id: string, 
    readonly name: string, 
    readonly phase: ProcessPhase,
    readonly description: string,
    readonly dependencies: string[] = []
  ) {
    super();
  }
  
  async execute(context: any): Promise<any> {
    // 占位实现，返回原文本
    return this.createSuccessResult(context.text, false, [], `${this.name} 步骤待实现`);
  }
}

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
    
    // 注册我们需要的步骤
    this.register(new BannedWordsStep());
    
    // 注册其他占位步骤
    // config 阶段
    this.register(new PlaceholderStep('quote-protect', '引用保护', 'config', '保护引号、书名号等内容不被修改', []));
    this.register(new PlaceholderStep('title-extract', '标题提取', 'config', '从文本中提取标题', ['quote-protect']));
    this.register(new PlaceholderStep('detect', 'AI检测', 'config', 'AI内容检测', []));
    
    // process 阶段
    this.register(new PlaceholderStep('polish', '智能润色', 'process', '调用LLM进行智能润色', ['quote-protect']));
    this.register(new PlaceholderStep('style-forge', '风格塑造', 'process', '调整文本风格', ['polish']));
    this.register(new PlaceholderStep('meme-fuse', '梗融合', 'process', '融入网络梗', []));
    this.register(new PlaceholderStep('sentence-patterns', '句式优化', 'process', '优化句式结构', []));
    
    // postprocess 阶段
    this.register(new PlaceholderStep('markdown-clean', 'Markdown清理', 'postprocess', '清理Markdown格式', []));
    
    // review 阶段
    this.register(new PlaceholderStep('breath-segment', '呼吸分段', 'review', '优化分段，提升阅读体验', []));
    this.register(new PlaceholderStep('semantic', '语义检查', 'review', '检查语义连贯性', []));
    this.register(new PlaceholderStep('word-usage', '用词检查', 'review', '检查用词准确性', []));
    this.register(new PlaceholderStep('smart-fix', '智能修复', 'review', '智能修复问题', ['semantic', 'word-usage']));
    this.register(new PlaceholderStep('final', '最终审稿', 'review', '最终审稿检查', ['smart-fix']));
    
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
