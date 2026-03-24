/**
 * 关联章节管理器
 * 
 * 功能：
 * 1. 智能筛选与当前章节相关的关键章节
 * 2. 对长章节进行智能摘要压缩
 * 3. 结合故事状态管理器提供更完整的上下文
 * 
 * @module content-craft/related-chapters
 */

import { getDatabaseManager } from '../../database';
import { LLMClient, Config } from 'coze-coding-dev-sdk';
import { StoryStateManager, getStoryStateManager } from './story-state-manager';
import { parseStringList, safeJsonParse } from './utils/safe-parse';

// ==========================================
// 类型定义
// ==========================================

export interface RelatedChapter {
  chapterNumber: number;
  title: string;
  content: string;
  summary: string;
  relevance: number; // 相关性评分 0-1
}

export interface ChapterSummary {
  chapterNumber: number;
  title: string;
  summary: string;
  keyPoints: string[];
  characterActions: Record<string, string[]>;
}

// ==========================================
// 关联章节管理器类
// ==========================================

export class RelatedChaptersManager {
  private db = getDatabaseManager();
  private llmClient: LLMClient;
  private storyStateManager: StoryStateManager;
  private summaryCache: Map<string, ChapterSummary> = new Map();

  constructor() {
    const config = new Config();
    this.llmClient = new LLMClient(config);
    this.storyStateManager = getStoryStateManager();
  }

  /**
   * 获取智能筛选的关联章节
   * 
   * @param workId 作品ID
   * @param currentChapter 当前章节号
   * @param options 选项
   * @returns 智能筛选的关联章节列表
   */
  async getSmartRelatedChapters(
    workId: number,
    currentChapter: number,
    options: {
      maxChapters?: number;
      minRelevance?: number;
      useSummary?: boolean;
      summaryMaxLength?: number;
    } = {}
  ): Promise<RelatedChapter[]> {
    const {
      maxChapters = 5,
      minRelevance = 0.3,
      useSummary = true,
      summaryMaxLength = 500
    } = options;

    const chapters: RelatedChapter[] = [];

    // 1. 获取当前章节的细纲，了解当前要写什么
    const currentOutline = await this.db.queryOne(
      'SELECT * FROM chapter_outlines WHERE work_id = ? AND chapter_number = ?',
      [workId, currentChapter]
    );

    // 2. 获取前面所有有内容的章节
    const allPreviousChapters = await this.db.query(`
      SELECT 
        chapter_number as chapterNumber,
        title,
        content
      FROM chapters 
      WHERE work_id = ? 
        AND chapter_number < ?
        AND content IS NOT NULL
        AND LENGTH(content) > 100
      ORDER BY chapter_number DESC
    `, [workId, currentChapter]);

    if (allPreviousChapters.length === 0) {
      return [];
    }

    // 3. 计算每个章节的相关性
    const chaptersWithRelevance = await Promise.all(
      allPreviousChapters.map(async (chapter: any) => {
        const relevance = await this.calculateRelevance(
          chapter,
          currentOutline,
          workId
        );
        return { ...chapter, relevance };
      })
    );

    // 4. 按相关性排序，并筛选
    const sortedChapters = chaptersWithRelevance
      .filter(ch => ch.relevance >= minRelevance)
      .sort((a, b) => {
        // 优先按相关性排序，相关性相同时按章节号倒序
        if (b.relevance !== a.relevance) {
          return b.relevance - a.relevance;
        }
        return b.chapterNumber - a.chapterNumber;
      })
      .slice(0, maxChapters);

    // 5. 生成摘要（如果需要）
    for (const chapter of sortedChapters) {
      let summary = '';
      
      if (useSummary) {
        const chapterSummary = await this.getChapterSummary(
          workId,
          chapter.chapterNumber,
          chapter.content
        );
        summary = chapterSummary.summary;
        
        // 如果摘要太长，截取
        if (summary.length > summaryMaxLength) {
          summary = summary.slice(0, summaryMaxLength) + '...';
        }
      } else {
        // 不使用摘要，直接截取内容开头
        summary = this.simpleSummarize(chapter.content, summaryMaxLength);
      }

      chapters.push({
        chapterNumber: chapter.chapterNumber,
        title: chapter.title || '',
        content: chapter.content,
        summary,
        relevance: chapter.relevance
      });
    }

    // 6. 最后按章节号正序排列
    chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);

