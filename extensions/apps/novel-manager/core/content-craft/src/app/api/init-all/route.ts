/**
 * 全局初始化 API
 * 初始化所有预设数据到数据库
 */

import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { PRESET_BANNED_WORDS } from '@/lib/preset-banned-words';

// 初始化状态
let isInitialized = false;

export async function GET() {
  if (isInitialized) {
    return NextResponse.json({ 
      success: true, 
      message: 'Already initialized',
      alreadyInitialized: true 
    });
  }

  let client;
  try {
    client = getSupabaseClient();
  } catch (error) {
    return NextResponse.json({ 
      error: 'Database not available',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }

  const results: Record<string, { success: boolean; count?: number; error?: string }> = {};

  try {
    // 1. 初始化禁用词
    const { count: bannedCount } = await client
      .from('banned_words')
      .select('*', { count: 'exact', head: true });

    if (!bannedCount || bannedCount === 0) {
      const bannedEntries = PRESET_BANNED_WORDS.map(item => ({
        content: item.content,
        type: item.type,
        category: item.category,
        reason: item.reason,
        alternative: item.alternative || null,
      }));

      const { error: bannedError } = await client
        .from('banned_words')
        .upsert(bannedEntries, { onConflict: 'content' });

      results.bannedWords = {
        success: !bannedError,
        count: bannedEntries.length,
        error: bannedError?.message
      };
    } else {
      results.bannedWords = { success: true, count: bannedCount };
    }

    isInitialized = true;

    return NextResponse.json({ 
      success: true, 
      results,
      message: 'Initialization completed'
    });

  } catch (error) {
    console.error('Initialization error:', error);
    return NextResponse.json({ 
      error: 'Initialization failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      results
    }, { status: 500 });
  }
}
