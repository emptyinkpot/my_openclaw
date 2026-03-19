/**
 * 经验同步到 memory-lancedb-pro
 * 
 * 职责：将 experience-manager 的结构化经验同步到 memory-lancedb-pro
 * 使 AI Agent 可以通过语义搜索找到相关经验
 * 
 * 设计原则：
 * - 单向同步：experience-manager → memory-lancedb-pro
 * - 失败不阻塞：同步失败不影响经验记录的主流程
 * - 可配置：可通过环境变量关闭同步
 */

import type { ExperienceRecord } from './ExperienceRepository';

// 配置
const MEMORY_SYNC_ENABLED = process.env.EXPERIENCE_MEMORY_SYNC !== 'false';
const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:5000';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || 'e1647cdb-1b80-4eee-a975-7599160cc89b';

// 类型定义
interface ToolExecuteResult {
  success: boolean;
  error?: string;
  results?: Array<{ text: string; score: number; metadata?: any }>;
}

/**
 * 将经验记录转换为记忆文本
 */
function experienceToMemoryText(record: ExperienceRecord): string {
  const parts = [
    `【经验记录】${record.title}`,
    ``,
    `类型: ${record.type}`,
    `难度: ${'⭐'.repeat(record.difficulty)} (${record.difficulty}/5)`,
    `标签: ${record.tags.join(', ')}`,
    ``,
    `问题描述:`,
    record.userQuery,
    ``,
    `解决方案:`,
    record.solution,
  ];

  if (record.experienceGained.length > 0) {
    parts.push(``, `获得的经验:`, ...record.experienceGained.map(e => `- ${e}`));
  }

  if (record.description) {
    parts.push(``, `详细说明:`, record.description);
  }

  return parts.join('\n');
}

/**
 * 将经验同步到 memory-lancedb-pro
 */
export async function syncExperienceToMemory(record: ExperienceRecord): Promise<boolean> {
  if (!MEMORY_SYNC_ENABLED) {
    return false;
  }

  try {
    const memoryText = experienceToMemoryText(record);
    
    // 调用 OpenClaw Gateway 的工具执行接口
    const response = await fetch(`${GATEWAY_URL}/api/tools/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        tool: 'memory_store',
        parameters: {
          text: memoryText,
          importance: Math.min(0.5 + (record.difficulty * 0.1), 1), // 难度越高，重要性越高
          category: 'fact', // 经验作为事实存储
          scope: 'experience', // 使用 experience scope
        },
        metadata: {
          source: 'experience-manager',
          experienceId: record.id,
          type: record.type,
          tags: record.tags,
        },
      }),
    });

    if (!response.ok) {
      // 如果工具执行接口不存在，尝试直接调用 memory-lancedb-pro 的内部接口
      return await syncViaPluginAPI(record, memoryText);
    }

    const result = (await response.json()) as ToolExecuteResult;
    
    if (result.success) {
      console.log(`[MemorySync] ✅ 同步经验到 memory-lancedb-pro: ${record.title}`);
      return true;
    } else {
      console.warn(`[MemorySync] ⚠️ 同步失败:`, result.error);
      return false;
    }
  } catch (error) {
    console.error(`[MemorySync] ❌ 同步异常:`, error);
    return false;
  }
}

/**
 * 通过插件 API 直接同步（备用方案）
 */
async function syncViaPluginAPI(record: ExperienceRecord, memoryText: string): Promise<boolean> {
  try {
    // 直接写入 memory-lancedb-pro 的数据目录
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const memoryDir = process.env.MEMORY_LANCEDB_PATH || '/workspace/projects/data/memory-lancedb';
    const syncFile = path.join(memoryDir, 'experience-sync.jsonl');
    
    // 追加写入同步记录
    const syncEntry = {
      id: record.id,
      text: memoryText,
      importance: Math.min(0.5 + (record.difficulty * 0.1), 1),
      category: 'fact',
      scope: 'experience',
      timestamp: record.timestamp,
      metadata: {
        source: 'experience-manager',
        experienceId: record.id,
        type: record.type,
        tags: record.tags,
      },
    };
    
    await fs.mkdir(memoryDir, { recursive: true });
    await fs.appendFile(syncFile, JSON.stringify(syncEntry) + '\n');
    
    console.log(`[MemorySync] ✅ 写入同步队列: ${record.title}`);
    return true;
  } catch (error) {
    console.error(`[MemorySync] ❌ 备用同步失败:`, error);
    return false;
  }
}

/**
 * 批量同步经验
 */
export async function syncAllExperiences(records: ExperienceRecord[]): Promise<number> {
  let successCount = 0;
  
  for (const record of records) {
    const success = await syncExperienceToMemory(record);
    if (success) successCount++;
    
    // 避免过快请求
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`[MemorySync] 批量同步完成: ${successCount}/${records.length}`);
  return successCount;
}

/**
 * 检索相关经验
 * 通过 memory-lancedb-pro 的语义搜索能力
 */
export async function searchRelatedExperiences(query: string, limit: number = 5): Promise<Array<{ text: string; score: number; metadata?: any }>> {
  if (!MEMORY_SYNC_ENABLED) {
    return [];
  }

  try {
    const response = await fetch(`${GATEWAY_URL}/api/tools/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        tool: 'memory_recall',
        parameters: {
          query,
          limit,
          scope: 'experience', // 只搜索 experience scope
        },
      }),
    });

    if (!response.ok) {
      console.warn(`[MemorySync] 搜索失败: ${response.status}`);
      return [];
    }

    const result = (await response.json()) as ToolExecuteResult;
    
    if (result.success && result.results) {
      return result.results.map((r) => ({
        text: r.text,
        score: r.score,
        metadata: r.metadata,
      }));
    }
    
    return [];
  } catch (error) {
    console.error(`[MemorySync] 搜索异常:`, error);
    return [];
  }
}

// 导出单例
export const memorySync = {
  sync: syncExperienceToMemory,
  syncAll: syncAllExperiences,
  search: searchRelatedExperiences,
  enabled: MEMORY_SYNC_ENABLED,
};
