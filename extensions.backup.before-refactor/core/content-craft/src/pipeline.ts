/**
 * 润色处理流水线
 * 
 * 编排各处理步骤，管理执行进度，处理异常
 * 
 * @module modules/polish/pipeline
 */

import { StepRegistry } from './steps/registry';
import type { 
  PolishInput, 
  PolishOutput, 
  PolishProgress,
  PolishSettings,
  StepContext,
  ReplacementRecord,
  StepReport,
} from './types';

/**
 * 润色处理流水线
 * 
 * @example
 * ```ts
 * const pipeline = new PolishPipeline();
 * const result = await pipeline.execute({
 *   text: '待润色的文本...',
 *   settings: { steps: { ... }, global: { ... } }
 * }, (progress) => {
 *   console.log(progress.message);
 * });
 * ```
 */
export class PolishPipeline {
  
  /**
   * 从外部传入的资源（如果有）
   */
  private externalResources: {
    vocabulary?: Array<{ word: string; category: string }>;
    bannedWords?: Array<{ word: string; replacement: string }>;
    literature?: Array<{ title: string; content: string }>;
  } | null = null;
  
  /**
   * 设置外部资源
   */
  setResources(resources: {
    vocabulary?: Array<{ word: string; category: string }>;
    bannedWords?: Array<{ word: string; replacement: string }>;
    literature?: Array<{ title: string; content: string }>;
  }) {
    this.externalResources = resources;
  }
  
  /**
   * 从 MySQL 加载资源库数据（备用方法）
   */
  private async loadResourcesFromMySQL() {
    // 如果有外部资源，直接使用外部资源
    if (this.externalResources) {
      return {
        vocabulary: this.externalResources.vocabulary || [],
        bannedWords: this.externalResources.bannedWords || [],
        literature: this.externalResources.literature || [],
      };
    }
    
    // 否则返回空资源
    return { vocabulary: [], bannedWords: [], literature: [] };
  }
  