    return chapters;
  }

  /**
   * 获取章节摘要（带缓存）
   */
  private async getChapterSummary(
    workId: number,
    chapterNumber: number,
    content: string
  ): Promise<ChapterSummary> {
    const cacheKey = `${workId}-${chapterNumber}`;
    
    if (this.summaryCache.has(cacheKey)) {
      return this.summaryCache.get(cacheKey)!;
    }

    // 先尝试从细纲获取
    const outline = await this.db.queryOne(
      'SELECT plot_summary, main_scenes FROM chapter_outlines WHERE work_id = ? AND chapter_number = ?',
      [workId, chapterNumber]
    );

    if (outline?.plot_summary) {
      const summary: ChapterSummary = {
        chapterNumber,
        title: '',
        summary: outline.plot_summary,
        keyPoints: outline.main_scenes ? [outline.main_scenes] : [],
        characterActions: {}
      };
      this.summaryCache.set(cacheKey, summary);
      return summary;
    }

    // 使用 LLM 生成摘要
    const summary = await this.generateChapterSummary(content);
    this.summaryCache.set(cacheKey, summary);
    return summary;
  }

  /**
   * 计算章节相关性
   */
  private async calculateRelevance(
    chapter: any,
    currentOutline: any,
    workId: number
  ): Promise<number> {
    let relevance = 0;

    // 1. 时间 proximity：越近的章节相关性越高
    const chapterGap = currentOutline?.chapter_number ? 
      currentOutline.chapter_number - chapter.chapterNumber : 
      100;
    
    // 距离衰减因子：最近1章 1.0，第2章 0.8，第3章 0.6，第4章 0.4，第5章及以后 0.2
    const proximityScore = Math.max(0.2, 1.0 - (chapterGap - 1) * 0.2);
    relevance += proximityScore * 0.4;

    // 2. 人物重叠：如果章节包含当前章节要出场的人物
    if (currentOutline?.characters) {
      try {
        const currentCharacters = parseStringList(currentOutline.characters);
        const chapterContent = chapter.content.toLowerCase();
        
        let characterMatchCount = 0;
        for (const char of currentCharacters) {
          if (chapterContent.includes(char.toLowerCase())) {
            characterMatchCount++;
          }
        }
        
        if (characterMatchCount > 0) {
          const characterScore = Math.min(1.0, characterMatchCount / Math.max(1, currentCharacters.length));
          relevance += characterScore * 0.3;
        }
      } catch {}
    }

    // 3. 从故事状态中检查是否有关键事件
    try {
      const state = await this.storyStateManager.getStoryState(workId);
      const chapterEvents = state.events.filter(
        e => e.chapterNumber === chapter.chapterNumber && 
             (e.importance === 'high' || e.importance === 'critical')
      );
      
      if (chapterEvents.length > 0) {
        relevance += 0.3;
      }
    } catch {}

    return Math.min(1.0, relevance);
  }

  /**
   * 使用 LLM 生成章节摘要
   */
  private async generateChapterSummary(content: string): Promise<ChapterSummary> {
    const prompt = `请分析以下小说章节内容，生成摘要：

章节内容（前6000字）：
${content.slice(0, 6000)}

请按以下 JSON 格式返回：
{
  "summary": "章节摘要，200-400字",
  "keyPoints": ["关键点1", "关键点2", "关键点3"],
  "characterActions": {
    "角色名": ["行动1", "行动2"]
  }
}`;

    try {
      const response = await this.llmClient.invoke([
        { role: 'system', content: '你是一位专业的小说分析专家，擅长总结章节内容和提取关键点。' },
        { role: 'user', content: prompt }
      ], {
        temperature: 0.3,
        model: 'doubao-seed-1-8-251228'
      });

      const text = response.content.trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
      const parsed = safeJsonParse<any>(jsonMatch[0], { summary: '', keyPoints: [], characterActions: {} });
        return {
          chapterNumber: 0,
          title: '',
          summary: parsed.summary || this.simpleSummarize(content, 300),
          keyPoints: parsed.keyPoints || [],
          characterActions: parsed.characterActions || {}
        };
      }
    } catch (error) {
      console.warn('[RelatedChaptersManager] 生成摘要失败:', error);
    }

    // 降级到简单摘要
    return {
      chapterNumber: 0,
      title: '',
      summary: this.simpleSummarize(content, 300),
      keyPoints: [],
      characterActions: {}
    };
  }

  /**
   * 简单摘要（降级方案）
   */
  private simpleSummarize(content: string, maxLength: number): string {
    // 移除多余的空行
    const cleaned = content.replace(/\n\s*\n/g, '\n').trim();
    
    if (cleaned.length <= maxLength) {
      return cleaned;
    }

    // 取前几段
    const paragraphs = cleaned.split('\n').filter(p => p.trim().length > 0);
    let result = '';
    
    for (const para of paragraphs) {
      if (result.length + para.length > maxLength) {
        break;
      }
      result += (result ? '\n' : '') + para;
    }

    return result || cleaned.slice(0, maxLength);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.summaryCache.clear();
  }
}

// 单例实例
let relatedChaptersManagerInstance: RelatedChaptersManager | null = null;

export function getRelatedChaptersManager(): RelatedChaptersManager {
  if (!relatedChaptersManagerInstance) {
    relatedChaptersManagerInstance = new RelatedChaptersManager();
  }
  return relatedChaptersManagerInstance;
}
