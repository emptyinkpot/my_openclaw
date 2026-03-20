/**
 * 梗分类 API 路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { MemeCategory } from '@/types';

async function getClient() {
  try {
    return getSupabaseClient();
  } catch {
    return null;
  }
}

/** GET: 获取梗分类 */
export async function GET() {
  const client = await getClient();
  if (!client) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }

  try {
    const { data, error } = await client
      .from('meme_categories')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items: MemeCategory[] = (data || []).map((entry: {
      id: number;
      name: string;
      description: string | null;
      usage_scenario: string | null;
      examples: string[] | null;
      created_at: string;
      updated_at: string | null;
    }) => ({
      id: `meme-cat-${entry.id}`,
      name: entry.name,
      description: entry.description || '',
      usageScenario: entry.usage_scenario || undefined,
      examples: entry.examples || undefined,
      createdAt: new Date(entry.created_at).getTime(),
      updatedAt: entry.updated_at ? new Date(entry.updated_at).getTime() : undefined,
    }));

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error('GET meme_categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST: 添加梗分类 */
export async function POST(request: NextRequest) {
  const client = await getClient();
  if (!client) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { items, name, description, usageScenario, examples } = body;

    if (Array.isArray(items)) {
      const entries = items.map((item: MemeCategory) => ({
        name: item.name,
        description: item.description || null,
        usage_scenario: item.usageScenario || null,
        examples: item.examples || null,
      }));

      const { error } = await client
        .from('meme_categories')
        .upsert(entries, { onConflict: 'name' });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, added: items.length });
    }

    // 单条添加
    if (name) {
      const { error } = await client
        .from('meme_categories')
        .insert({
          name,
          description: description || null,
          usage_scenario: usageScenario || null,
          examples: examples || null,
        });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('POST meme_categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** PUT: 更新梗分类 */
export async function PUT(request: NextRequest) {
  const client = await getClient();
  if (!client) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { id, name, description, usageScenario, examples } = body;

    const dbId = id?.replace('meme-cat-', '');
    if (!dbId) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (usageScenario !== undefined) updateData.usage_scenario = usageScenario;
    if (examples !== undefined) updateData.examples = examples;

    const { error } = await client
      .from('meme_categories')
      .update(updateData)
      .eq('id', parseInt(dbId));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT meme_categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** DELETE: 删除梗分类 */
export async function DELETE(request: NextRequest) {
  const client = await getClient();
  if (!client) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const dbId = id.replace('meme-cat-', '');

    const { error } = await client
      .from('meme_categories')
      .delete()
      .eq('id', parseInt(dbId));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE meme_categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