  /**
   * 执行润色处理
   * 
   * @param input 输入数据
   * @param onProgress 进度回调
   * @returns 润色结果
   */
  async execute(
    input: PolishInput, 
    onProgress?: (progress: PolishProgress) => void
  ): Promise<PolishOutput> {
    const { text, settings } = input;
    const startTime = Date.now();
    
    // ========================================
    // 1. 初始化并加载 MySQL 资源
    // ========================================
    this.reportProgress(onProgress, 0, '初始化处理环境，加载资源库...');
    
    // 从 MySQL 加载资源
    const resources = await this.loadResourcesFromMySQL();
    console.log('[PolishPipeline] 从 MySQL 加载资源完成:', {
      vocabulary: resources.vocabulary.length,
      bannedWords: resources.bannedWords.length,
      literature: resources.literature.length,
    });
    
    // 初始化步骤注册表
    StepRegistry.initialize();
    
    // ========================================
    // 2. 引用保护
    // ========================================
    const { protectedText, quoteMap } = this.protectQuotes(text);
    this.reportProgress(
      onProgress, 3, 
      `引用保护完成（${quoteMap.size} 处）`
    );
    
    // ========================================
    // 3. 获取启用的步骤
    // ========================================
    const enabledSteps = this.getEnabledSteps(settings);
    const stepOrder = StepRegistry.getExecutionOrder(enabledSteps);
    
    // 验证依赖
    const validation = StepRegistry.validateDependencies(enabledSteps);
    if (!validation.valid) {
      const missing = validation.missing
        .map(m => `${m.step} 缺少依赖: ${m.missingDeps.join(', ')}`)
        .join('; ');
      console.warn('步骤依赖验证失败:', missing);
    }
    
    this.reportProgress(
      onProgress, 5, 
      `将执行 ${stepOrder.length} 个步骤`
    );
    
    // ========================================
    // 4. 执行各步骤
    // ========================================
    const context: StepContext = {
      text: protectedText,
      settings,
      completedSteps: [],
      replacements: [],
      reports: [],
      resources,
    };
    
    let currentProgress = 5;
    const progressPerStep = 85 / stepOrder.length;
    
    for (const stepId of stepOrder) {
      const step = StepRegistry.get(stepId);
      if (!step) {
        console.warn(`Step not found: ${stepId}`);
        continue;
      }
      
      // 检查是否可执行
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
        if (result.modified && !result.skipped) {
          context.text = result.text;
          if (result.replacements) {
            context.replacements.push(...result.replacements);
          }
        }
        context.completedSteps.push(stepId);
        context.reports.push(result.report);
        
      } catch (error) {
        console.error(`Step ${stepId} failed:`, error);
        context.reports.push({
          step: step.name,
          report: `执行失败：${error instanceof Error ? error.message : '未知错误'}`,
          success: false,
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
      
      currentProgress += progressPerStep;
    }
    
    // ========================================
    // 5. 恢复引用
    // ========================================
    const finalText = this.restoreQuotes(context.text, quoteMap);
    this.reportProgress(onProgress, 92, '引用恢复完成');
    
    // ========================================
    // 6. 生成最终报告
    // ========================================
    const output: PolishOutput = {
      text: finalText,
      title: this.extractTitle(context.reports),
      replacements: context.replacements,
      reports: context.reports,
      metadata: {
        processingTime: Date.now() - startTime,
        stepsExecuted: context.completedSteps.length,
        totalSteps: stepOrder.length,
        inputWordCount: this.countWords(text),
        outputWordCount: this.countWords(finalText),
      },
    };
    
    this.reportProgress(onProgress, 100, '处理完成');
    
    return output;
  }
  
  /**
   * 验证配置
   */
  validateConfig(config: unknown): boolean {
    if (typeof config !== 'object' || config === null) return false;
    
    const c = config as PolishSettings;
    return (
      typeof c.steps === 'object' &&
      typeof c.global === 'object'
    );
  }
  
  // ==========================================
  // 私有方法
  // ==========================================
  
  /**
   * 保护引用内容
   */
  private protectQuotes(text: string): {
    protectedText: string;
    quoteMap: Map<string, string>;
  } {
    // 使用内置保护逻辑
    const quoteMap = new Map<string, string>();
    let protectedText = text;
    let counter = 0;
    
    // 保护双引号内容
    protectedText = protectedText.replace(/"([^"]+)"/g, (match) => {
      const key = `__QUOTE_${++counter}__`;
      quoteMap.set(key, match);
      return key;
    });
    
    // 保护书名号内容
    protectedText = protectedText.replace(/《([^》]+)》/g, (match) => {
      const key = `__BOOK_${++counter}__`;
      quoteMap.set(key, match);
      return key;
    });
    
    return { protectedText, quoteMap };
  }
  
  /**
   * 恢复引用内容
   */
  private restoreQuotes(text: string, map: Map<string, string>): string {
    let result = text;
    map.forEach((original, key) => {
      result = result.replace(new RegExp(key, 'g'), original);
    });
    return result;
  }
  
  /**
   * 获取启用的步骤列表
   */
  private getEnabledSteps(settings: PolishSettings): string[] {
    const steps = settings.steps || {};
    
    // 获取所有已注册的步骤
    const allSteps = StepRegistry.getAll();
    
    // 筛选启用的步骤
    return allSteps
      .filter(step => {
        const stepConfig = steps[step.id];
        // 固定步骤始终启用
        if (step.fixed) return true;
        // 否则检查配置
        return stepConfig?.enabled !== false;
      })
      .map(step => step.id);
  }
  
  /**
   * 报告进度
   */
  private reportProgress(
    callback: ((progress: PolishProgress) => void) | undefined,
    progress: number,
    message: string
  ): void {
    callback?.({ 
      progress: Math.round(progress), 
      message, 
      timestamp: Date.now() 
    });
  }
  
  /**
   * 从报告中提取标题
   */
  private extractTitle(reports: StepReport[]): string {
    const titleReport = reports.find(r => r.report.startsWith('标题:'));
    if (titleReport) {
      return titleReport.report.replace('标题:', '').trim();
    }
    return '';
  }
  
  /**
   * 统计字数
   */
  private countWords(text: string): number {
    // 中文按字数统计，英文按词数统计
    const chinese = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const english = (text.match(/[a-zA-Z]+/g) || []).length;
    return chinese + english;
  }
}
