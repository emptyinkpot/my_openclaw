/**
 * 标点规范化步骤（日式标点、括号处理）
 * 
 * 功能：
 * 1. 将中文双引号和单引号改成日式引号
 * 2. 将中文书名号改成日式书名号
 * 3. 处理小括号（禁用，要么删掉要么优化句子结构）
 * 
 * @module modules/polish/steps/config/punctuation
 */

import { BaseStep } from '../base';
import type { StepContext, StepResult, StepSettings, ReplacementRecord } from '../../types';
import { resolveContentCraftModel } from '../../utils/model-default';

// 动态导入LLM SDK用于括号处理
let LLMClient: any;
let Config: any;

try {
  const sdk = require('coze-coding-dev-sdk');
  LLMClient = sdk.LLMClient;
  Config = sdk.Config;
} catch (e) {
  console.warn('[PunctuationApplyStep] coze-coding-dev-sdk not available');
}

export class PunctuationApplyStep extends BaseStep {
  readonly id = 'punctuationApply';
  readonly name = '标点规范';
  readonly phase = 'config' as const;
  readonly description = '日式标点规范化、引号书名号转换、括号处理';
  readonly fixed = false;
  readonly dependencies = ['detect'];
  
  async execute(context: StepContext): Promise<StepResult> {
    const { text, settings, reportProgress } = context;
    const startTime = Date.now();
    const stepSettings = settings.steps[this.id] || {};
    
    if (!stepSettings.enabled) {
      return this.createSkipResult(text, '标点规范已禁用');
    }
    
    reportProgress?.('正在进行标点规范化...');
    
    try {
      let resultText = text;
      const replacements: ReplacementRecord[] = [];
      
      // ============================================
      // 1. 引号转换：中文引号 → 日式引号
      // ============================================
      reportProgress?.('正在转换引号为日式格式...');
      
      // 中文双引号 → 日式双引号 「」
      if (resultText.includes('"') || resultText.includes('“') || resultText.includes('”')) {
        let count = 0;
        resultText = resultText.replace(/"([^"]*)"/g, (match, content) => {
          count++;
          replacements.push({
            original: match,
            replaced: `「${content}」`,
            reason: '中文双引号→日式双引号',
            source: '标点规范'
          });
          return `「${content}」`;
        });
        
        // 处理中文左引号“ 和右引号 ”
        resultText = resultText.replace(/“([^”]*)”/g, (match, content) => {
          count++;
          replacements.push({
            original: match,
            replaced: `「${content}」`,
            reason: '中文双引号→日式双引号',
            source: '标点规范'
          });
          return `「${content}」`;
        });
        
