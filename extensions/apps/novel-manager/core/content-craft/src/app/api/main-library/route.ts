/**
 * 主库 API 路由（MySQL 版本）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseManager } from '../../../../data-scan-storage/database';

// ============================================================================
// API 处理
// ============================================================================

/** GET: 获取主库数据 */
export async function GET(request: NextRequest) {
  const db = getDatabaseManager();
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  try {
    if (action === 'stats') {
      // 获取统计信息
      const totalResult = await db.queryOne('SELECT COUNT(*) as count FROM vocabulary');
      return NextResponse.json({
        success: true,
        stats: {
          totalCount: totalResult?.count || 0,
        },
      });
    }
    
    // 默认：获取所有可见词汇
    const items = await db.query('SELECT * FROM vocabulary ORDER BY created_at ASC');
    
    // 转换格式
    const formattedItems = items.map((item: any) => ({
      id: `vocab-${item.id}`,
      content: item.content,
      type: item.type,
      category: item.category,
      createdAt: new Date(item.created_at).getTime(),
    }));
    
    return NextResponse.json({ success: true, items: formattedItems });
    
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
