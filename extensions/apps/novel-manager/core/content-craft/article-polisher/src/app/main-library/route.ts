/**
 * 主库 API 路由
 * 处理词汇主库的数据库操作
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { ResourceItem } from '@/types';

// ============================================================================
// 辅助函数
// ============================================================================

function dbEntryToResourceItem(entry: {
  id: number;
  original: string;
  category: string;
  is_system: boolean;
  is_hidden: boolean;
  created_at: string;
}): ResourceItem {
  return {
    id: entry.is_system ? `vocab-${entry.id}` : `user-db-${entry.id}`,
    content: entry.original,
    type: 'vocabulary',
    category: entry.category,
    createdAt: new Date(entry.created_at).getTime(),
  };
}

async function getClient() {
  try {
    return getSupabaseClient();
  } catch (error) {
    console.error('Failed to get Supabase client:', error);
    return null;
  }
}

// ============================================================================
// API 处理
// ============================================================================

/** GET: 获取主库数据 */
export async function GET(request: NextRequest) {
  const client = await getClient();
  
  if (!client) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }
  
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  try {
    if (action === 'stats') {
      // 获取统计信息
      const { count: totalCount } = await client
        .from('main_library_entries')
        .select('*', { count: 'exact', head: true });
      
      const { count: systemCount } = await client
        .from('main_library_entries')
        .select('*', { count: 'exact', head: true })
        .eq('is_system', true);
      
      const { count: hiddenSystemCount } = await client
        .from('main_library_entries')
        .select('*', { count: 'exact', head: true })
        .eq('is_system', true)
        .eq('is_hidden', true);
      
      const { count: userCount } = await client
        .from('main_library_entries')
        .select('*', { count: 'exact', head: true })
        .eq('is_system', false);
      
      return NextResponse.json({
        success: true,
        stats: {
          systemCount: systemCount || 0,
          visibleSystemCount: (systemCount || 0) - (hiddenSystemCount || 0),
          hiddenSystemCount: hiddenSystemCount || 0,
          userCount: userCount || 0,
          totalCount: totalCount || 0,
        },
      });
    }
    
    if (action === 'hidden') {
      // 获取隐藏的系统词汇
      const { data, error } = await client
        .from('main_library_entries')
        .select('*')
        .eq('is_system', true)
        .eq('is_hidden', true);
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      const items = (data || []).map(dbEntryToResourceItem);
      return NextResponse.json({ success: true, items });
    }
    
    // 默认：获取所有可见词汇
    const { data, error } = await client
      .from('main_library_entries')
      .select('*')
      .eq('is_hidden', false)
      .order('created_at', { ascending: true });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    const items = (data || []).map(dbEntryToResourceItem);
    return NextResponse.json({ success: true, items });
    
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST: 添加词汇 */
export async function POST(request: NextRequest) {
  const client = await getClient();
  
  if (!client) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }
  
  try {
    const body = await request.json();
    const { action, items, item } = body;
    
    if (action === 'add') {
      // 批量添加
      const entries = items.map((i: ResourceItem) => ({
        original: i.content,
        replacements: [],
        category: i.category || '通用',
        is_system: false,
        is_hidden: false,
      }));
      
      const { error } = await client
        .from('main_library_entries')
        .upsert(entries, { onConflict: 'original' });
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      return NextResponse.json({ success: true, added: items.length });
    }
    
    if (action === 'check-duplicates') {
      // 检查重复
      const contents = body.contents as string[];
      const { data, error } = await client
        .from('main_library_entries')
        .select('original')
        .in('original', contents);
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      const existing = new Set((data || []).map(d => d.original));
      const result: Record<string, boolean> = {};
      for (const content of contents) {
        result[content] = existing.has(content);
      }
      
      return NextResponse.json({ success: true, duplicates: result });
    }
    
    if (action === 'deduplicate') {
      // 去重
      const { data, error } = await client
        .from('main_library_entries')
        .select('*')
        .eq('is_hidden', false);
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      // 按 original 去重
      const seen = new Map<string, { id: number; is_system: boolean }>();
      const toDelete: number[] = [];
      
      for (const entry of (data || [])) {
        const existing = seen.get(entry.original);
        if (existing) {
          // 保留系统词汇，删除用户词汇
          if (entry.is_system && !existing.is_system) {
            toDelete.push(existing.id);
            seen.set(entry.original, { id: entry.id, is_system: entry.is_system });
          } else if (!entry.is_system) {
            toDelete.push(entry.id);
          }
        } else {
          seen.set(entry.original, { id: entry.id, is_system: entry.is_system });
        }
      }
      
      // 删除重复的用户词汇
      if (toDelete.length > 0) {
        const { error: deleteError } = await client
          .from('main_library_entries')
          .delete()
          .in('id', toDelete);
        
        if (deleteError) {
          return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }
      }
      
      return NextResponse.json({
        success: true,
        removed: toDelete.length,
        message: toDelete.length > 0 
          ? `成功去重，删除了 ${toDelete.length} 条重复词汇`
          : '主库中没有重复词汇',
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** PUT: 更新词汇 */
export async function PUT(request: NextRequest) {
  const client = await getClient();
  
  if (!client) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }
  
  try {
    const body = await request.json();
    const { action, id, content, category } = body;
    
    if (action === 'edit') {
      // 统一编辑，不再区分系统/用户
      const dbId = id.replace('vocab-', '').replace('user-db-', '');
      const updateData: Record<string, unknown> = {};
      if (content) updateData.original = content;
      if (category) updateData.category = category;
      
      const { error } = await client
        .from('main_library_entries')
        .update(updateData)
        .eq('id', parseInt(dbId));
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** DELETE: 删除词汇（统一删除，不区分系统/用户） */
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
    
    // 统一删除，不再区分系统词汇和用户词汇
    const dbId = id.replace('vocab-', '').replace('user-db-', '');
    const { error } = await client
      .from('main_library_entries')
      .delete()
      .eq('id', parseInt(dbId));
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
