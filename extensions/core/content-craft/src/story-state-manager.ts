/**
 * 全局故事状态管理器
 * 
 * 功能：
 * 1. 记录关键事件时间线
 * 2. 记录角色成长轨迹
 * 3. 记录重要物品和信息
 * 4. 提供全局上下文查询
 * 
 * @module content-craft/story-state
 */

import { getDatabaseManager } from '../../database';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

// ==========================================
// 类型定义
// ==========================================

export interface StoryEvent {
  id: number;
  workId: number;
  chapterNumber: number;
  eventType: 'key_plot' | 'character_development' | 'item_acquisition' | 'world_change' | 'relationship_change';
  title: string;
  description: string;
  charactersInvolved: string[];
  timestamp: Date;
  importance: 'low' | 'medium' | 'high' | 'critical';
}

export interface CharacterGrowth {
  id: number;
  workId: number;
  characterName: string;
  chapterNumber: number;
  growthType: 'skill' | 'personality' | 'knowledge' | 'status' | 'relationship';
  before: string;
  after: string;
  description: string;
  timestamp: Date;
}

export interface ImportantItem {
  id: number;
  workId: number;
  name: string;
  type: 'weapon' | 'artifact' | 'document' | 'key' | 'other';
  description: string;
  currentOwner: string;
  acquiredAt: { chapterNumber: number; description: string };
  currentLocation: string;
  properties: Record<string, any>;
}

export interface StoryState {
  workId: number;
  events: StoryEvent[];
  characterGrowth: CharacterGrowth[];
  importantItems: ImportantItem[];
  lastUpdated: Date;
}

// ==========================================
// 故事状态管理器类
// ==========================================

export class StoryStateManager {
  private db = getDatabaseManager();
  private llmClient: LLMClient;
  private initialized = false;

  constructor() {
    const config = new Config();
    this.llmClient = new LLMClient(config);
  }

