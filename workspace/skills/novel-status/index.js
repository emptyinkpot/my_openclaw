const { spawn } = require('child_process');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DB_PATH = '/workspace/projects/auto-scripts/task-planner/data/chapters.db';

function runSqlQuery(sql) {
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

// 获取番茄作品列表
async function getFanqieWorks() {
  const BROWSER_DIR = '/workspace/projects/browser/default';
  const BACKUP_FILE = '/workspace/projects/cookies-accounts/fanqie-default-full.json';
  
  let browser = null;
  
  try {
    // 清理锁文件
    ['SingletonLock', 'SingletonSocket', 'SingletonCookie'].forEach(f => {
      const p = path.join(BROWSER_DIR, f);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });
    
    // 启动浏览器
    browser = await chromium.launchPersistentContext(BROWSER_DIR, {
      headless: true,
      viewport: null,
      args: ['--no-sandbox']
    });
    
    const page = browser.pages()[0] || await browser.newPage();
    
    // 恢复登录状态
    if (fs.existsSync(BACKUP_FILE)) {
      const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'));
      
      await page.goto('https://fanqienovel.com', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      
      if (backup.localStorage) {
        await page.evaluate(items => {
          for (const [k, v] of Object.entries(items)) {
            localStorage.setItem(k, v);
          }
        }, backup.localStorage);
      }
      
      if (backup.cookies) {
        await browser.addCookies(backup.cookies);
      }
    }
    
    // 访问作品管理页
    await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // 提取作品
    const works = await page.evaluate(() => {
      const results = [];
      
      document.querySelectorAll('.home-book-item').forEach(el => {
        const titleEl = el.querySelector('.book-item-info [class*="title"], .book-item-info h3, .book-item-info h4');
        let title = titleEl?.innerText?.trim()?.split('\n')[0];
        
        if (!title) {
          const infoEl = el.querySelector('.book-item-info');
          title = infoEl?.innerText?.trim()?.split('\n')[0];
        }
        
        const text = el.innerText || '';
        const status = text.includes('连载中') ? '连载中' : 
                       text.includes('已完结') ? '已完结' : 
                       text.includes('待审核') ? '待审核' : '';
        
        const chapterMatch = text.match(/(\d+)\s*章/);
        const chapters = chapterMatch ? parseInt(chapterMatch[1]) : 0;
        
        if (title && title.length > 0 && title !== '我的小说') {
          results.push({ title, status, chapters });
        }
      });
      
      const seen = new Set();
      return results.filter(w => seen.has(w.title) ? false : (seen.add(w.title), true));
    });
    
    return works;
  } catch (error) {
    return [];
  } finally {
    if (browser) await browser.close();
  }
}

async function get_novel_status() {
  let message = "📚 小说更新状态\n";
  message += "==================\n\n";
  
  // ===== 白梦平台 =====
  message += "【白梦平台】\n\n";
  
  try {
    const stats = await runSqlQuery(`
      SELECT 
        w.work_name,
        COUNT(c.chapter_num) as total,
        COUNT(CASE WHEN c.status = 'polished' THEN 1 END) as polished,
        COUNT(CASE WHEN c.audit_status = 'passed' THEN 1 END) as passed,
        COUNT(CASE WHEN c.suggested_action = 'publish' THEN 1 END) as ready_to_publish
      FROM works w
      LEFT JOIN chapters c ON w.work_id = c.work_id
      GROUP BY w.work_id
    `);

    const todayActions = await runSqlQuery(`
      SELECT 
        w.work_name,
        COUNT(*) as action_count,
        GROUP_CONCAT(DISTINCT al.action) as actions
      FROM action_log al
      JOIN works w ON al.work_id = w.work_id
      WHERE date(al.timestamp) = date('now') 
        AND al.action IN ('publish', 'polish', 'audit_pass')
      GROUP BY w.work_id
    `);

    for (const work of stats) {
      const today = todayActions.find((t) => t.work_name === work.work_name);
      const todayCount = today ? today.action_count : 0;

      message += `📖 ${work.work_name}\n`;
      message += `   总: ${work.total} | 润色: ${work.polished} | 通过: ${work.passed} | 待发: ${work.ready_to_publish}\n`;
      if (todayCount > 0) {
        message += `   今日: ${todayCount}次\n`;
      }
      message += "\n";
    }
  } catch (e) {
    message += `   白梦数据获取失败: ${e.message}\n\n`;
  }
  
  // ===== 番茄平台 =====
  message += "【番茄平台】\n\n";
  
  try {
    const fanqieWorks = await getFanqieWorks();
    
    if (fanqieWorks.length === 0) {
      message += "   未获取到番茄作品（可能需要登录）\n";
    } else {
      for (const work of fanqieWorks) {
        message += `🍅 ${work.title}\n`;
        message += `   状态: ${work.status} | 章节: ${work.chapters}章\n\n`;
      }
    }
  } catch (e) {
    message += `   番茄数据获取失败: ${e.message}\n`;
  }
  
  return message;
}

async function get_work_detail(work_name) {
  // 先查白梦
  try {
    const workResult = await runSqlQuery(`
      SELECT work_id FROM works WHERE work_name LIKE '%${work_name}%'
    `);

    if (workResult.length > 0) {
      const work_id = workResult[0].work_id;
      const chapters = await runSqlQuery(`
        SELECT chapter_num, chapter_name, status, audit_status, suggested_action
        FROM chapters WHERE work_id = '${work_id}' ORDER BY chapter_num DESC LIMIT 20
      `);

      if (chapters.length > 0) {
        let message = `📖 ${work_name} - 最近章节\n`;
        message += "==================\n\n";

        for (const ch of chapters.reverse()) {
          const statusIcon = ch.suggested_action === 'publish' ? '✅' :
                            ch.audit_status === 'passed' ? '✓' :
                            ch.status === 'polished' ? '📝' : '⏳';
          const shortName = (ch.chapter_name || '未命名').substring(0, 15);
          message += `${statusIcon} ${ch.chapter_num}. ${shortName}\n`;
        }
        message += "\n图例: ✅可发布 ✓审核通过 📝已润色 ⏳待处理";
        return message;
      }
    }
  } catch (e) {}
  
  return `❌ 未找到作品: ${work_name}`;
}

async function get_today_actions() {
  try {
    const records = await runSqlQuery(`
      SELECT w.work_name, al.chapter_num, al.action, al.result, al.timestamp
      FROM action_log al
      JOIN works w ON al.work_id = w.work_id
      WHERE date(al.timestamp) = date('now')
      ORDER BY al.timestamp DESC LIMIT 20
    `);

    if (records.length === 0) {
      return "📋 今日操作记录\n==================\n\n今日暂无操作记录";
    }

    let message = "📋 今日操作记录\n==================\n\n";

    for (const r of records) {
      const icon = r.result === 'success' ? '✅' : '❌';
      const time = r.timestamp ? r.timestamp.split(' ')[1].substring(0, 5) : '未知';
      const actionText = { 'publish': '发布', 'polish': '润色', 'audit_pass': '审核通过' }[r.action] || r.action;
      message += `${icon} ${time} ${r.work_name} 第${r.chapter_num}章 ${actionText}\n`;
    }
    return message;
  } catch (error) {
    return `❌ 查询失败: ${error.message}`;
  }
}

async function get_pending_chapters() {
  try {
    const chapters = await runSqlQuery(`
      SELECT w.work_name, c.chapter_num, c.chapter_name
      FROM chapters c JOIN works w ON c.work_id = w.work_id
      WHERE c.suggested_action = 'publish' OR (c.status = 'polished' AND c.audit_status = 'passed')
      ORDER BY w.work_name, c.chapter_num LIMIT 30
    `);

    if (chapters.length === 0) {
      return "📤 可发布章节\n==================\n\n暂无可发布章节（需要润色并通过审核）";
    }

    let message = "📤 可发布章节\n==================\n\n";
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
    return `❌ 查询失败: ${error.message}`;
  }
}

// CLI support
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'status':
      get_novel_status().then(console.log);
      break;
    case 'detail':
      get_work_detail(args[1] || '').then(console.log);
      break;
    case 'today':
      get_today_actions().then(console.log);
      break;
    case 'pending':
      get_pending_chapters().then(console.log);
      break;
    default:
      console.log(`用法: node index.js [status|detail "作品名"|today|pending]`);
  }
}

module.exports = {
  get_novel_status,
  get_work_detail,
  get_today_actions,
  get_pending_chapters
};
