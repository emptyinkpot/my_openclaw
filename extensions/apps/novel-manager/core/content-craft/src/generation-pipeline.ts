/**
 * 文本生成流水线
 * 
 * 根据大纲、细纲、人物设定、故事背景生成文本，支持关联前面章节内容
 * 
 * @module modules/generation/pipeline
 */

import { LLMClient, Config } from 'coze-coding-dev-sdk';
import { getDatabaseManager } from '../../data-scan-storage/database';
import type { 
  GenerationInput, 
  GenerationOutput, 
  GenerationProgress,
  GenerationPhase,
  Character,
  StoryBackground,
  ChapterOutline,
  RelatedChapter,
  GenerationSettings,
} from './generation-types';
import { PolishPipeline } from './pipeline';
import type { PolishInput, PolishSettings } from './types';

/**
 * 从数据库生成的输入参数
 */
export interface GenerateFromDbInput {
  /** 作品 ID */
  workId: number;
  /** 要生成的章节号 */
  chapterNumber: number;
  /** 关联章节数量（默认 2） */
  relatedChapterCount?: number;
  /** 生成设置（可选，使用默认值） */
  settings?: GenerationSettings;
}

/**
 * 文本生成流水线
 * 
 * @example
 * ```ts
 * const generator = new GenerationPipeline();
 * // 方式1：直接传入所有数据
 * const result1 = await generator.generate({
 *   chapterOutline: { ... },
 *   characters: [ ... ],
 *   background: { ... },
 *   relatedChapters: [ ... ],
 *   settings: { ... }
 * });
 * 
 * // 方式2：从数据库读取（推荐）
 * const result2 = await generator.generateFromDatabase({
 *   workId: 1,
 *   chapterNumber: 90,
 *   relatedChapterCount: 2
 * });
 * ```
 */
export class GenerationPipeline {
  private llmClient: LLMClient;
  private db = getDatabaseManager();

  constructor() {
    const config = new Config();
    this.llmClient = new LLMClient(config);
  }

