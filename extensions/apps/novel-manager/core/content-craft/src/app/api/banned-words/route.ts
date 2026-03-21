/**
 * 禁用词 API 路由（MySQL 版本）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseManager } from '../../../../data-scan-storage/database';

/** GET: 获取禁用词 */
export async function GET(request: NextRequest) {
  const db = getDatabaseManager();
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    if (action === 'stats') {
      const totalResult = await db.queryOne('SELECT COUNT(*) as count FROM banned_words');
      return NextResponse.json({
        success: true,
        stats: { totalCount: totalResult?.count || 0 },
      });
    }

    const items = await db.query('SELECT * FROM banned_words ORDER BY created_at ASC');
    
    const formattedItems = items.map((item: any) => ({
      id: `banned-${item.id}`,
      content: item.content,
      type: item.type,
      category: item.category,
      reason: item.reason || '',
      alternative: item.alternative || undefined,
      createdAt: new Date(item.created_at).getTime(),
      updatedAt: item.updated_at ? new Date(item.updated_at).getTime() : undefined,
    }));

    return NextResponse.json({ success: true, items: formattedItems });
  } catch (error) {
    console.error('GET banned_words error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
