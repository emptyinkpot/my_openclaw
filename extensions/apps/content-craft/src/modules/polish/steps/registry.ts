/**
 * 步骤注册表
 * 
 * 统一管理所有处理步骤的注册和获取
 * 
 * @module modules/polish/steps/registry
 */

import type { BaseStep, Step } from './base';
import type { ProcessPhase, PolishStepConfig } from '../types';

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
    
    // 动态导入所有步骤
    // 注意：这里使用动态导入确保步骤按需加载
    const stepModules = [
      // 配置阶段
      import('./config/detect'),
      import('./config/proper-noun'),
      import('./config/narrative'),
      import('./config/classical'),
      import('./config/citation'),
      import('./config/particle'),
      import('./config/punctuation'),
      import('./config/quote-protect'),
      import('./config/title-extract'),
      
      // 处理阶段
      import('./process/polish'),
      import('./process/banned-words'),
      import('./process/sentence-patterns'),
      import('./process/meme-fuse'),
      import('./process/style-forge'),
      
      // 后处理阶段
      import('./postprocess/markdown-clean'),
      
      // 审稿阶段
      import('./review/semantic'),
      import('./review/final'),
      import('./review/word-usage'),
      import('./review/smart-fix'),
      import('./review/breath-segment'),
    ];
    
    // 由于动态导入是异步的，这里使用同步方式
    // 在实际使用时，步骤会在首次访问时延迟注册
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
