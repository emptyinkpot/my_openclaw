
const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: 'sh-cynosdbmysql-grp-1kbg1xh0.sql.tencentcdb.com',
  port: 22295,
  user: 'openclaw',
  password: 'Lgp15237257500',
  database: 'cloudbase-4glvyyq9f61b19cd'
};

async function cleanPendingStatus() {
  let connection;
  
  try {
    console.log('正在连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('✅ 数据库连接成功！');
    console.log('');
    
    // 1. 查看 pending 状态的章节
    console.log('📊 正在查询 pending 状态的章节...');
    const [pendingChapters] = await connection.execute(
      'SELECT id, work_id, chapter_number, title, status, content, word_count FROM chapters WHERE status = ?',
      ['pending']
    );
    
    console.log('找到', pendingChapters.length, '个 pending 状态的章节');
    
    if (pendingChapters.length === 0) {
      console.log('✅ 没有 pending 状态的章节需要清理！');
      return;
    }
    
    console.log('');
    console.log('📋 pending 状态的章节列表：');
    pendingChapters.forEach((chapter, index) =&gt; {
      const hasContent = chapter.content &amp;&amp; chapter.content.length &gt; 0;
      const newStatus = hasContent ? 'first_draft' : 'outline';
      console.log(index + 1 + '. 作品ID: ' + chapter.work_id + ', 章节: ' + chapter.chapter_number + ', 标题: ' + (chapter.title || '无标题') + ', 当前状态: ' + chapter.status + ', 新状态: ' + newStatus);
    });
    
    console.log('');
    
    // 2. 清理 pending 状态的章节
    console.log('🔧 正在清理 pending 状态的章节...');
    
    // 2.1 转换有内容的 pending -&gt; first_draft
    const [result1] = await connection.execute(
      'UPDATE chapters SET status = ?, updated_at = NOW() WHERE status = ? AND content IS NOT NULL AND LENGTH(content) &gt; 0',
      ['first_draft', 'pending']
    );
    console.log('✅ 转换了', result1.affectedRows, '个有内容的章节: pending -&gt; first_draft');
    
    // 2.2 转换无内容的 pending -&gt; outline
    const [result2] = await connection.execute(
      'UPDATE chapters SET status = ?, updated_at = NOW() WHERE status = ? AND (content IS NULL OR LENGTH(content) = 0)',
      ['outline', 'pending']
    );
    console.log('✅ 转换了', result2.affectedRows, '个无内容的章节: pending -&gt; outline');
    
    console.log('');
    
    // 3. 验证清理结果
    console.log('📊 验证清理结果...');
    const [remainingPending] = await connection.execute(
      'SELECT id, work_id, chapter_number FROM chapters WHERE status = ?',
      ['pending']
    );
    
    if (remainingPending.length === 0) {
      console.log('🎉 所有 pending 状态的章节已清理完毕！');
    } else {
      console.log('⚠️ 还有', remainingPending.length, '个 pending 状态的章节未清理：');
      remainingPending.forEach(chapter =&gt; {
        console.log('  - 作品ID:', chapter.work_id, ', 章节:', chapter.chapter_number);
      });
    }
    
    console.log('');
    console.log('✅ 清理完成！');
    
  } catch (error) {
    console.error('❌ 清理失败:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 执行清理
cleanPendingStatus();