        if (count > 0) {
          console.log(`[PunctuationApplyStep] 转换了 ${count} 处双引号`);
        }
      }
      
      // 中文单引号 → 日式单引号 『』
      if (resultText.includes("'") || resultText.includes('‘') || resultText.includes('’')) {
        let count = 0;
        resultText = resultText.replace(/'([^']*)'/g, (match, content) => {
          count++;
          replacements.push({
            original: match,
            replaced: `『${content}』`,
            reason: '中文单引号→日式单引号',
            source: '标点规范'
          });
          return `『${content}』`;
        });
        
        // 处理中文左单引号‘ 和右单引号 ’
        resultText = resultText.replace(/‘([^’]*)’/g, (match, content) => {
          count++;
          replacements.push({
            original: match,
            replaced: `『${content}』`,
            reason: '中文单引号→日式单引号',
            source: '标点规范'
          });
          return `『${content}』`;
        });
        
        if (count > 0) {
          console.log(`[PunctuationApplyStep] 转换了 ${count} 处单引号`);
        }
      }
      
      // ============================================
      // 2. 书名号转换：中文书名号 → 日式书名号
      // ============================================
      reportProgress?.('正在转换书名号为日式格式...');
      
      // 《》 → 〈〉
      if (resultText.includes('《') || resultText.includes('》')) {
        let count = 0;
        resultText = resultText.replace(/《([^》]*)》/g, (match, content) => {
          count++;
          replacements.push({
            original: match,
            replaced: `〈${content}〉`,
            reason: '中文书名号→日式书名号',
            source: '标点规范'
          });
          return `〈${content}〉`;
        });
        
        if (count > 0) {
          console.log(`[PunctuationApplyStep] 转换了 ${count} 处书名号`);
        }
      }
      
      // ============================================
      // 3. 禁用破折号
      // ============================================
      reportProgress?.('正在处理破折号...');
      
      const hasDashes = resultText.includes('——') || resultText.includes('—') || 
                       resultText.includes('–') || resultText.includes('-');
      
      if (hasDashes) {
        let count = 0;
        // 将各种破折号替换为逗号或句号，根据上下文
        resultText = resultText.replace(/——/g, (match) => {
          count++;
          replacements.push({
            original: match,
            replaced: '，',
            reason: '禁用破折号→逗号',
            source: '标点规范'
          });
          return '，';
        });
        
        resultText = resultText.replace(/—/g, (match) => {
          count++;
          replacements.push({
            original: match,
            replaced: '，',
            reason: '禁用破折号→逗号',
            source: '标点规范'
          });
          return '，';
        });
        
        resultText = resultText.replace(/–/g, (match) => {
          count++;
          replacements.push({
            original: match,
            replaced: '，',
            reason: '禁用破折号→逗号',
            source: '标点规范'
          });
          return '，';
        });
        
        if (count > 0) {
          console.log(`[PunctuationApplyStep] 处理了 ${count} 处破折号`);
        }
      }
      
      // ============================================
      // 4. 禁用冒号
      // ============================================
      reportProgress?.('正在处理冒号...');
      
      const hasColons = resultText.includes('：') || resultText.includes(':');
      
      if (hasColons) {
        let count = 0;
        // 将冒号替换为逗号或句号，根据上下文
        resultText = resultText.replace(/：/g, (match) => {
          count++;
          replacements.push({
            original: match,
            replaced: '，',
            reason: '禁用冒号→逗号',
            source: '标点规范'
          });
          return '，';
        });
        
        resultText = resultText.replace(/:/g, (match) => {
          count++;
          replacements.push({
            original: match,
            replaced: '，',
            reason: '禁用冒号→逗号',
            source: '标点规范'
          });
          return '，';
        });
        
        if (count > 0) {
          console.log(`[PunctuationApplyStep] 处理了 ${count} 处冒号`);
        }
      }
      
      // ============================================
      // 5. 括号处理：禁用小括号，使用LLM优化句子结构
      // ============================================
      reportProgress?.('正在处理小括号...');
      
      const hasParentheses = resultText.includes('(') || resultText.includes(')') || 
                            resultText.includes('（') || resultText.includes('）');
      
      if (hasParentheses) {
        console.log('[PunctuationApplyStep] 发现小括号，使用LLM优化句子结构...');
        
        if (LLMClient && Config) {
          const config = new Config();
          const client = new LLMClient(config);
          
          const systemPrompt = `你是一个专业的中文文本编辑专家，专门处理括号问题。

任务要求：
1. 给定一段文本，文本中可能包含小括号（）或（）
2. 你的任务是：
   - 去掉所有小括号
   - 如果括号内的内容是注释性的、补充说明性的，可以适当删除
   - 如果括号内的内容是必要的，必须将其融入句子，调整句子结构使之通顺自然
   - 不能让去除括号后的文字显得突兀或语义堆叠
   - 保持原文的整体意思不变
   - 确保整体文章逻辑通顺
   - 确保同一篇文章的修辞比喻系统成体系
   - 确保文章脉络一致且清晰
   - 确保不前言不搭后语
3. 直接返回处理后的完整文本，不要添加任何解释或说明。`;

          const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: resultText }
          ];
          
          const response = await client.invoke(messages, { 
            temperature: 0.3,
            model: resolveContentCraftModel(),
          });
          
          if (response.content !== resultText) {
            replacements.push({
              original: '(包含括号的文本)',
              replaced: '(括号处理后的文本)',
              reason: '小括号处理（LLM优化句子结构）',
              source: '标点规范+LLM智能处理'
            });
            resultText = response.content;
          }
        } else {
          // 如果LLM不可用，简单去掉括号，但记录警告
          console.warn('[PunctuationApplyStep] LLM不可用，简单去掉括号');
          const oldText = resultText;
          resultText = resultText.replace(/\([^)]*\)/g, '').replace(/（[^）]*）/g, '');
          if (resultText !== oldText) {
            replacements.push({
              original: '(包含括号的文本)',
              replaced: '(简单去掉括号)',
              reason: '小括号处理（LLM不可用，简单处理）',
              source: '标点规范'
            });
          }
        }
      }
      
      const duration = Date.now() - startTime;
      
      return {
        text: resultText,
        modified: resultText !== text,
        replacements,
        report: {
          step: this.name,
          report: `标点规范完成（${replacements.length} 处）`,
          duration,
          success: true,
        },
      };
      
    } catch (error) {
      console.error('[PunctuationApplyStep] Error:', error);
      return this.createErrorResult(text, error as Error);
    }
  }
  
  buildPrompt(settings: StepSettings): string {
    return '';
  }
}
