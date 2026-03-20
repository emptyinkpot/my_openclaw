/**
 * 主库初始化 API
 * 将预设词汇库插入到 Supabase 数据库
 */

import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { PRESET_VOCABULARY } from '@/lib/preset-vocabulary';

// 标记是否已初始化
let isInitialized = false;

export async function GET() {
  // 避免重复初始化
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
  
  try {
    // 检查数据库是否已有数据
    const { count } = await client
      .from('main_library_entries')
      .select('*', { count: 'exact', head: true });
    
    if (count && count > 0) {
      isInitialized = true;
      return NextResponse.json({ 
        success: true, 
        message: 'Database already has data',
        existingCount: count,
        alreadyInitialized: true 
      });
    }
    
    // 准备预设词汇数据（先去重）
    const uniqueEntries: Map<string, { original: string; replacements: string[]; category: string; is_system: boolean; is_hidden: boolean }> = new Map();
    for (const item of PRESET_VOCABULARY) {
      if (!uniqueEntries.has(item.content)) {
        uniqueEntries.set(item.content, {
          original: item.content,
          replacements: [],
          category: item.category || '通用',
          is_system: true,
          is_hidden: false,
        });
      }
    }
    
    const entries: Array<{ original: string; replacements: string[]; category: string; is_system: boolean; is_hidden: boolean }> = Array.from(uniqueEntries.values());
    console.log(`[Init] Unique entries: ${entries.length} (removed ${PRESET_VOCABULARY.length - entries.length} duplicates)`);
    
    // 分批插入，每批500条
    const batchSize = 500;
    let inserted = 0;
    
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      
      const { error } = await client
        .from('main_library_entries')
        .upsert(batch, { onConflict: 'original' });
      
      if (error) {
        console.error('Batch insert error:', error);
        return NextResponse.json({ 
          error: 'Failed to insert batch',
          details: error.message,
          insertedSoFar: inserted
        }, { status: 500 });
      }
      
      inserted += batch.length;
    }
    
    isInitialized = true;
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully initialized ${inserted} entries`,
      totalInserted: inserted
    });
    
  } catch (error) {
    console.error('Initialization error:', error);
    return NextResponse.json({ 
      error: 'Initialization failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
