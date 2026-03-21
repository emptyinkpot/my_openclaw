/**
 * ============================================================================
 * 禁用词 API 路由
 * ============================================================================
 * 
 * 核心功能：
 * 1. CRUD 操作（增删改查）
 * 2. AI智能生成替换词 - 根据用户已有替换词风格学习并生成
 * 
 * 设计理念：
 * - 不依赖硬编码的映射规则
 * - AI学习用户的风格偏好
 * - 智能生成替换词
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { BannedWordItem } from '@/types';
import { identifyMetaphorType } from '@/lib/banned-word-replacement';
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
// GET: 获取禁用词
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
        .from('banned_words')
        .select('*', { count: 'exact', head: true });

      const { data: typeData } = await client
        .from('banned_words')
        .select('type');

      const typeStats: Record<string, number> = {};
      (typeData || []).forEach((item: { type: string }) => {
        typeStats[item.type] = (typeStats[item.type] || 0) + 1;
      });

      return NextResponse.json({
        success: true,
        stats: { totalCount: totalCount || 0, typeStats },
      });
    }

    // 获取所有禁用词
    const { data, error } = await client
      .from('banned_words')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items: BannedWordItem[] = (data || []).map((entry: {
      id: number;
      content: string;
      type: string;
      category: string;
      reason: string | null;
      alternative: string | null;
      created_at: string;
      updated_at: string | null;
    }) => ({
      id: `banned-${entry.id}`,
      content: entry.content,
      type: entry.type as BannedWordItem['type'],
      category: entry.category,
      reason: entry.reason || '',
      alternative: entry.alternative || undefined,
      createdAt: new Date(entry.created_at).getTime(),
      updatedAt: entry.updated_at ? new Date(entry.updated_at).getTime() : undefined,
    }));

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error('GET banned_words error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// POST: 添加禁用词或执行操作
// ============================================================================

export async function POST(request: NextRequest) {
  const client = await getClient();
  if (!client) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { action, items, content, type, category, reason, alternative } = body;

    // --- 去重操作 ---
    if (action === 'deduplicate') {
      const { data, error } = await client
        .from('banned_words')
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
        await client.from('banned_words').delete().in('id', toDelete);
      }
      
      return NextResponse.json({ 
        success: true, 
        removed: toDelete.length,
        message: toDelete.length > 0 ? `已删除 ${toDelete.length} 条重复禁用词` : '没有发现重复禁用词'
      });
    }

    // --- AI智能生成替换词 ---
    if (action === 'batch_generate_with_llm') {
      const { data, error } = await client
        .from('banned_words')
        .select('*');
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      // 收集已有的替换词作为风格样本
      const styleSamples = (data || [])
        .filter((entry: { alternative: string | null }) => entry.alternative)
        .map((entry: { content: string; alternative: string }) => ({
          original: entry.content,
          replacement: entry.alternative,
        }))
        .slice(0, 30);
      
      // 需要生成替换词的禁用词
      const toGenerate = (data || []).filter((entry: { alternative: string | null }) => !entry.alternative);
      
      if (toGenerate.length === 0) {
        return NextResponse.json({
          success: true,
          updated: 0,
          message: '所有禁用词已有替换词',
        });
      }
      
      let updated = 0;
      const results: Array<{ content: string; alternative: string; metaphorType: string }> = [];
      
      try {
        const llmClient = LLMClientManager.createFromRequest(request);
        
        // 构建风格学习Prompt
        const stylePrompt = styleSamples.length > 0 
          ? `【用户风格样本 - 请学习这种替换风格】
${styleSamples.map(s => `"${s.original}" → "${s.replacement}"`).join('\n')}

请分析上述替换词的风格特点，然后按照相同的风格为新禁用词生成替换词。`
          : `请为以下禁用词生成典雅、自然的替换词。`;

        const batchPrompt = `${stylePrompt}

【需要生成替换词的禁用词】
${toGenerate.map((e: { content: string }) => `- ${e.content}`).join('\n')}

【生成规则】
1. 替换词必须自然、通顺，不要生硬
2. 替换词要符合上下文语境
3. 如果禁用词是比喻，替换词也要是比喻，但类型要改变
4. 禁止使用"天意""天命""神明"等宗教色彩词汇
5. 如果找不到合适的替换，输出"保留原词"

【输出格式 - JSON数组】
[{"word":"禁用词","replacement":"替换词"}]

只输出JSON，不要解释。`;

        const response = await invokeLLM(llmClient, [{ role: 'user', content: batchPrompt }]);
        
        // 解析JSON
        let replacements: Array<{ word: string; replacement: string }> = [];
        try {
          const jsonMatch = response.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            replacements = JSON.parse(jsonMatch[0]);
          }
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
        }
        
        // 更新数据库
        for (const item of replacements) {
          if (item.word && item.replacement && item.replacement !== '保留原词') {
            const entry = toGenerate.find((e: { content: string }) => e.content === item.word);
            if (entry) {
              const { error: updateError } = await client
                .from('banned_words')
                .update({ alternative: item.replacement })
                .eq('id', (entry as { id: number }).id);
              
              if (!updateError) {
                updated++;
                results.push({
                  content: item.word,
                  alternative: item.replacement,
                  metaphorType: identifyMetaphorType(item.word),
                });
              }
            }
          }
        }
      } catch (llmError) {
        console.error('LLM batch generation error:', llmError);
        return NextResponse.json({ 
          error: 'LLM生成失败',
          message: '请检查网络连接或稍后重试',
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        updated,
        results,
        message: `已为 ${updated} 条禁用词智能生成替换词`,
      });
    }

    // --- 批量添加禁用词 ---
    if (Array.isArray(items)) {
      const entries = items.map((item: BannedWordItem) => ({
        content: item.content,
        type: item.type || 'modern',
        category: item.category || '现代词汇',
        reason: item.reason || null,
        alternative: item.alternative || null,
      }));

      const { error } = await client
        .from('banned_words')
        .upsert(entries, { onConflict: 'content' });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, added: items.length });
    }

    // --- 单条添加 ---
    if (content) {
      const { error } = await client
        .from('banned_words')
        .insert({
          content,
          type: type || 'modern',
          category: category || '现代词汇',
          reason: reason || null,
          alternative: alternative || null,
        });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('POST banned_words error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// PUT: 更新禁用词
// ============================================================================

export async function PUT(request: NextRequest) {
  const client = await getClient();
  if (!client) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { id, content, type, category, reason, alternative } = body;

    const dbId = id?.replace('banned-', '');
    if (!dbId) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (content !== undefined) updateData.content = content;
    if (type !== undefined) updateData.type = type;
    if (category !== undefined) updateData.category = category;
    if (reason !== undefined) updateData.reason = reason;
    if (alternative !== undefined) updateData.alternative = alternative;

    const { error } = await client
      .from('banned_words')
      .update(updateData)
      .eq('id', parseInt(dbId));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT banned_words error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// DELETE: 删除禁用词
// ============================================================================

export async function DELETE(request: NextRequest) {
  const client = await getClient();
  if (!client) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const dbId = id?.replace('banned-', '');
    if (!dbId) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const { error } = await client
      .from('banned_words')
      .delete()
      .eq('id', parseInt(dbId));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE banned_words error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
