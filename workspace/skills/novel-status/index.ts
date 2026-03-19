import { spawn } from 'child_process';
import { join } from 'path';

const DB_PATH = '/workspace/projects/task-planner/data/chapters.db';

interface WorkStatus {
  work_name: string;
  total: number;
  polished: number;
  passed: number;
  published: number;
  today_published: number;
}

interface ChapterDetail {
  chapter_num: number;
  chapter_name: string;
  status: string;
  audit_status: string;
  published: number;
}

interface PublishRecord {
  work_name: string;
  chapter_num: number;
  status: string;
  publish_time: string;
}

function runSqlQuery(sql: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const sqlite3 = spawn('sqlite3', ['-json', DB_PATH, sql]);
    let output = '';
    let error = '';

    sqlite3.stdout.on('data', (data) => {
      output += data.toString();
    });

    sqlite3.stderr.on('data', (data) => {
      error += data.toString();
    });

    sqlite3.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`SQLite error: ${error}`));
        return;
      }
      try {
        const result = output.trim() ? JSON.parse(output) : [];
        resolve(result);
      } catch (e) {
        resolve([]);
      }
    });
  });
}

export async function get_novel_status(): Promise<string> {
  try {
    // 获取各作品统计
    const stats = await runSqlQuery(`
      SELECT 
        w.work_name,
        COUNT(c.chapter_id) as total,
        COUNT(CASE WHEN c.status = 'polished' THEN 1 END) as polished,
        COUNT(CASE WHEN c.audit_status = 'passed' THEN 1 END) as passed,
        COUNT(CASE WHEN c.published = 1 THEN 1 END) as published
      FROM works w
      LEFT JOIN chapters c ON w.work_id = c.work_id
      GROUP BY w.work_id
    `);

    // 获取今日发布统计
    const todayStats = await runSqlQuery(`
      SELECT 
        w.work_name,
        COUNT(*) as today_count
      FROM publish_log pl
      JOIN works w ON pl.work_id = w.work_id
      WHERE pl.publish_date = date('now') AND pl.status = 'success'
      GROUP BY w.work_id
    `);

    let message = "📚 小说更新状态\n";
    message += "==================\n\n";

    for (const work of stats) {
      const today = todayStats.find((t: any) => t.work_name === work.work_name);
      const todayCount = today ? today.today_count : 0;

      message += `📖 ${work.work_name}\n`;
      message += `   总章节: ${work.total}\n`;
      message += `   已润色: ${work.polished} | 已通过: ${work.passed} | 已发布: ${work.published}\n`;
      message += `   今日发布: ${todayCount}/2\n\n`;
    }

    return message;
  } catch (error) {
    return `❌ 查询失败: ${error}`;
  }
}

export async function get_work_detail(work_name: string): Promise<string> {
  try {
    // 先获取 work_id
    const workResult = await runSqlQuery(`
      SELECT work_id FROM works WHERE work_name = '${work_name}'
    `);

    if (workResult.length === 0) {
      return `❌ 未找到作品: ${work_name}`;
    }

    const work_id = workResult[0].work_id;

    // 获取章节详情
    const chapters = await runSqlQuery(`
      SELECT 
        chapter_num,
        chapter_name,
        status,
        audit_status,
        published
      FROM chapters
      WHERE work_id = '${work_id}'
      ORDER BY chapter_num
    `);

    if (chapters.length === 0) {
      return `📖 ${work_name}\n暂无章节数据`;
    }

    let message = `📖 ${work_name} - 章节详情\n`;
    message += "==================\n\n";

    for (const ch of chapters) {
      const statusIcon = ch.published === 1 ? '✅' :
                        ch.audit_status === 'passed' ? '✓' :
                        ch.status === 'polished' ? '📝' : '⏳';
      message += `${statusIcon} ${ch.chapter_num}. ${ch.chapter_name || '未命名'}\n`;
    }

    message += "\n图例: ✅已发布 ✓已通过 📝已润色 ⏳待处理";
    return message;
  } catch (error) {
    return `❌ 查询失败: ${error}`;
  }
}

export async function get_today_publish(): Promise<string> {
  try {
    const records = await runSqlQuery(`
      SELECT 
        w.work_name,
        pl.chapter_num,
        pl.status,
        pl.publish_time
      FROM publish_log pl
      JOIN works w ON pl.work_id = w.work_id
      WHERE pl.publish_date = date('now')
      ORDER BY pl.publish_time DESC
    `);

    if (records.length === 0) {
      return "📋 今日发布记录\n==================\n\n今日暂无发布记录";
    }

    let message = "📋 今日发布记录\n";
    message += "==================\n\n";

    for (const r of records) {
      const icon = r.status === 'success' ? '✅' : '❌';
      const time = r.publish_time ? r.publish_time.split(' ')[1] : '未知';
      message += `${icon} ${r.work_name} - 第${r.chapter_num}章 (${time})\n`;
    }

    return message;
  } catch (error) {
    return `❌ 查询失败: ${error}`;
  }
}

export async function get_pending_chapters(): Promise<string> {
  try {
    const chapters = await runSqlQuery(`
      SELECT 
        w.work_name,
        c.chapter_num,
        c.chapter_name
      FROM chapters c
      JOIN works w ON c.work_id = w.work_id
      WHERE c.status = 'polished' 
        AND c.audit_status = 'passed' 
        AND c.published = 0
      ORDER BY w.work_name, c.chapter_num
    `);

    if (chapters.length === 0) {
      return "📤 可发布章节\n==================\n\n暂无可发布章节（需要润色并通过审核）";
    }

    let message = "📤 可发布章节\n";
    message += "==================\n\n";

    let currentWork = '';
    for (const ch of chapters) {
      if (ch.work_name !== currentWork) {
        currentWork = ch.work_name;
        message += `\n📖 ${currentWork}\n`;
      }
      message += `   第${ch.chapter_num}章 ${ch.chapter_name || ''}\n`;
    }

    return message;
  } catch (error) {
    return `❌ 查询失败: ${error}`;
  }
}
