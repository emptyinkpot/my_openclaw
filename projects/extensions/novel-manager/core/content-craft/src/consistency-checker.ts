/**
 * 一致性检查器
 * 
 * 功能：
 * 1. 生成前检查：检查与已有设定的一致性
 * 2. 生成后验证：验证生成的内容是否保持了设定一致
 * 
 * @module content-craft/consistency
 */

import { LLMClient, Config } from 'coze-coding-dev-sdk';
import { getDatabaseManager } from '../../../../core/database';
import { StoryStateManager, getStoryStateManager } from './story-state-manager';
import { parseStringList, safeJsonParse } from './utils/safe-parse';
import { resolveContentCraftModel } from './utils/model-default';

// ==========================================
// 类型定义
// ==========================================

export interface ConsistencyIssue {
  type: 'character' | 'setting' | 'plot' | 'timeline' | 'item';
  severity: 'warning' | 'error' | 'critical';
  message: string;
  suggestion?: string;
  location?: {
    chapterNumber?: number;
    text?: string;
  };
}

export interface ConsistencyReport {
  passed: boolean;
  issues: ConsistencyIssue[];
  summary: string;
  suggestions: string[];
}

// ==========================================
// 一致性检查器类
// ==========================================

export class ConsistencyChecker {
  private db = getDatabaseManager();
  private llmClient: LLMClient;
  private storyStateManager: StoryStateManager;

  constructor() {
    const config = new Config();
    this.llmClient = new LLMClient(config);
    this.storyStateManager = getStoryStateManager();
  }

  /**
   * 生成前检查
   * 
   * 在生成新章节之前，检查与已有设定的一致性
   */
  async preGenerationCheck(
    workId: number,
    chapterNumber: number,
    chapterOutline: any
  ): Promise<ConsistencyReport> {
    const issues: ConsistencyIssue[] = [];

    try {
      // 1. 检查角色设定一致性
      const characterIssues = await this.checkCharacters(workId, chapterOutline);
      issues.push(...characterIssues);

      // 2. 检查故事状态一致性
      const stateIssues = await this.checkStoryState(workId, chapterNumber, chapterOutline);
      issues.push(...stateIssues);

      // 3. 检查时间线一致性
      const timelineIssues = await this.checkTimeline(workId, chapterNumber, chapterOutline);
      issues.push(...timelineIssues);

    } catch (error) {
      issues.push({
        type: 'plot',
        severity: 'warning',
        message: `一致性检查过程出错: ${error instanceof Error ? error.message : '未知错误'}`
      });
    }

    return this.generateReport(issues);
  }

  /**
   * 生成后验证
   * 
   * 在生成内容后，验证是否保持了设定一致
   */
  async postGenerationValidate(
    workId: number,
    chapterNumber: number,
    content: string
  ): Promise<ConsistencyReport> {
    const issues: ConsistencyIssue[] = [];

    try {
      // 使用 LLM 进行深度一致性检查
      const llmIssues = await this.checkWithLLM(workId, chapterNumber, content);
      issues.push(...llmIssues);

      // 检查基本的一致性规则
      const ruleIssues = await this.checkBasicRules(workId, chapterNumber, content);
      issues.push(...ruleIssues);

    } catch (error) {
      issues.push({
        type: 'plot',
        severity: 'warning',
        message: `一致性验证过程出错: ${error instanceof Error ? error.message : '未知错误'}`
      });
    }

    return this.generateReport(issues);
  }

  /**
   * 检查角色设定一致性
   */
  private async checkCharacters(
    workId: number,
    chapterOutline: any
  ): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    try {
      // 获取所有角色
      const characters = await this.db.query(
        'SELECT * FROM characters WHERE work_id = ?',
        [workId]
      );

      // 检查章节细纲中的角色是否都存在
      if (chapterOutline?.characters) {
        const outlineCharacters = parseStringList(chapterOutline.characters);
        const characterNames = characters.map((c: any) => c.name.toLowerCase());

        for (const charName of outlineCharacters) {
          if (!characterNames.includes(charName.toLowerCase())) {
            issues.push({
              type: 'character',
              severity: 'warning',
              message: `角色 "${charName}" 在章节细纲中被提及，但在角色表中不存在`,
              suggestion: '请确认是否需要添加该角色，或者检查角色名是否正确'
            });
          }
        }
      }
    } catch (error) {
      // 不阻塞流程
    }

