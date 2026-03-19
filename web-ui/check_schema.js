const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'sh-cynosdbmysql-grp-1kbg1xh0.sql.tencentcdb.com',
  port: 22295,
  user: 'openclaw',
  password: 'Lgp15237257500',
  database: 'cloudbase-4glvyyq9f61b19cd',
  charset: 'utf8mb4'
};

async function checkSchema() {
  const conn = await mysql.createConnection(dbConfig);
  
  try {
    // 查询chapters表结构
    const [columns] = await conn.execute('DESCRIBE chapters');
    console.log('=== chapters表结构 ===');
    columns.forEach(col => {
      console.log(col.Field, '-', col.Type);
    });
  } catch (error) {
    console.error('错误:', error.message);
  } finally {
    await conn.end();
  }
}

checkSchema();
