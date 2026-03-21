/**
 * 梗资源 API 路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { ResourceItem } from '@/types';

async function getClient() {
  try {
    return getSupabaseClient();
  } catch {
    return null;
  }
}

/** GET: 获取梗资源 */
export async function GET(request: NextRequest) {
  const client = await getClient();
  if (!client) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    if (action === 'stats') {
      const { count: totalCount } = await client
        .from('memes')
        .select('*', { count: 'exact', head: true });
      
      const { count: hiddenCount } = await client
        .from('memes')
        .select('*', { count: 'exact', head: true })
        .eq('is_hidden', true);

      return NextResponse.json({
        success: true,
        stats: {
          totalCount: totalCount || 0,
          visibleCount: (totalCount || 0) - (hiddenCount || 0),
          hiddenCount: hiddenCount || 0,
        },
      });
    }

    // 获取所有可见梗资源
    const { data, error } = await client
      .from('memes')
      .select('*')
      .eq('is_hidden', false)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items: ResourceItem[] = (data || []).map((entry: {
      id: number;
      content: string;
      category: string;
      tags: string[];
      note: string | null;
      usage_example: string | null;
      created_at: string;
    }) => ({
      id: `meme-${entry.id}`,
      content: entry.content,
      type: 'meme',
      category: entry.category,
      tags: entry.tags || [],
      note: entry.note || undefined,
      usageExample: entry.usage_example || undefined,
      createdAt: new Date(entry.created_at).getTime(),
    }));

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error('GET memes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST: 添加梗资源 */
export async function POST(request: NextRequest) {
  const client = await getClient();
  if (!client) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { action, items, content, category, tags, note, usageExample } = body;

    if (action === 'add' && Array.isArray(items)) {
      const entries = items.map((item: ResourceItem) => ({
        content: item.content,
        category: item.category || '其他',
        tags: item.tags || [],
        note: item.note || null,
        usage_example: item.usageExample || null,
        is_hidden: false,
      }));

      const { error } = await client
        .from('memes')
        .upsert(entries, { onConflict: 'content' });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, added: items.length });
    }

    if (action === 'check-duplicates') {
      const contents = body.contents as string[];
      const { data, error } = await client
        .from('memes')
        .select('content')
        .in('content', contents);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const existing = new Set((data || []).map((d: { content: string }) => d.content));
      const result: Record<string, boolean> = {};
      for (const content of contents) {
        result[content] = existing.has(content);
      }

      return NextResponse.json({ success: true, duplicates: result });
    }

    // 去重操作
    if (action === 'deduplicate') {
      const { data, error } = await client
        .from('memes')
        .select('*');
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      // 按 content 去重
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
        const { error: deleteError } = await client
          .from('memes')
          .delete()
          .in('id', toDelete);
        
        if (deleteError) {
          return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }
      }
      
      return NextResponse.json({ 
        success: true, 
        removed: toDelete.length,
        message: toDelete.length > 0 ? `已删除 ${toDelete.length} 条重复梗资源` : '没有发现重复梗资源'
      });
    }

    // 单条添加
    if (content) {
      const { error } = await client
        .from('memes')
        .insert({
          content,
          category: category || '其他',
          tags: tags || [],
          note: note || null,
          usage_example: usageExample || null,
          is_hidden: false,
        });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('POST memes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** PUT: 更新梗资源 */
export async function PUT(request: NextRequest) {
  const client = await getClient();
  if (!client) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { id, content, category, tags, note, usageExample } = body;

    const dbId = id?.replace('meme-', '');
    if (!dbId) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (content !== undefined) updateData.content = content;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = tags;
    if (note !== undefined) updateData.note = note;
    if (usageExample !== undefined) updateData.usage_example = usageExample;

    const { error } = await client
      .from('memes')
      .update(updateData)
      .eq('id', parseInt(dbId));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT memes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** DELETE: 删除梗资源 */
export async function DELETE(request: NextRequest) {
  const client = await getClient();
  if (!client) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const content = searchParams.get('content');

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const dbId = id.replace('meme-', '');

    // 标记为隐藏而不是删除
    const { error } = await client
      .from('memes')
      .update({ is_hidden: true })
      .eq('id', parseInt(dbId));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE memes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
