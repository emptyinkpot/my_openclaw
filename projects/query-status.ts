
import mysql from 'mysql2/promise';

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
    console.log('Status stats:');
    const [statusStats] = await conn.execute(
      'SELECT status, COUNT(*) as count FROM chapters GROUP BY status'
    );
    console.log(statusStats);
    console.log('');
    
    // 2. 查询 pending 状态的章节
    console.log('Pending chapters:');
    const [pendingChapters] = await conn.execute(
      'SELECT id, work_id, chapter_number, title, status, word_count, LENGTH(content) as content_length FROM chapters WHERE status = ? ORDER BY work_id, chapter_number',
      ['pending']
    );
    console.log(`Found ${pendingChapters.length} pending chapters`);
    console.log(pendingChapters);
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    if (conn) await conn.end();
  }
}

main();
