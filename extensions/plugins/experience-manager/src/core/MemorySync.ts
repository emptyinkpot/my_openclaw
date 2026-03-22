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
 * 
 * 当前实现：由于 memory-lancedb-pro 的工具 API 不直接暴露给 HTTP，
 * 使用文件系统作为中间存储，等待后续集成语义搜索能力。
 */

import type { ExperienceRecord } from './ExperienceRepository';

// 配置
const MEMORY_SYNC_ENABLED = process.env.EXPERIENCE_MEMORY_SYNC !== 'false';

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
 * 
 * 当前实现：由于 memory-lancedb-pro 的工具 API 不直接暴露给 HTTP，
 * 我们使用文件系统作为中间存储，后续可以通过 Agent 会话调用 memory 工具
 */
export async function syncExperienceToMemory(record: ExperienceRecord): Promise<boolean> {
  if (!MEMORY_SYNC_ENABLED) {
    return false;
  }

  try {
    // 写入同步队列文件，等待后续批量导入到 memory-lancedb-pro
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const memoryText = experienceToMemoryText(record);
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
    console.error(`[MemorySync] ❌ 同步异常:`, error);
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
 * 当前实现：从同步队列文件中进行简单文本匹配
 * TODO: 集成 memory-lancedb-pro 的语义搜索能力
 */
export async function searchRelatedExperiences(query: string, limit: number = 5): Promise<Array<{ text: string; score: number; metadata?: any }>> {
  if (!MEMORY_SYNC_ENABLED) {
    return [];
  }

  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const memoryDir = process.env.MEMORY_LANCEDB_PATH || '/workspace/projects/data/memory-lancedb';
    const syncFile = path.join(memoryDir, 'experience-sync.jsonl');
    
    // 读取同步队列文件
    const content = await fs.readFile(syncFile, 'utf-8').catch(() => '');
    if (!content.trim()) {
      return [];
    }
    
    // 简单文本匹配
    const queryLower = query.toLowerCase();
    const results: Array<{ text: string; score: number; metadata?: any }> = [];
    
    for (const line of content.trim().split('\n')) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        const textLower = entry.text.toLowerCase();
        
        // 计算简单的匹配分数
        let score = 0;
        if (textLower.includes(queryLower)) {
          score = 0.8;
        } else {
          // 检查关键词匹配
          const keywords = queryLower.split(/\s+/).filter(k => k.length > 2);
          const matchedKeywords = keywords.filter(k => textLower.includes(k));
          if (matchedKeywords.length > 0) {
            score = 0.5 * (matchedKeywords.length / keywords.length);
          }
        }
        
        if (score > 0) {
          results.push({
            text: entry.text,
            score,
            metadata: entry.metadata,
          });
        }
      } catch {
        // 忽略解析错误
      }
    }
    
    // 按分数排序并返回前 limit 条
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
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
