/**
 * ============================================================================
 * 词汇辅助 API（合并优化版）
 * ============================================================================
 * 
 * 合并了原来的 vocabulary-analyze 和 vocabulary-associate 两个 API
 * 
 * 功能：
 * 1. associate - 根据已有词汇风格，联想生成新词汇
 * 2. analyze_mapping - 分析词汇库，建立"普通表达→高级词汇"的映射关系
 * 3. find_replacements - 分析原文，找出可替换位置
 */

import { NextRequest, NextResponse } from 'next/server';
import { LLMClientManager, invokeLLM } from '@/lib/llm-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, vocabulary, existingWords, text, count = 20 } = body;
    
    const llmClient = LLMClientManager.createFromRequest(request);
    
    // ========== 联想生成新词汇 ==========
    if (action === 'associate') {
      const words = existingWords || vocabulary;
      if (!words || words.length < 5) {
        return NextResponse.json({
          success: false,
          error: '请先添加至少5个词汇，AI才能学习您的风格',
        });
      }
      
      const styleSamples = words.slice(0, 50);
      
      const prompt = `分析用户词汇风格，生成同风格新词汇。

【已有词汇】
${styleSamples.join('、')}

【要求】
1. 分析风格（古典/现代、典雅/通俗、主题）
2. 生成 ${count} 个同风格新词汇
3. 不重复已有词汇
4. 有实际使用价值

【输出格式】JSON数组
["词汇1", "词汇2", ...]`;

      const response = await invokeLLM(llmClient, [{ role: 'user', content: prompt }], { temperature: 0.7 });
      
      let newWords: string[] = [];
      try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          newWords = JSON.parse(jsonMatch[0]);
        }
      } catch {
        newWords = response.split(/[,，、\n]/).map(w => w.replace(/["\[\]]/g, '').trim()).filter(w => w && w.length >= 2 && w.length <= 10);
      }
      
      const existingSet = new Set(words);
      const uniqueNewWords = newWords.filter(w => !existingSet.has(w));
      
      return NextResponse.json({
        success: true,
        words: uniqueNewWords.slice(0, count),
        analyzedStyle: '已根据您的词汇风格生成',
      });
    }
    
    // ========== 分析映射关系 ==========
    if (action === 'analyze_mapping') {
      if (!vocabulary || vocabulary.length === 0) {
        return NextResponse.json({ success: false, error: '请提供词汇库' });
      }
      
      const vocabList = vocabulary.slice(0, 50);
      
      const prompt = `分析高级词汇，建立"普通表达→高级词汇"映射。

【高级词汇】
${vocabList.join('、')}

【要求】
1. 分析每个高级词汇可替换的普通表达
2. 确保语义对应

【输出格式】JSON数组
[{"common": "命运", "advanced": ["天命"]}, ...]`;

      const response = await invokeLLM(llmClient, [{ role: 'user', content: prompt }]);
      
      let mappings: Array<{ common: string; advanced: string[] }> = [];
      try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          mappings = JSON.parse(jsonMatch[0]);
        }
      } catch {
        console.error('JSON parse error');
      }
      
      return NextResponse.json({ success: true, mappings, count: mappings.length });
    }
    
    // ========== 分析原文找出可替换位置 ==========
    if (action === 'find_replacements') {
      if (!vocabulary || vocabulary.length === 0 || !text) {
        return NextResponse.json({ success: false, error: '请提供词汇库和原文' });
      }
      
      const vocabList = vocabulary.slice(0, 50);
      
      const prompt = `分析原文，找出可用高级词汇替换的位置。

【高级词汇】
${vocabList.join('、')}

【原文】
${text.slice(0, 2000)}

【输出格式】JSON数组
[{"original": "命运", "position": "第3段", "replacements": ["天命"]}, ...]
无则输出 []`;

      const response = await invokeLLM(llmClient, [{ role: 'user', content: prompt }]);
      
      let opportunities: Array<{ original: string; position: string; replacements: string[] }> = [];
      try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          opportunities = JSON.parse(jsonMatch[0]);
        }
      } catch {
        console.error('JSON parse error');
      }
      
      return NextResponse.json({ success: true, opportunities, count: opportunities.length });
    }
    
    return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    
  } catch (error) {
    console.error('Vocabulary assist error:', error);
    return NextResponse.json({
      success: false,
      error: 'AI处理失败，请稍后重试',
    }, { status: 500 });
  }
}
