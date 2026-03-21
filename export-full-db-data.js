const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function exportFullDBData() {
  const connection = await mysql.createConnection({
    host: 'sh-cynosdbmysql-grp-1kbg1xh0.sql.tencentcdb.com',
    port: 22295,
    user: 'openclaw',
    password: 'Lgp15237257500',
    database: 'cloudbase-4glvyyq9f61b19cd'
  });

  try {
    // 导出经验记录
    console.log('=== 导出经验记录 ===');
    const [expRows] = await connection.execute('SELECT * FROM experience_records ORDER BY timestamp DESC');
    console.log(`✅ 数据库中有 ${expRows.length} 条经验记录！`);
    
    const experiences = expRows.map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      description: row.description,
      userQuery: row.user_query,
      solution: row.solution,
      experienceApplied: row.experience_applied,
      experienceGained: row.experience_gained,
      tags: row.tags,
      difficulty: row.difficulty,
      xpGained: row.xp_gained,
      timestamp: row.timestamp
    }));
    
    const expOutputPath = path.join(__dirname, 'db-experiences-full.json');
    fs.writeFileSync(expOutputPath, JSON.stringify(experiences, null, 2));
    console.log(`✅ 经验记录已导出到: ${expOutputPath}`);
    
    // 导出笔记
    console.log('\n=== 导出笔记 ===');
    const [notesRows] = await connection.execute('SELECT * FROM notes ORDER BY created_at DESC');
    console.log(`✅ 数据库中有 ${notesRows.length} 条笔记！`);
    
    const notes = notesRows.map(row => ({
      id: row.id,
      title: row.title,
      content: row.content,
      tags: row.tags,
      category: row.category,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    const notesOutputPath = path.join(__dirname, 'db-notes.json');
    fs.writeFileSync(notesOutputPath, JSON.stringify(notes, null, 2));
    console.log(`✅ 笔记已导出到: ${notesOutputPath}`);
    
    // 查看笔记表结构
    console.log('\n=== 笔记表结构 ===');
    const [columns] = await connection.execute('DESCRIBE notes');
    console.table(columns);
    
    // 查看前几条笔记
    console.log('\n=== 前 3 条笔记 ===');
    const [sampleNotes] = await connection.execute('SELECT * FROM notes ORDER BY created_at DESC LIMIT 3');
    sampleNotes.forEach((note, i) => {
      console.log(`\n笔记 ${i + 1}:`);
      console.log(`标题: ${note.title}`);
      console.log(`分类: ${note.category}`);
      console.log(`内容: ${note.content ? note.content.substring(0, 100) + '...' : '无内容'}`);
    });
    
    return { experiences, notes };
  } catch (e) {
    console.error('❌ 导出失败:', e.message);
    return { experiences: [], notes: [] };
  } finally {
    await connection.end();
  }
}

exportFullDBData();
