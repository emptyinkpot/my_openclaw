
const mysql = require('mysql2/promise');

// 数据库配置
const config = {
  host: 'sh-cynosdbmysql-grp-1kbg1xh0.sql.tencentcdb.com',
  port: 22295,
  user: 'openclaw',
  password: 'Lgp15237257500',
  database: 'cloudbase-4glvyyq9f61b19cd',
};

async function checkDatabase() {
  console.log('Connecting to database...');
  
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('Connected!');
    
    // 查看所有表
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('\nTables:');
    tables.forEach((table, i) => {
      console.log(`  ${i + 1}. ${Object.values(table)[0]}`);
    });
    
    // 检查 chapters 表
    try {
      const [chapters] = await connection.execute('SELECT * FROM chapters LIMIT 10');
      console.log(`\nChapters found: ${chapters.length}`);
      
      if (chapters.length > 0) {
        console.log('\nFirst 10 chapters:');
        chapters.forEach((ch, i) => {
          console.log(`  ${i + 1}. ID: ${ch.id}, Title: ${ch.title || 'N/A'}, State: ${ch.state || ch.status || 'N/A'}`);
        });
        
        // 统计状态
        const [stats] = await connection.execute(`
          SELECT 
            COALESCE(state, status, 'unknown') as status,
            COUNT(*) as count
          FROM chapters
          GROUP BY COALESCE(state, status, 'unknown')
        `);
        console.log('\nStatus stats:');
        stats.forEach(s => console.log(`  ${s.status}: ${s.count}`));
      }
    } catch (e) {
      console.log('\nChapters table error:', e.message);
    }
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    if (connection) await connection.end();
  }
}

checkDatabase();
