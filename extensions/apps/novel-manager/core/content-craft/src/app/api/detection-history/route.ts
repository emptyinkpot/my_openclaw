import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// 类型定义
// ============================================================================

interface DetectionRecord {
  id: string;
  textHash: string;
  textLength: number;
  score: number;
  features: Record<string, number>;
  suggestions: string[];
  timestamp: string;
  userId?: string;
  metadata?: {
    source?: string;
    optimized?: boolean;
    originalScore?: number;
    improvement?: number;
  };
}

// ============================================================================
// 内存存储 (生产环境应使用数据库)
// ============================================================================

// 使用全局变量存储记录（开发环境）
// 注意：生产环境应使用数据库持久化
const globalForHistory = global as unknown as { 
  detectionHistory: DetectionRecord[] | undefined;
};

const history: DetectionRecord[] = globalForHistory.detectionHistory || [];

if (!globalForHistory.detectionHistory) {
  globalForHistory.detectionHistory = history;
}

// 生成唯一ID
function generateId(): string {
  return `det_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 生成文本哈希（用于匿名化）
function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// ============================================================================
// GET: 获取历史记录
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const source = searchParams.get('source');

    let filteredHistory = [...history];
    
    // 按来源过滤
    if (source) {
      filteredHistory = filteredHistory.filter(r => r.metadata?.source === source);
    }

    // 按时间倒序排列
    filteredHistory.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // 分页
    const paginatedHistory = filteredHistory.slice(offset, offset + limit);

    // 统计信息
    const stats = {
      total: history.length,
      avgScore: history.length > 0 
        ? Math.round(history.reduce((sum, r) => sum + r.score, 0) / history.length)
        : 0,
      highRisk: history.filter(r => r.score >= 70).length,
      mediumRisk: history.filter(r => r.score >= 55 && r.score < 70).length,
      lowRisk: history.filter(r => r.score < 55).length,
      improvements: history.filter(r => r.metadata?.improvement && r.metadata.improvement > 0).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        records: paginatedHistory,
        stats,
        pagination: {
          total: filteredHistory.length,
          limit,
          offset,
          hasMore: offset + limit < filteredHistory.length,
        },
      },
    });
  } catch (error) {
    console.error('获取检测历史失败:', error);
    return NextResponse.json(
      { error: '获取历史记录失败' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST: 保存检测记录
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      text, 
      score, 
      features, 
      suggestions,
      source,
      originalScore,
    } = body;

    if (!text || typeof score !== 'number') {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 创建记录
    const record: DetectionRecord = {
      id: generateId(),
      textHash: hashText(text),
      textLength: text.length,
      score,
      features: features || {},
      suggestions: suggestions || [],
      timestamp: new Date().toISOString(),
      metadata: {
        source,
        optimized: originalScore !== undefined && originalScore !== score,
        originalScore,
        improvement: originalScore !== undefined ? originalScore - score : undefined,
      },
    };

    // 添加到历史记录
    history.unshift(record);

    // 限制历史记录数量
    if (history.length > 1000) {
      history.pop();
    }

    return NextResponse.json({
      success: true,
      data: {
        id: record.id,
        timestamp: record.timestamp,
      },
    });
  } catch (error) {
    console.error('保存检测记录失败:', error);
    return NextResponse.json(
      { error: '保存记录失败' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE: 清空历史记录
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // 删除特定记录
      const index = history.findIndex(r => r.id === id);
      if (index !== -1) {
        history.splice(index, 1);
      }
    } else {
      // 清空所有记录
      history.length = 0;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除检测记录失败:', error);
    return NextResponse.json(
      { error: '删除记录失败' },
      { status: 500 }
    );
  }
}
