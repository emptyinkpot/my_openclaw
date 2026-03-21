/**
 * ============================================================================
 * 句子逻辑禁用库 API 路由
 * ============================================================================
 * 
 * 核心功能：
 * 1. CRUD 操作（增删改查）
 * 2. AI智能生成原因和替换建议
 * 3. AI智能识别类似表述
 * 
 * 设计理念：
 * - 支持禁用特定的句式逻辑表达
 * - 支持多个替换建议，根据上下文选择
 * - AI 智能生成原因和替换建议
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { SentencePatternItem } from '@/types';
import { LLMClientManager, invokeLLM } from '@/lib/llm-client';

// ============================================================================
// 数据库客户端
// ============================================================================

async function getClient() {
  try {
    return getSupabaseClient();
  } catch {
    return null;
  }
}

// ============================================================================
// GET: 获取句子逻辑禁用库
// ============================================================================

export async function GET(request: NextRequest) {
  const client = await getClient();
  if (!client) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    // 获取统计信息
    if (action === 'stats') {
      const { count: totalCount } = await client
        .from('sentence_patterns')
        .select('*', { count: 'exact', head: true });

      return NextResponse.json({
        success: true,
        stats: { totalCount: totalCount || 0 },
      });
    }

    // 获取所有句子逻辑禁用项
    const { data, error } = await client
      .from('sentence_patterns')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items: SentencePatternItem[] = (data || []).map((entry: {
      id: number;
      content: string;
      similar_patterns: string | null;
      replacements: string[] | null;
      reason: string;
      created_at: string;
      updated_at: string | null;
    }) => ({
      id: `sp-${entry.id}`,
      content: entry.content,
      similarPatterns: entry.similar_patterns || undefined,
      replacements: entry.replacements || [],
      reason: entry.reason,
      createdAt: new Date(entry.created_at).getTime(),
      updatedAt: entry.updated_at ? new Date(entry.updated_at).getTime() : undefined,
    }));

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error('GET sentence_patterns error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// POST: 添加或执行操作
// ============================================================================

export async function POST(request: NextRequest) {
  const client = await getClient();
  if (!client) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { action, items, content, replacements, reason, text, contents } = body;

    // --- 去重操作（只删除完全重复的记录）---
    if (action === 'deduplicate') {
      const { data, error } = await client
        .from('sentence_patterns')
        .select('*');
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      const seen = new Map<string, number>();
      const toDelete: number[] = [];
      
      for (const entry of (data || [])) {
        if (seen.has(entry.content)) {
          toDelete.push(entry.id);
        } else {
          seen.set(entry.content, entry.id);
        }
      }
      
      if (toDelete.length > 0) {
        await client.from('sentence_patterns').delete().in('id', toDelete);
      }
      
      return NextResponse.json({ 
        success: true, 
        removed: toDelete.length,
        message: toDelete.length > 0 ? `已删除 ${toDelete.length} 条重复记录` : '没有发现重复记录'
      });
    }

    // --- 合并操作（合并相同内容的替换词）---
    if (action === 'merge') {
      const { data, error } = await client
        .from('sentence_patterns')
        .select('*')
        .order('id', { ascending: true });
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      // 按 content 分组
      const grouped = new Map<string, typeof data>();
      for (const entry of (data || [])) {
        const existing = grouped.get(entry.content);
        if (existing) {
          existing.push(entry);
        } else {
          grouped.set(entry.content, [entry]);
        }
      }
      
      const toDelete: number[] = [];
      const toUpdate: Array<{ id: number; replacements: string[] }> = [];
      let mergedCount = 0;
      
      for (const [content, entries] of grouped) {
        if (entries.length > 1) {
          // 合并所有 replacements（去重）
          const allReplacements = new Set<string>();
          for (const entry of entries) {
            const arr = entry.replacements || [];
            for (const r of arr) {
              if (r && r.trim()) allReplacements.add(r.trim());
            }
          }
          
          // 保留第一条记录，更新其 replacements
          const keepEntry = entries[0];
          const mergedReplacements = Array.from(allReplacements);
          
          toUpdate.push({ id: keepEntry.id, replacements: mergedReplacements });
          
          // 标记其他记录为删除
          for (let i = 1; i < entries.length; i++) {
            toDelete.push(entries[i].id);
          }
          
          mergedCount++;
        }
      }
      
      // 执行更新
      for (const update of toUpdate) {
        await client
          .from('sentence_patterns')
          .update({ replacements: update.replacements })
          .eq('id', update.id);
      }
      
      // 执行删除
      if (toDelete.length > 0) {
        await client.from('sentence_patterns').delete().in('id', toDelete);
      }
      
      return NextResponse.json({ 
        success: true, 
        merged: mergedCount,
        removed: toDelete.length,
        message: mergedCount > 0 
          ? `已合并 ${mergedCount} 组重复记录，删除了 ${toDelete.length} 条冗余记录`
          : '没有发现需要合并的记录'
      });
    }

    // --- AI智能生成原因和替换建议 ---
    if (action === 'ai_generate') {
      // 支持单个 content 或多个 contents
      const inputContents = contents || (content ? [content] : []);
      if (inputContents.length === 0) {
        return NextResponse.json({ error: 'Missing content(s)' }, { status: 400 });
      }

      // 获取已有数据作为风格参考
      const { data: existingData } = await client
        .from('sentence_patterns')
        .select('*')
        .limit(20);

      try {
        const llmClient = LLMClientManager.createFromRequest(request);
        
        const styleHint = existingData && existingData.length > 0
          ? `【已有禁用表述示例】
${existingData.slice(0, 10).map((e: { content: string; replacements: string[]; reason: string }) => 
  `- "${e.content}" → ${e.replacements?.join(' / ') || '无'} (${e.reason || '无原因'})`
).join('\n')}`
          : '';

        const prompt = `你是一位专业的文字编辑，擅长分析句式逻辑问题并提供改进建议。

${styleHint}

【需要分析的表述】
${inputContents.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n')}

【任务】
为每个表述生成：
1. 禁用原因：分析该表述存在什么问题（如逻辑冗余、陈词滥调、生硬过渡、表达不当等）
2. 替换建议：提供3-5个可替换的表达方式，要自然、通顺、符合中文表达习惯

【生成规则】
1. 原因要具体，指出具体问题所在
2. 替换建议要多样化，包括：
   - 简化表达
   - 更正式的说法
   - 更口语化的说法
   - 删除冗余后的简洁版本
3. 替换建议要保持原意，不能改变语义
4. 如果是过渡词/连接词问题，可以建议删除

【输出格式 - JSON数组】
[{"content":"原表述","reason":"禁用原因","replacements":["替换1","替换2","替换3"]}]

只输出JSON数组，不要解释。`;

        const response = await invokeLLM(llmClient, [{ role: 'user', content: prompt }]);
        
        let results: Array<{ content: string; reason: string; replacements: string[] }> = [];
        try {
          const jsonMatch = response.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            results = JSON.parse(jsonMatch[0]);
          }
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          return NextResponse.json({ 
            error: 'AI返回格式错误',
            message: '请重试',
          }, { status: 500 });
        }

        // 批量保存到数据库
        if (results.length > 0) {
          const entries = results.map(item => ({
            content: item.content,
            replacements: item.replacements || [],
            reason: item.reason || '',
            similar_patterns: null,
          }));

          const { error: insertError } = await client
            .from('sentence_patterns')
            .upsert(entries, { onConflict: 'content' });

          if (insertError) {
            console.error('Insert error:', insertError);
          }
        }

        return NextResponse.json({
          success: true,
          results,
          added: results.length,
        });
      } catch (llmError) {
        console.error('LLM generate error:', llmError);
        return NextResponse.json({ 
          error: 'AI生成失败',
          message: '请检查网络连接或稍后重试',
        }, { status: 500 });
      }
    }

    // --- AI智能分析文本中的问题表述 ---
    if (action === 'analyze_text') {
      if (!text) {
        return NextResponse.json({ error: 'Missing text' }, { status: 400 });
      }

      // 获取已有数据
      const { data: existingData } = await client
        .from('sentence_patterns')
        .select('*');

      try {
        const llmClient = LLMClientManager.createFromRequest(request);
        
        const existingPatterns = (existingData || []).map((e: { content: string }) => e.content);
        
        const prompt = `你是一位专业的文字编辑，擅长识别文本中的句式逻辑问题。

【已有禁用表述】
${existingPatterns.length > 0 ? existingPatterns.map(p => `- ${p}`).join('\n') : '暂无'}

【待分析文本】
${text.substring(0, 3000)}

【任务】
1. 找出文本中存在句式逻辑问题的表述
2. 这些问题可能包括：逻辑混乱、表达冗余、语义模糊、行文不畅、陈词滥调等
3. 为每个问题表述提供禁用原因和多个替换建议
4. 忽略已在禁用库中的表述

【输出格式 - JSON数组】
[{"content":"问题表述","reason":"问题原因","replacements":["替换1","替换2","替换3"]}]

只输出JSON数组，不要解释。如果没有发现问题，输出空数组 []。`;

        const response = await invokeLLM(llmClient, [{ role: 'user', content: prompt }]);
        
        let problems: Array<{ content: string; reason: string; replacements: string[] }> = [];
        try {
          const jsonMatch = response.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            problems = JSON.parse(jsonMatch[0]);
          }
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
        }

        return NextResponse.json({
          success: true,
          problems,
        });
      } catch (llmError) {
        console.error('LLM analyze text error:', llmError);
        return NextResponse.json({ 
          error: 'AI分析失败',
          message: '请检查网络连接或稍后重试',
        }, { status: 500 });
      }
    }

    // --- 批量添加 ---
    if (Array.isArray(items)) {
      const entries = items.map((item: SentencePatternItem) => ({
        content: item.content,
        similar_patterns: item.similarPatterns || null,
        replacements: item.replacements || [],
        reason: item.reason || '',
      }));

      const { error } = await client
        .from('sentence_patterns')
        .upsert(entries, { onConflict: 'content' });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, added: items.length });
    }

    // --- 单条添加 ---
    if (content) {
      const { error } = await client
        .from('sentence_patterns')
        .insert({
          content,
          similar_patterns: null,
          replacements: replacements || [],
          reason: reason || '',
        });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('POST sentence_patterns error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// PUT: 更新
// ============================================================================

export async function PUT(request: NextRequest) {
  const client = await getClient();
  if (!client) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { id, content, similarPatterns, replacements, reason } = body;

    const dbId = id?.replace('sp-', '');
    if (!dbId) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (content !== undefined) updateData.content = content;
    if (similarPatterns !== undefined) updateData.similar_patterns = similarPatterns;
    if (replacements !== undefined) updateData.replacements = replacements;
    if (reason !== undefined) updateData.reason = reason;

    const { error } = await client
      .from('sentence_patterns')
      .update(updateData)
      .eq('id', parseInt(dbId));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT sentence_patterns error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// DELETE: 删除
// ============================================================================

export async function DELETE(request: NextRequest) {
  const client = await getClient();
  if (!client) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const dbId = id?.replace('sp-', '');
    if (!dbId) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const { error } = await client
      .from('sentence_patterns')
      .delete()
      .eq('id', parseInt(dbId));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE sentence_patterns error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