  /**
   * 从数据库读取数据并生成文本
   * 
   * @param input 数据库生成输入
   * @param onProgress 进度回调
   * @returns 生成输出
   */
  async generateFromDatabase(
    input: GenerateFromDbInput,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<GenerationOutput> {
    const { workId, chapterNumber, relatedChapterCount = 2, settings } = input;

    this.reportProgress(onProgress, 'preparing', 2, '正在从数据库读取数据...');

    // ========================================
    // 1. 读取作品基本信息
    // ========================================
    const work = await this.db.queryOne('SELECT * FROM works WHERE id = ?', [workId]);
    if (!work) {
      throw new Error(`未找到作品，workId: ${workId}`);
    }

    // ========================================
    // 2. 读取人物设定
    // ========================================
    this.reportProgress(onProgress, 'preparing', 5, '正在读取人物设定...');
    const characters = await this.db.query('SELECT * FROM characters WHERE work_id = ?', [workId]);
    const formattedCharacters: Character[] = characters.map((char: any) => ({
      id: char.id.toString(),
      name: char.name,
      aliases: char.aliases ? JSON.parse(char.aliases) : [],
      description: char.description || '',
      personality: char.personality ? JSON.parse(char.personality) : [],
      appearance: char.appearance || '',
      background: char.background || '',
      relationships: char.relationships ? JSON.parse(char.relationships) : []
    }));

    // ========================================
    // 3. 读取故事背景
    // ========================================
    this.reportProgress(onProgress, 'preparing', 8, '正在读取故事背景...');
    const background = await this.db.queryOne(
      'SELECT * FROM story_backgrounds WHERE work_id = ? ORDER BY id DESC LIMIT 1', 
      [workId]
    );
    const formattedBackground: StoryBackground = {
      id: background?.id?.toString() || '1',
      name: background?.name || work.title || '故事背景',
      worldSetting: background?.world_setting || '',
      timeline: background?.timeline ? JSON.parse(background.timeline) : [],
      geography: background?.geography || '',
      society: background?.society || '',
      other: background?.other || ''
    };

    // ========================================
    // 4. 读取章节细纲
    // ========================================
    this.reportProgress(onProgress, 'preparing', 12, '正在读取章节细纲...');
    const chapterOutline = await this.db.queryOne(
      'SELECT * FROM chapter_outlines WHERE work_id = ? AND chapter_number = ? LIMIT 1', 
      [workId, chapterNumber]
    );
    
    if (!chapterOutline) {
      throw new Error(`未找到章节细纲，workId: ${workId}, chapterNumber: ${chapterNumber}`);
    }

    const formattedChapterOutline: ChapterOutline = {
      chapterNumber: chapterOutline.chapter_number,
      title: chapterOutline.title || '',
      summary: chapterOutline.summary || '',
      keyEvents: chapterOutline.key_events ? JSON.parse(chapterOutline.key_events) : [],
      characters: chapterOutline.characters ? JSON.parse(chapterOutline.characters) : [],
      location: chapterOutline.location || '',
      time: chapterOutline.time || '',
      mood: chapterOutline.mood || '',
      targetWordCount: chapterOutline.target_word_count || 2000
    };

    // ========================================
    // 5. 读取关联章节
    // ========================================
    this.reportProgress(onProgress, 'preparing', 15, '正在读取关联章节...');
    const relatedChapters: RelatedChapter[] = [];
    
    if (relatedChapterCount > 0) {
      const startChapter = Math.max(1, chapterNumber - relatedChapterCount);
      const endChapter = chapterNumber - 1;
      
      if (startChapter <= endChapter) {
        const chapters = await this.db.query(`
          SELECT 
            chapter_number as chapterNumber,
            title,
            content
          FROM chapters 
          WHERE work_id = ? 
            AND chapter_number BETWEEN ? AND ?
            AND content IS NOT NULL
            AND LENGTH(content) > 100
          ORDER BY chapter_number
        `, [workId, startChapter, endChapter]);
        
        // 尝试获取细纲作为 summary
        for (const ch of chapters) {
          const outline = await this.db.queryOne(
            'SELECT summary FROM chapter_outlines WHERE work_id = ? AND chapter_number = ?',
            [workId, ch.chapterNumber]
          );
          
          relatedChapters.push({
            chapterNumber: ch.chapterNumber,
            title: ch.title || '',
            content: ch.content,
            summary: outline?.summary || this.summarizeContent(ch.content, 300)
          });
        }
      }
    }

    // ========================================
    // 6. 构建默认设置
    // ========================================
    const defaultSettings: GenerationSettings = {
      style: 'literary',
      temperature: 0.7,
      maxLength: 10000,
      autoPolish: true
    };

    // ========================================
    // 7. 调用 generate 方法
    // ========================================
    this.reportProgress(onProgress, 'preparing', 18, '数据读取完成，开始生成...');
    
    return this.generate({
      chapterOutline: formattedChapterOutline,
      characters: formattedCharacters,
      background: formattedBackground,
      relatedChapters,
      settings: settings || defaultSettings
    }, onProgress);
  }

  /**
   * 生成文本
   * 
   * @param input 生成输入
   * @param onProgress 进度回调
   * @returns 生成输出
   */
  async generate(
    input: GenerationInput,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<GenerationOutput> {
    const startTime = Date.now();
    const { chapterOutline, characters, background, relatedChapters, settings } = input;

    this.reportProgress(onProgress, 'preparing', 5, '正在准备生成环境...');

    // ========================================
    // 1. 构建 Prompt
    // ========================================
    this.reportProgress(onProgress, 'preparing', 15, '正在构建生成 Prompt...');
    
    const prompt = this.buildPrompt(chapterOutline, characters, background, relatedChapters, settings);
    
    // ========================================
    // 2. 调用 LLM 生成文本
    // ========================================
    this.reportProgress(onProgress, 'generating', 20, '正在调用 LLM 生成文本...');
    
    let rawText: string;
    let generationTime = 0;
    
    try {
      const generationStartTime = Date.now();
      const messages = [
        { role: 'system' as const, content: this.getSystemPrompt(settings) },
        { role: 'user' as const, content: prompt }
      ];
      
      const response = await this.llmClient.invoke(messages, {
        temperature: settings.temperature,
        model: settings.model || 'doubao-seed-1-8-251228'
      });
      
      rawText = response.content;
      generationTime = Date.now() - generationStartTime;
      
    } catch (error) {
      this.reportProgress(onProgress, 'error', 0, `生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
    
    this.reportProgress(onProgress, 'generating', 70, '文本生成完成');
    
    // ========================================
    // 3. 是否自动润色
    // ========================================
    let finalText = rawText;
    let polished = false;
    let polishTime = 0;
    let polishReport: any = undefined;
    
    if (settings.autoPolish) {
      this.reportProgress(onProgress, 'polishing', 75, '正在执行文本润色...');
      
      try {
        const polishStartTime = Date.now();
        const polishPipeline = new PolishPipeline();
        
        // 准备润色输入
        const polishSettings: PolishSettings = {
          steps: (settings.polishSettings?.steps as Record<string, any>) || {},
          global: {
            style: 'literary',
            temperature: 0.7,
            maxLength: 100000
          }
        };
        
        const polishInput: PolishInput = {
          text: rawText,
          settings: polishSettings
        };
        
        const polishResult = await polishPipeline.execute(polishInput, (progress) => {
          this.reportProgress(
            onProgress, 
            'polishing', 
            75 + Math.round(progress.progress * 0.2), 
            `润色中: ${progress.message}`
          );
        });
        
        finalText = polishResult.text;
        polished = true;
        polishTime = Date.now() - polishStartTime;
        
        polishReport = {
          success: true,
          replacementCount: polishResult.replacements.length,
          stepsExecuted: polishResult.metadata.stepsExecuted
        };
        
      } catch (error) {
        console.warn('[GenerationPipeline] 润色失败，使用原始文本:', error);
        finalText = rawText;
        polishReport = {
          success: false,
          replacementCount: 0,
          stepsExecuted: 0,
          warnings: [`润色失败: ${error instanceof Error ? error.message : '未知错误'}`]
        };
      }
    }
    
    // ========================================
    // 4. 生成最终报告
    // ========================================
    this.reportProgress(onProgress, 'completed', 100, '处理完成');
    
    const output: GenerationOutput = {
      rawText,
      finalText,
      polished,
      generationReport: {
        success: true,
        summary: this.extractSummary(rawText),
        keyPoints: this.extractKeyPoints(chapterOutline)
      },
      polishReport,
      metadata: {
        generationTime,
        polishTime: polished ? polishTime : undefined,
        rawWordCount: this.countWords(rawText),
        finalWordCount: this.countWords(finalText)
      }
    };
    
    return output;
  }

  // ==========================================
  // 私有方法
  // ==========================================

  /**
   * 构建系统 Prompt
   */
  private getSystemPrompt(settings: GenerationInput['settings']): string {
    const styleDescriptions: Record<string, string> = {
      literary: '文学性强，语言优美',
      casual: '口语化，轻松自然',
      formal: '正式，严谨',
      historical: '古风，符合历史背景',
      wuxia: '武侠风格，江湖气息',
      fantasy: '奇幻风格，想象力丰富'
    };
    
    const styleDesc = styleDescriptions[settings.style] || '文学性强';
    
    return `你是一位专业的小说创作专家，擅长根据大纲和设定撰写高质量的小说内容。

写作要求：
1. ${styleDesc}
2. 保持人物性格和设定的一致性
3. 确保情节连贯，与前面章节内容衔接自然
4. 语言流畅，对话自然
5. 注重细节描写，让读者有代入感
6. 字数要充足，内容要充实
7. 不要在内容中添加任何说明、注释或标记

请直接返回生成的小说内容，不要添加任何额外的文字。`;
  }

  /**
   * 构建用户 Prompt
   */
  private buildPrompt(
    chapterOutline: ChapterOutline,
    characters: Character[],
    background: StoryBackground,
    relatedChapters: RelatedChapter[],
    settings: GenerationInput['settings']
  ): string {
    const parts: string[] = [];
    
    // 1. 故事背景
    parts.push('=== 故事背景 ===');
    parts.push(background.worldSetting);
    if (background.geography) {
      parts.push(`地理设定：${background.geography}`);
    }
    if (background.society) {
      parts.push(`社会设定：${background.society}`);
    }
    parts.push('');
    
    // 2. 人物设定
    parts.push('=== 人物设定 ===');
    characters.forEach(char => {
      parts.push(`【${char.name}】`);
      parts.push(`描述：${char.description}`);
      parts.push(`性格：${char.personality.join('、')}`);
      if (char.appearance) {
        parts.push(`外貌：${char.appearance}`);
      }
      if (char.background) {
        parts.push(`背景：${char.background}`);
      }
      parts.push('');
    });
    
    // 3. 关联章节内容
    if (relatedChapters.length > 0) {
      parts.push('=== 前面章节内容 ===');
      relatedChapters.forEach(ch => {
        parts.push(`【第${ch.chapterNumber}章${ch.title ? ' - ' + ch.title : ''}】`);
        parts.push(ch.summary || this.summarizeContent(ch.content, 300));
        parts.push('');
      });
    }
    
    // 4. 当前章节细纲
    parts.push('=== 当前章节细纲 ===');
    parts.push(`章节号：第${chapterOutline.chapterNumber}章`);
    if (chapterOutline.title) {
      parts.push(`标题：${chapterOutline.title}`);
    }
    parts.push(`概要：${chapterOutline.summary}`);
    
    if (chapterOutline.keyEvents && chapterOutline.keyEvents.length > 0) {
      parts.push('关键情节：');
      chapterOutline.keyEvents.forEach((event, i) => {
        parts.push(`${i + 1}. ${event}`);
      });
    }
    
    if (chapterOutline.characters && chapterOutline.characters.length > 0) {
      parts.push(`出场人物：${chapterOutline.characters.join('、')}`);
    }
    
    if (chapterOutline.location) {
      parts.push(`地点：${chapterOutline.location}`);
    }
    
    if (chapterOutline.time) {
      parts.push(`时间：${chapterOutline.time}`);
    }
    
    if (chapterOutline.mood) {
      parts.push(`情绪基调：${chapterOutline.mood}`);
    }
    
    if (chapterOutline.targetWordCount) {
      parts.push(`目标字数：约${chapterOutline.targetWordCount}字`);
    }
    
    parts.push('');
    parts.push('请根据以上信息撰写本章内容。');
    
    return parts.join('\n');
  }

  /**
   * 摘要内容
   */
  private summarizeContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  }

  /**
   * 报告进度
   */
  private reportProgress(
    callback: ((progress: GenerationProgress) => void) | undefined,
    phase: GenerationPhase,
    progress: number,
    message: string,
    error?: string
  ): void {
    callback?.({ 
      phase,
      progress: Math.round(progress), 
      message, 
      timestamp: Date.now(),
      error
    });
  }

  /**
   * 提取摘要
   */
  private extractSummary(text: string): string {
    // 简单提取前100字作为摘要
    return text.slice(0, 100).replace(/\n/g, ' ') + (text.length > 100 ? '...' : '');
  }

  /**
   * 提取关键点
   */
  private extractKeyPoints(chapterOutline: ChapterOutline): string[] {
    return chapterOutline.keyEvents || [];
  }

  /**
   * 统计字数
   */
  private countWords(text: string): number {
    const chinese = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const english = (text.match(/[a-zA-Z]+/g) || []).length;
    return chinese + english;
  }
}
