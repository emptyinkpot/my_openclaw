
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
    
    // 1. 查询 pending 章节
    console.log('Checking pending chapters...');
    const [pending] = await conn.execute('SELECT id, work_id, chapter_number, title, status, content FROM chapters WHERE status = ?', ['pending']);
    console.log('Found', pending.length, 'pending chapters');
    
    if (pending.length === 0) {
      console.log('No pending chapters to clean');
      return;
    }
    
    // 2. 清理
    console.log('Cleaning...');
    
    // 有内容的 -&gt; first_draft
    const [r1] = await conn.execute(
      'UPDATE chapters SET status = ?, updated_at = NOW() WHERE status = ? AND content IS NOT NULL AND LENGTH(content) &gt; 0',
      ['first_draft', 'pending']
    );
    console.log('Converted', r1.affectedRows, 'with content -&gt; first_draft');
    
    // 无内容的 -&gt; outline
    const [r2] = await conn.execute(
      'UPDATE chapters SET status = ?, updated_at = NOW() WHERE status = ? AND (content IS NULL OR LENGTH(content) = 0)',
      ['outline', 'pending']
    );
    console.log('Converted', r2.affectedRows, 'without content -&gt; outline');
    
    // 3. 验证
    const [remaining] = await conn.execute('SELECT id FROM chapters WHERE status = ?', ['pending']);
    console.log('Remaining pending:', remaining.length);
    
    if (remaining.length === 0) {
      console.log('All cleaned!');
    }
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    if (conn) await conn.end();
  }
}

main();
