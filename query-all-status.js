
const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'sh-cynosdbmysql-grp-1kbg1xh0.sql.tencentcdb.com',
  port: 22295,
  user: 'openclaw',
  password: 'Lgp15237257500',
  database: 'cloudbase-4glvyyq9f61b19cd'
};

async function main() {
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    console.log('Connected');
    console.log('');
    
    // 1. 查询所有状态的统计
    console.log('📊 所有状态统计：');
    const [statusStats] = await conn.execute(
      'SELECT status, COUNT(*) as count FROM chapters GROUP BY status'
    );
    statusStats.forEach(row =&gt; {
      console.log(`  ${row.status}: ${row.count}`);
    });
    console.log('');
    
    // 2. 查询 pending 状态的章节
    console.log('📋 pending 状态的章节：');
    const [pendingChapters] = await conn.execute(
      'SELECT id, work_id, chapter_number, title, status, word_count, LENGTH(content) as content_length FROM chapters WHERE status = ? ORDER BY work_id, chapter_number',
      ['pending']
    );
    console.log(`找到 ${pendingChapters.length} 个 pending 状态的章节`);
    console.log('');
    
    if (pendingChapters.length &gt; 0) {
      pendingChapters.forEach((chapter, index) =&gt; {
        const hasContent = chapter.content_length &gt; 0;
        const newStatus = hasContent ? 'first_draft' : 'outline';
        console.log(`${index + 1}. 作品ID: ${chapter.work_id}, 章节: ${chapter.chapter_number}, 标题: ${chapter.title || '无标题'}, 字数: ${chapter.word_count || 0}, 内容长度: ${chapter.content_length || 0}, 新状态: ${newStatus}`);
      });
    }
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    if (conn) await conn.end();
  }
}

main();