  /**
   * 初始化数据库表
   */
  async initTables(): Promise<void> {
    if (this.initialized) return;

    try {
      // 创建故事事件表
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS story_events (
          id INT PRIMARY KEY AUTO_INCREMENT,
          work_id INT NOT NULL,
          chapter_number INT NOT NULL,
          event_type VARCHAR(50) NOT NULL,
          title VARCHAR(500) NOT NULL,
          description TEXT,
          characters_involved JSON,
          importance VARCHAR(20) DEFAULT 'medium',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_work_chapter (work_id, chapter_number),
          INDEX idx_importance (importance)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // 创建角色成长表
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS character_growth (
          id INT PRIMARY KEY AUTO_INCREMENT,
          work_id INT NOT NULL,
          character_name VARCHAR(255) NOT NULL,
          chapter_number INT NOT NULL,
          growth_type VARCHAR(50) NOT NULL,
          before_change TEXT,
          after_change TEXT,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_work_character (work_id, character_name),
          INDEX idx_chapter (chapter_number)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // 创建重要物品表
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS important_items (
          id INT PRIMARY KEY AUTO_INCREMENT,
          work_id INT NOT NULL,
          name VARCHAR(255) NOT NULL,
          item_type VARCHAR(50) NOT NULL,
          description TEXT,
          current_owner VARCHAR(255),
          acquired_at JSON,
          current_location VARCHAR(255),
          properties JSON,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_work (work_id),
          INDEX idx_owner (current_owner)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      this.initialized = true;
      console.log('[StoryStateManager] 数据库表初始化完成');
    } catch (error) {
      console.error('[StoryStateManager] 初始化表失败:', error);
    }
  }

  /**
   * 获取作品的完整故事状态
   */
  async getStoryState(workId: number): Promise<StoryState> {
    await this.initTables();

    const events = await this.db.query(
      'SELECT * FROM story_events WHERE work_id = ? ORDER BY chapter_number, created_at',
      [workId]
    );

    const characterGrowth = await this.db.query(
      'SELECT * FROM character_growth WHERE work_id = ? ORDER BY character_name, chapter_number',
      [workId]
    );

    const importantItems = await this.db.query(
      'SELECT * FROM important_items WHERE work_id = ? ORDER BY created_at',
      [workId]
    );

    return {
      workId,
      events: events.map(this.formatEvent),
      characterGrowth: characterGrowth.map(this.formatCharacterGrowth),
      importantItems: importantItems.map(this.formatImportantItem),
      lastUpdated: new Date()
    };
  }

  /**
   * 获取用于生成 prompt 的上下文摘要
   */
  async getContextSummary(workId: number, currentChapter: number): Promise<string> {
    const state = await this.getStoryState(workId);
    const parts: string[] = [];

    // 关键事件（只包含 high 和 critical 级别的）
    const importantEvents = state.events.filter(
      e => e.chapterNumber < currentChapter && 
           (e.importance === 'high' || e.importance === 'critical')
    );

    if (importantEvents.length > 0) {
      parts.push('=== 关键事件回顾 ===');
      importantEvents.forEach(event => {
        parts.push(`【第${event.chapterNumber}章】${event.title}`);
        parts.push(event.description);
        if (event.charactersInvolved.length > 0) {
          parts.push(`涉及人物：${event.charactersInvolved.join('、')}`);
        }
        parts.push('');
      });
    }

    // 重要物品
    if (state.importantItems.length > 0) {
      parts.push('=== 重要物品 ===');
      state.importantItems.forEach(item => {
        parts.push(`【${item.name}】`);
        parts.push(`类型：${item.type}`);
        parts.push(`描述：${item.description}`);
        parts.push(`当前持有者：${item.currentOwner}`);
        parts.push('');
      });
    }

    // 角色重要成长
    const recentGrowth = state.characterGrowth.filter(
      g => g.chapterNumber < currentChapter
    );

    if (recentGrowth.length > 0) {
      parts.push('=== 角色成长 ===');
      const growthByCharacter = this.groupBy(recentGrowth, 'characterName');
      Object.entries(growthByCharacter).forEach(([charName, growths]) => {
        parts.push(`【${charName}】`);
        growths.forEach(g => {
          parts.push(`- 第${g.chapterNumber}章：${g.description}`);
        });
        parts.push('');
      });
    }

    return parts.join('\n');
  }

  /**
   * 从章节内容中自动提取关键信息并更新状态
   */
  async extractAndUpdateState(
    workId: number, 
    chapterNumber: number, 
    content: string
  ): Promise<void> {
    await this.initTables();

    try {
      console.log(`[StoryStateManager] 正在分析第${chapterNumber}章内容...`);

      // 使用 LLM 提取关键信息
      const extracted = await this.extractWithLLM(content);

      // 保存提取的事件
      for (const event of extracted.events) {
        await this.addEvent({
          workId,
          chapterNumber,
          ...event
        });
      }

      // 保存角色成长
      for (const growth of extracted.characterGrowth) {
        await this.addCharacterGrowth({
          workId,
          chapterNumber,
          ...growth
        });
      }

      // 保存重要物品
      for (const item of extracted.importantItems) {
        await this.addOrUpdateItem({
          workId,
          ...item
        });
      }

      console.log(`[StoryStateManager] 第${chapterNumber}章状态更新完成`);
    } catch (error) {
      console.error('[StoryStateManager] 提取状态失败:', error);
    }
  }

  /**
   * 添加故事事件
   */
  private async addEvent(event: Omit<StoryEvent, 'id' | 'timestamp'>): Promise<void> {
    await this.db.execute(`
      INSERT INTO story_events 
      (work_id, chapter_number, event_type, title, description, characters_involved, importance)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      event.workId,
      event.chapterNumber,
      event.eventType,
      event.title,
      event.description,
      JSON.stringify(event.charactersInvolved),
      event.importance
    ]);
  }

  /**
   * 添加角色成长
   */
  private async addCharacterGrowth(growth: Omit<CharacterGrowth, 'id' | 'timestamp'>): Promise<void> {
    await this.db.execute(`
      INSERT INTO character_growth 
      (work_id, character_name, chapter_number, growth_type, before_change, after_change, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      growth.workId,
      growth.characterName,
      growth.chapterNumber,
      growth.growthType,
      growth.before,
      growth.after,
      growth.description
    ]);
  }

  /**
   * 添加或更新重要物品
   */
  private async addOrUpdateItem(item: Omit<ImportantItem, 'id'>): Promise<void> {
    // 检查是否已存在同名物品
    const existing = await this.db.queryOne(
      'SELECT id FROM important_items WHERE work_id = ? AND name = ?',
      [item.workId, item.name]
    );

    if (existing) {
      // 更新现有物品
      await this.db.execute(`
        UPDATE important_items 
        SET description = ?, current_owner = ?, current_location = ?, properties = ?, updated_at = NOW()
        WHERE id = ?
      `, [
        item.description,
        item.currentOwner,
        item.currentLocation,
        JSON.stringify(item.properties),
        existing.id
      ]);
    } else {
      // 插入新物品
      await this.db.execute(`
        INSERT INTO important_items 
        (work_id, name, item_type, description, current_owner, acquired_at, current_location, properties)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        item.workId,
        item.name,
        item.type,
        item.description,
        item.currentOwner,
        JSON.stringify(item.acquiredAt),
        item.currentLocation,
        JSON.stringify(item.properties)
      ]);
    }
  }

  /**
   * 使用 LLM 提取关键信息
   */
  private async extractWithLLM(content: string): Promise<{
    events: Array<Omit<StoryEvent, 'id' | 'workId' | 'chapterNumber' | 'timestamp'>>;
    characterGrowth: Array<Omit<CharacterGrowth, 'id' | 'workId' | 'chapterNumber' | 'timestamp'>>;
    importantItems: Array<Omit<ImportantItem, 'id' | 'workId'>>;
  }> {
    const prompt = `请分析以下小说章节内容，提取关键信息：

章节内容：
${content.slice(0, 8000)}

请按以下 JSON 格式返回（不要包含任何额外文字）：
{
  "events": [
    {
      "eventType": "key_plot|character_development|item_acquisition|world_change|relationship_change",
      "title": "简短标题",
      "description": "详细描述",
      "charactersInvolved": ["角色1", "角色2"],
      "importance": "low|medium|high|critical"
    }
  ],
  "characterGrowth": [
    {
      "characterName": "角色名",
      "growthType": "skill|personality|knowledge|status|relationship",
      "before": "变化前",
      "after": "变化后",
      "description": "描述"
    }
  ],
  "importantItems": [
    {
      "name": "物品名",
      "type": "weapon|artifact|document|key|other",
      "description": "描述",
      "currentOwner": "当前持有者",
      "acquiredAt": { "chapterNumber": 章节号, "description": "获取方式" },
      "currentLocation": "当前位置",
      "properties": {}
    }
  ]
}

如果没有相关内容，返回空数组。`;

    try {
      const response = await this.llmClient.invoke([
        { role: 'system', content: '你是一位专业的小说分析专家，擅长提取故事中的关键事件、角色成长和重要物品。' },
        { role: 'user', content: prompt }
      ], {
        temperature: 0.3,
        model: 'doubao-seed-1-8-251228'
      });

      const text = response.content.trim();
      // 尝试提取 JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('[StoryStateManager] LLM 提取失败:', error);
    }

    return { events: [], characterGrowth: [], importantItems: [] };
  }

  // ==========================================
  // 辅助方法
  // ==========================================

  private formatEvent(row: any): StoryEvent {
    return {
      id: row.id,
      workId: row.work_id,
      chapterNumber: row.chapter_number,
      eventType: row.event_type,
      title: row.title,
      description: row.description,
      charactersInvolved: row.characters_involved ? JSON.parse(row.characters_involved) : [],
      timestamp: new Date(row.created_at),
      importance: row.importance
    };
  }

  private formatCharacterGrowth(row: any): CharacterGrowth {
    return {
      id: row.id,
      workId: row.work_id,
      characterName: row.character_name,
      chapterNumber: row.chapter_number,
      growthType: row.growth_type,
      before: row.before_change,
      after: row.after_change,
      description: row.description,
      timestamp: new Date(row.created_at)
    };
  }

  private formatImportantItem(row: any): ImportantItem {
    return {
      id: row.id,
      workId: row.work_id,
      name: row.name,
      type: row.item_type,
      description: row.description,
      currentOwner: row.current_owner,
      acquiredAt: row.acquired_at ? JSON.parse(row.acquired_at) : { chapterNumber: 0, description: '' },
      currentLocation: row.current_location,
      properties: row.properties ? JSON.parse(row.properties) : {}
    };
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((result, item) => {
      const groupKey = String(item[key]);
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    }, {} as Record<string, T[]>);
  }
}

// 单例实例
let storyStateManagerInstance: StoryStateManager | null = null;

export function getStoryStateManager(): StoryStateManager {
  if (!storyStateManagerInstance) {
    storyStateManagerInstance = new StoryStateManager();
  }
  return storyStateManagerInstance;
}