    return issues;
  }

  /**
   * 检查故事状态一致性
   */
  private async checkStoryState(
    workId: number,
    chapterNumber: number,
    chapterOutline: any
  ): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    try {
      const state = await this.storyStateManager.getStoryState(workId);
      
      // 检查重要物品的位置和持有者是否有冲突
      for (const item of state.importantItems) {
        // 这里可以添加更复杂的逻辑
        // 比如检查细纲中是否提到物品位置的变化
      }
    } catch (error) {
      // 不阻塞流程
    }

    return issues;
  }

  /**
   * 检查时间线一致性
   */
  private async checkTimeline(
    workId: number,
    chapterNumber: number,
    chapterOutline: any
  ): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    try {
      // 检查章节号是否连续
      const prevChapter = await this.db.queryOne(
        'SELECT * FROM chapters WHERE work_id = ? AND chapter_number = ?',
        [workId, chapterNumber - 1]
      );

      if (chapterNumber > 1 && !prevChapter) {
        issues.push({
          type: 'timeline',
          severity: 'warning',
          message: `第${chapterNumber - 1}章不存在，直接生成第${chapterNumber}章可能导致剧情不连贯`,
          suggestion: '建议先生成前面的章节'
        });
      }
    } catch (error) {
      // 不阻塞流程
    }

    return issues;
  }

  /**
   * 使用 LLM 进行深度一致性检查
   */
  private async checkWithLLM(
    workId: number,
    chapterNumber: number,
    content: string
  ): Promise<ConsistencyIssue[]> {
    try {
      // 获取角色设定
      const characters = await this.db.query(
        'SELECT * FROM characters WHERE work_id = ?',
        [workId]
      );

      // 获取故事背景
      const background = await this.db.queryOne(
        'SELECT * FROM story_backgrounds WHERE work_id = ? ORDER BY id DESC LIMIT 1',
        [workId]
      );

      // 获取故事状态
      const state = await this.storyStateManager.getStoryState(workId);

      const prompt = `请检查以下小说章节内容是否与设定保持一致：

【角色设定】
        ${characters.map((c: any) => `- ${c.name}: ${c.description}，性格：${parseStringList(c.personality).join('、') || '未知'}`).join('\n')}

【世界观设定】
${background?.world_setting || '无'}

【已知关键事件】
${state.events.filter(e => e.importance === 'high' || e.importance === 'critical').map(e => `- 第${e.chapterNumber}章：${e.title}`).join('\n') || '无'}

【待检查章节内容（前8000字）】
${content.slice(0, 8000)}

请检查是否存在以下问题：
1. 角色性格是否与设定不符
2. 角色能力是否与设定冲突
3. 是否与前面的关键事件矛盾
4. 是否违反世界观设定

请按以下 JSON 格式返回（如果没有问题返回空数组）：
{
  "issues": [
    {
      "type": "character|setting|plot|timeline|item",
      "severity": "warning|error|critical",
      "message": "问题描述",
      "suggestion": "修改建议"
    }
  ]
}`;

      const response = await this.llmClient.invoke([
        { role: 'system', content: '你是一位专业的小说编辑，擅长检查小说内容与设定的一致性。' },
        { role: 'user', content: prompt }
      ], {
        temperature: 0.3,
        model: resolveContentCraftModel()
      });

      const text = response.content.trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = safeJsonParse<any>(jsonMatch[0], { issues: [] });
        return parsed.issues || [];
      }
    } catch (error) {
      console.warn('[ConsistencyChecker] LLM 检查失败:', error);
    }

    return [];
  }

  /**
   * 检查基本一致性规则
   */
  private async checkBasicRules(
    workId: number,
    chapterNumber: number,
    content: string
  ): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    // 检查内容长度
    if (content.length < 500) {
      issues.push({
        type: 'plot',
        severity: 'warning',
        message: '章节内容过短，建议至少500字',
        suggestion: '补充更多情节和细节描写'
      });
    }

    return issues;
  }

  /**
   * 生成报告
   */
  private generateReport(issues: ConsistencyIssue[]): ConsistencyReport {
    const criticalErrors = issues.filter(i => i.severity === 'critical');
    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warning');

    const passed = criticalErrors.length === 0 && errors.length === 0;

    let summary = '';
    if (passed) {
      summary = warnings.length > 0 
        ? `一致性检查通过，但有 ${warnings.length} 个警告` 
        : '一致性检查通过';
    } else {
      summary = `发现 ${criticalErrors.length} 个严重问题，${errors.length} 个错误，${warnings.length} 个警告`;
    }

    const suggestions: string[] = [];
    issues.forEach(issue => {
      if (issue.suggestion) {
        suggestions.push(issue.suggestion);
      }
    });

    return {
      passed,
      issues,
      summary,
      suggestions: [...new Set(suggestions)] // 去重
    };
  }
}

// 单例实例
let consistencyCheckerInstance: ConsistencyChecker | null = null;

export function getConsistencyChecker(): ConsistencyChecker {
  if (!consistencyCheckerInstance) {
    consistencyCheckerInstance = new ConsistencyChecker();
  }
  return consistencyCheckerInstance;
}
