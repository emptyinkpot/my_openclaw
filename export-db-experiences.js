const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function exportDBExperiences() {
  const connection = await mysql.createConnection({
    host: 'sh-cynosdbmysql-grp-1kbg1xh0.sql.tencentcdb.com',
    port: 22295,
    user: 'openclaw',
    password: 'Lgp15237257500',
    database: 'cloudbase-4glvyyq9f61b19cd'
  });

  try {
    const [rows] = await connection.execute('SELECT * FROM experience_records ORDER BY timestamp DESC');
    console.log(`✅ 数据库中有 ${rows.length} 条经验记录！`);
    
    // 转换数据格式
    const experiences = rows.map(row => {
      let content;
      try {
        content = JSON.parse(row.content || '{}');
      } catch (e) {
        content = { description: row.content };
      }
      
      return {
        id: row.id,
        timestamp: row.timestamp,
        ...content
      };
    });
    
    // 保存到文件
    const outputPath = path.join(__dirname, 'db-experiences.json');
    fs.writeFileSync(outputPath, JSON.stringify(experiences, null, 2));
    console.log(`✅ 数据已导出到: ${outputPath}`);
    
    return experiences;
  } catch (e) {
    console.error('❌ 读取数据库失败:', e.message);
    return [];
  } finally {
    await connection.end();
  }
}

exportDBExperiences();
