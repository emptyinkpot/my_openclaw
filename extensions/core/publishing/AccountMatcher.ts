/**
 * 作品到番茄账号的自动匹配器
 * 根据作品标题自动匹配对应的番茄账号
 */

import { getConfig } from '../config';
import { getFanqieScanner } from '../storage/FanqieScanner';
import { logger } from '../../plugins/novel-manager/utils/logger';

export interface FanqieAccount {
  id: string;
  name: string;
  browserDir: string;
  cookiesFile: string;
}

export interface WorkAccountMatch {
  workTitle: string;
  accountId: string;
  accountName: string;
  confidence: number; // 匹配置信度 0-1
}

export class AccountMatcher {
  private static instance: AccountMatcher | null = null;
  
  // 作品标题到账号ID的缓存映射
  private workToAccountCache: Map<string, string> = new Map();
  
  // 单例
  static getInstance(): AccountMatcher {
    if (!AccountMatcher.instance) {
      AccountMatcher.instance = new AccountMatcher();
    }
    return AccountMatcher.instance;
  }

  /**
   * 根据作品标题自动匹配对应的番茄账号
   * 
   * 策略：
   * 1. 先查缓存
   * 2. 如果缓存没有，扫描所有账号的作品列表进行匹配
   * 3. 返回匹配度最高的账号
   */
  async matchAccountForWork(workTitle: string): Promise<FanqieAccount | null> {
    const config = getConfig();
    const accounts = config.scheduler.fanqieAccounts || [];
    
    if (accounts.length === 0) {
      logger.error('[AccountMatcher] 没有配置番茄账号');
      return null;
    }
    
    // 策略1：检查缓存
    if (this.workToAccountCache.has(workTitle)) {
      const cachedAccountId = this.workToAccountCache.get(workTitle)!;
      const cachedAccount = accounts.find(a => a.id === cachedAccountId);
      if (cachedAccount) {
        logger.debug(`[AccountMatcher] 缓存命中: ${workTitle} -> ${cachedAccount.name}`);
        return cachedAccount;
      }
    }
    
    // 策略2：扫描所有账号的作品列表进行匹配
    logger.info(`[AccountMatcher] 开始匹配账号 for "${workTitle}"`);
    
    let bestMatch: { account: FanqieAccount; score: number } | null = null;
    const scanner = getFanqieScanner();
    
    for (const account of accounts) {
      try {
        // 读取该账号的缓存作品（避免重复扫描）
        const works = scanner.readCache(account.id);
        
        if (works.length === 0) {
          logger.debug(`[AccountMatcher] 账号 ${account.name} 无缓存作品，跳过`);
          continue;
        }
        
        // 计算匹配分数
        for (const work of works) {
          const score = this.calculateMatchScore(workTitle, work.title);
          logger.debug(`[AccountMatcher] ${account.name} - "${work.title}": score=${score}`);
          
          if (score > 0.8 && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { account, score };
            logger.debug(`[AccountMatcher] 当前最佳匹配: ${account.name} (score=${score})`);
          }
        }
      } catch (e: any) {
        logger.warn(`[AccountMatcher] 读取账号 ${account.name} 缓存失败: ${e.message}`);
      }
    }
    
    if (bestMatch) {
      // 存入缓存
      this.workToAccountCache.set(workTitle, bestMatch.account.id);
      logger.info(`[AccountMatcher] 匹配成功: "${workTitle}" -> ${bestMatch.account.name} (score=${bestMatch.score})`);
      return bestMatch.account;
    }
    
    // 策略3：如果都没匹配到，返回默认账号（第一个）
    logger.warn(`[AccountMatcher] 未找到匹配账号，使用默认账号: ${accounts[0].name}`);
    return accounts[0];
  }

  /**
   * 计算两个标题的匹配分数（0-1）
   */
  private calculateMatchScore(title1: string, title2: string): number {
    const t1 = title1.toLowerCase().trim();
    const t2 = title2.toLowerCase().trim();
    
    // 完全匹配
    if (t1 === t2) return 1.0;
    
    // 包含匹配
    if (t1.includes(t2) || t2.includes(t1)) return 0.95;
    
    // 清理标点后匹配
    const clean1 = t1.replace(/[？?！!。，,、\s]/g, '');
    const clean2 = t2.replace(/[？?！!。，,、\s]/g, '');
    if (clean1 === clean2) return 0.9;
    if (clean1.includes(clean2) || clean2.includes(clean1)) return 0.85;
    
    // 计算共同字符比例
    const set1 = new Set(clean1);
    const set2 = new Set(clean2);
    let common = 0;
    for (const c of set1) {
      if (set2.has(c)) common++;
    }
    const union = new Set([...set1, ...set2]).size;
    const jaccard = union > 0 ? common / union : 0;
    
    return jaccard * 0.5; // 最多0.5分
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.workToAccountCache.clear();
    logger.debug('[AccountMatcher] 缓存已清空');
  }
}

// 导出单例
export function getAccountMatcher(): AccountMatcher {
  return AccountMatcher.getInstance();
}
