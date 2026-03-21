/**
 * 文献资源初始化 API
 * 批量导入预设文献数据
 */

import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { PRESET_LITERATURE } from '@/lib/preset-literature';

async function getClient() {
  try {
    return getSupabaseClient();
  } catch {
    return null;
  }
}

/** POST: 初始化预设文献数据 */
export async function POST() {
  const client = await getClient();
  if (!client) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }

  try {
    // 先检查是否已有数据
    const { count: existingCount } = await client
      .from('literature_resources')
      .select('*', { count: 'exact', head: true });

    if (existingCount && existingCount > 0) {
      // 检查是否已有预设数据
      const { count: presetCount } = await client
        .from('literature_resources')
        .select('*', { count: 'exact', head: true })
        .like('id', 'lit-preset-%');

      if (presetCount && presetCount > 0) {
        return NextResponse.json({
          success: true,
          message: '预设数据已存在',
          existingCount,
          presetCount
        });
      }
    }

    // 准备预设数据 - 移除 id 和 createdAt 字段，让数据库自动生成
    const entries = PRESET_LITERATURE.map((item, index) => ({
      type: item.type || 'book',
      title: item.title,
      content: item.content || null,
      author: item.author || null,
      preferred_authors: item.preferredAuthors || null,
      tags: item.tags || null,
      priority: item.priority || 3,
      note: item.note || null,
    }));

    // 批量插入，每次插入20条避免超限
    const BATCH_SIZE = 20;
    let inserted = 0;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      const { error } = await client
        .from('literature_resources')
        .insert(batch);

      if (error) {
        console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} insert error:`, error);
        // 继续尝试下一批
      } else {
        inserted += batch.length;
      }
    }

    return NextResponse.json({
      success: true,
      message: `成功导入 ${inserted} 条预设文献`,
      total: PRESET_LITERATURE.length,
      inserted
    });
  } catch (error) {
    console.error('Init literature error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** GET: 检查初始化状态 */
export async function GET() {
  const client = await getClient();
  if (!client) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }

  try {
    const { count: totalCount } = await client
      .from('literature_resources')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      initialized: (totalCount || 0) > 0,
      totalCount: totalCount || 0,
      presetCount: PRESET_LITERATURE.length
    });
  } catch (error) {
    console.error('Check init status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
