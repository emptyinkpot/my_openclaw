/**
 * 文献资源 API 路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { LiteratureResource } from '@/types';

async function getClient() {
  try {
    return getSupabaseClient();
  } catch {
    return null;
  }
}

/** GET: 获取文献资源 */
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
        .from('literature_resources')
        .select('*', { count: 'exact', head: true });

      const { count: bookCount } = await client
        .from('literature_resources')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'book');

      const { count: contentCount } = await client
        .from('literature_resources')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'content');

      return NextResponse.json({
        success: true,
        stats: {
          totalCount: totalCount || 0,
          bookCount: bookCount || 0,
          contentCount: contentCount || 0,
        },
      });
    }

    const { data, error } = await client
      .from('literature_resources')
      .select('*')
      .order('priority', { ascending: false });

    if (error) {
      console.error('GET literature query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items: LiteratureResource[] = (data || []).map((entry: {
      id: number;
      type: string;
      title: string;
      content: string | null;
      author: string | null;
      preferred_authors: string[] | null;
      tags: string[] | null;
      priority: number;
      note: string | null;
      created_at: string;
      updated_at: string | null;
    }) => ({
      id: `lit-${entry.id}`,
      type: entry.type as 'content' | 'book',
      title: entry.title,
      content: entry.content || undefined,
      author: entry.author || undefined,
      preferredAuthors: entry.preferred_authors || undefined,
      tags: entry.tags || undefined,
      priority: entry.priority,
      note: entry.note || undefined,
      createdAt: new Date(entry.created_at).getTime(),
      updatedAt: entry.updated_at ? new Date(entry.updated_at).getTime() : undefined,
    }));

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error('GET literature error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST: 添加文献资源 */
export async function POST(request: NextRequest) {
  const client = await getClient();
  if (!client) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { items, type, title, content, author, preferredAuthors, tags, priority, note } = body;

    if (Array.isArray(items)) {
      const entries = items.map((item: LiteratureResource) => ({
        type: item.type || 'content',
        title: item.title,
        content: item.content || null,
        author: item.author || null,
        preferred_authors: item.preferredAuthors || null,
        tags: item.tags || null,
        priority: item.priority || 1,
        note: item.note || null,
      }));

      const { error } = await client
        .from('literature_resources')
        .insert(entries);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, added: items.length });
    }

    // 单条添加
    if (title) {
      const { error } = await client
        .from('literature_resources')
        .insert({
          type: type || 'content',
          title,
          content: content || null,
          author: author || null,
          preferred_authors: preferredAuthors || null,
          tags: tags || null,
          priority: priority || 1,
          note: note || null,
        });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('POST literature error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** PUT: 更新文献资源 */
export async function PUT(request: NextRequest) {
  const client = await getClient();
  if (!client) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { id, type, title, content, author, preferredAuthors, tags, priority, note } = body;

    const dbId = id?.replace('lit-', '');
    if (!dbId) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (type !== undefined) updateData.type = type;
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (author !== undefined) updateData.author = author;
    if (preferredAuthors !== undefined) updateData.preferred_authors = preferredAuthors;
    if (tags !== undefined) updateData.tags = tags;
    if (priority !== undefined) updateData.priority = priority;
    if (note !== undefined) updateData.note = note;

    const { error } = await client
      .from('literature_resources')
      .update(updateData)
      .eq('id', parseInt(dbId));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT literature error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** DELETE: 删除文献资源 */
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

    const dbId = id.replace('lit-', '');

    const { error } = await client
      .from('literature_resources')
      .delete()
      .eq('id', parseInt(dbId));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE literature error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
