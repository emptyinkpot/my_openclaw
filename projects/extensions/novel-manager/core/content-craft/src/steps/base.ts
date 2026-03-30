/**
 * 处理步骤基类
 * 
 * 所有处理步骤都继承此类，实现统一的接口
 * 
 * @module modules/polish/steps/base
 */

import type { 
  StepContext, 
  StepResult, 
  StepSettings,
  ProcessPhase,
  PolishStepConfig,
} from '../types';

/**
 * 处理步骤基类
 * 
 * @example
 * ```ts
 * class MyStep extends BaseStep {
 *   readonly id = 'myStep';
 *   readonly name = '我的步骤';
 *   readonly phase = 'process';
 *   
 *   async execute(context: StepContext): Promise<StepResult> {
 *     // 实现处理逻辑
 *   }
 * }
 * ```
 */
export abstract class BaseStep {
  // ==========================================
  // 步骤元信息（子类必须实现）
  // ==========================================
  
  /**
   * 步骤唯一标识
   * @example 'detect', 'properNounCheck', 'polish'
   */
  abstract readonly id: string;
  
  /**
   * 步骤显示名称
   * @example 'AI检测', '专有名词检查', '智能润色'
   */
  abstract readonly name: string;
  
  /**
   * 所属阶段
   */
  abstract readonly phase: ProcessPhase;
  
  /**
   * 步骤描述
   */
  abstract readonly description: string;
  
  // ==========================================
  // 可选配置
  // ==========================================
  
  /**
   * 是否为固定步骤（不可关闭）
   * @default false
   */
  readonly fixed: boolean = false;
  
  /**
   * 依赖的步骤ID列表
   * 这些步骤必须在当前步骤之前执行
   * @default []
   */
  readonly dependencies: string[] = [];
  
  /**
   * 默认设置
   */
  readonly defaultSettings: StepSettings = { enabled: true };
  
  /**
   * 步骤执行超时时间（毫秒）
   * @default 60000
   */
  readonly timeout: number = 60000;
  
  /**
   * 失败重试次数
   * @default 0
   */
  readonly maxRetries: number = 0;
  
  // ==========================================
  // 核心方法
  // ==========================================
  
  /**
   * 执行步骤
   * 
   * @param context 执行上下文
   * @returns 执行结果
   */
  abstract execute(context: StepContext): Promise<StepResult>;
  
  // ==========================================
  // 辅助方法
  // ==========================================
  
  /**
   * 构建该步骤的Prompt指令
   * 
   * @param settings 用户设置
   * @returns Prompt指令字符串
   */
  buildPrompt(settings: StepSettings): string {
    // 默认返回空字符串，子类可覆盖
    return '';
  }
  
  /**
   * 验证步骤是否可执行
   * 
   * @param context 执行上下文
   * @returns 是否可执行
   */
  canExecute(context: StepContext): boolean {
    // 检查依赖步骤是否已完成
    return this.dependencies.every(
      dep => context.completedSteps.includes(dep)
    );
  }
  
  /**
   * 获取步骤进度权重
   * 用于计算总体进度
   * 
   * @returns 权重值
   */
  getProgressWeight(): number {
    const weights: Record<ProcessPhase, number> = {
      config: 1,
      process: 3,
      postprocess: 1,
      review: 2,
    };
    return weights[this.phase] || 1;
  }
  
  /**
   * 获取步骤配置
   */
  getConfig(): PolishStepConfig {
    return {
      id: this.id,
      name: this.name,
      phase: this.phase,
      description: this.description,
      fixed: this.fixed,
      dependencies: this.dependencies,
      defaultSettings: this.defaultSettings,
    };
  }
  
  // ==========================================
  // 工具方法
  // ==========================================
  
  /**
   * 创建成功结果
   */
  protected createSuccessResult(
    text: string,
    modified: boolean,
    replacements: StepResult['replacements'] = [],
    reportContent: string = ''
  ): StepResult {
    return {
      text,
      modified,
      replacements,
      report: {
        step: this.name,
        report: reportContent,
        success: true,
      },
    };
  }
  
  /**
   * 创建跳过结果
   */
  protected createSkipResult(
    text: string,
    reason: string
  ): StepResult {
    return {
      text,
      modified: false,
      skipped: true,
      skipReason: reason,
      report: {
        step: this.name,
        report: `跳过: ${reason}`,
        success: true,
      },
    };
  }
  
  /**
   * 创建错误结果
   */
  protected createErrorResult(
    text: string,
    error: Error | string
  ): StepResult {
    const errorMessage = error instanceof Error ? error.message : error;
    return {
      text,
      modified: false,
      report: {
        step: this.name,
        report: `执行失败: ${errorMessage}`,
        success: false,
        error: errorMessage,
      },
    };
  }
  
  /**
   * 延迟执行
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * 安全执行（带超时和重试）
   */
  protected async safeExecute<T>(
    fn: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // 使用Promise.race实现超时
        const result = await Promise.race([
          fn(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), this.timeout)
          ),
        ]);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < retries) {
          await this.delay(1000 * (attempt + 1)); // 指数退避
        }
      }
    }
    
    throw lastError;
  }
}

/**
 * 步骤类型
 */
export type Step = BaseStep;
