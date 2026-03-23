
/**
 * 每日计划模块 - 高内聚、低耦合
 * 专门处理 daily_plans 表的所有数据库操作
 */

import { getDatabaseManager } from '../manager';

export interface DailyPlan {
  id?: number;
  work_id: number;
  chapter_number: number;
  plan_date: string | Date;
  created_at?: Date;
}

export class DailyPlanRepository {
  private db = getDatabaseManager();

  /**
   * 创建表（如果不存在）
   */
  async createTableIfNotExists(): Promise&lt;void&gt; {
    const sql = `
      CREATE TABLE IF NOT EXISTS daily_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        work_id INT NOT NULL,
        chapter_number INT NOT NULL,
        plan_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_plan (work_id, chapter_number, plan_date),
        INDEX idx_plan_date (plan_date),
        INDEX idx_work_id (work_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await this.db.execute(sql);
  }

  /**
   * 获取指定日期的计划
   */
  async getByDate(planDate: string | Date): Promise&lt;DailyPlan[]&gt; {
    const dateStr = typeof planDate === 'string' ? planDate : planDate.toISOString().split('T')[0];
    const sql = 'SELECT * FROM daily_plans WHERE plan_date = ? ORDER BY work_id, chapter_number';
    return await this.db.query(sql, [dateStr]);
  }

  /**
   * 获取今日计划
   */
  async getToday(): Promise&lt;DailyPlan[]&gt; {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return await this.getByDate(today);
  }

  /**
   * 获取指定作品的计划
   */
  async getByWorkId(workId: number, planDate?: string | Date): Promise&lt;DailyPlan[]&gt; {
    let sql = 'SELECT * FROM daily_plans WHERE work_id = ?';
    const params: any[] = [workId];
    
    if (planDate) {
      const dateStr = typeof planDate === 'string' ? planDate : planDate.toISOString().split('T')[0];
      sql += ' AND plan_date = ?';
      params.push(dateStr);
    }
    
    sql += ' ORDER BY chapter_number';
    return await this.db.query(sql, params);
  }

  /**
   * 保存计划（会先删除指定日期的旧计划）
   */
  async save(planDate: string | Date, plans: Omit&lt;DailyPlan, 'id' | 'created_at'&gt;[]): Promise&lt;void&gt; {
    const dateStr = typeof planDate === 'string' ? planDate : planDate.toISOString().split('T')[0];
    
    await this.db.transaction(async (conn) =&gt; {
      // 删除旧计划
      await conn.execute('DELETE FROM daily_plans WHERE plan_date = ?', [dateStr]);
      
      // 插入新计划
      for (const plan of plans) {
        try {
          await conn.execute(
            'INSERT INTO daily_plans (work_id, chapter_number, plan_date) VALUES (?, ?, ?)',
            [plan.work_id, plan.chapter_number, dateStr]
          );
        } catch (e) {
          // 忽略重复插入错误（因为有 UNIQUE 约束）
        }
      }
    });
  }

  /**
   * 保存今日计划
   */
  async saveToday(plans: Omit&lt;DailyPlan, 'id' | 'created_at'&gt;[]): Promise&lt;void&gt; {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return await this.save(today, plans);
  }

  /**
   * 删除指定日期的计划
   */
  async deleteByDate(planDate: string | Date): Promise&lt;void&gt; {
    const dateStr = typeof planDate === 'string' ? planDate : planDate.toISOString().split('T')[0];
    await this.db.execute('DELETE FROM daily_plans WHERE plan_date = ?', [dateStr]);
  }

  /**
   * 删除今日计划
   */
  async deleteToday(): Promise&lt;void&gt; {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return await this.deleteByDate(today);
  }

  /**
   * 获取计划统计
   */
  async getStats(): Promise&lt;{ total: number; byDate: Record&lt;string, number&gt; }&gt; {
    const allPlans = await this.db.query('SELECT plan_date, COUNT(*) as count FROM daily_plans GROUP BY plan_date ORDER BY plan_date DESC');
    
    const byDate: Record&lt;string, number&gt; = {};
    let total = 0;
    
    allPlans.forEach((row: any) =&gt; {
      const dateStr = row.plan_date.toISOString ? row.plan_date.toISOString().split('T')[0] : row.plan_date;
      byDate[dateStr] = row.count;
      total += row.count;
    });
    
    return { total, byDate };
  }
}

// 单例实例
let dailyPlanRepoInstance: DailyPlanRepository | null = null;

export function getDailyPlanRepository(): DailyPlanRepository {
  if (!dailyPlanRepoInstance) {
    dailyPlanRepoInstance = new DailyPlanRepository();
  }
  return dailyPlanRepoInstance;
}

export default DailyPlanRepository;
