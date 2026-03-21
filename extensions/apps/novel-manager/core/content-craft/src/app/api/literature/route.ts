/**
 * 文献资源 API 路由（MySQL 版本）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseManager } from '../../../../data-scan-storage/database';

/** GET: 获取文献资源 */
export async function GET(request: NextRequest) {
  const db = getDatabaseManager();
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    if (action === 'stats') {
      const totalResult = await db.queryOne('SELECT COUNT(*) as count FROM literature');
      return NextResponse.json({
        success: true,
        stats: {
          totalCount: totalResult?.count || 0,
        },
      });
    }

    const items = await db.query('SELECT * FROM literature ORDER BY priority DESC, created_at DESC');
    
    const formattedItems = items.map((item: any) => ({
      id: `lit-${item.id}`,
      type: 'content',
      title: item.title,
      content: item.content || undefined,
      author: item.author || undefined,
      tags: item.tags ? JSON.parse(item.tags) : undefined,
      priority: item.priority || 0,
      note: item.note || undefined,
      createdAt: new Date(item.created_at).getTime(),
      updatedAt: item.updated_at ? new Date(item.updated_at).getTime() : undefined,
    }));

    return NextResponse.json({ success: true, items: formattedItems });
  } catch (error) {
    console.error('GET literature error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
