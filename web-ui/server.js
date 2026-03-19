const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const PORT = 3000;

// MySQL 配置
const dbConfig = {
  host: 'sh-cynosdbmysql-grp-1kbg1xh0.sql.tencentcdb.com',
  port: 22295,
  user: 'openclaw',
  password: 'Lgp15237257500',
  database: 'cloudbase-4glvyyq9f61b19cd',
  charset: 'utf8mb4'
};

// 中间件
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============ API 路由 ============

// 获取所有作品
app.get('/api/works', async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [works] = await conn.execute(`
      SELECT w.*, 
        (SELECT COUNT(*) FROM chapters WHERE work_id = w.id) as chapter_count,
        (SELECT COUNT(*) FROM chapters WHERE work_id = w.id AND word_count > 100) as has_content_count
      FROM works w
    `);
    await conn.end();
    res.json({ success: true, data: works });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取作品详情
app.get('/api/works/:id', async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [works] = await conn.execute('SELECT * FROM works WHERE id = ?', [req.params.id]);
    await conn.end();
    if (works.length === 0) {
      return res.status(404).json({ success: false, error: '作品不存在' });
    }
    res.json({ success: true, data: works[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取作品章节列表
app.get('/api/works/:id/chapters', async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [chapters] = await conn.execute(`
      SELECT id, chapter_number, title, word_count, status, created_at, updated_at
      FROM chapters 
      WHERE work_id = ? 
      ORDER BY chapter_number
    `, [req.params.id]);
    await conn.end();
    res.json({ success: true, data: chapters });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取章节详情
app.get('/api/chapters/:id', async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [chapters] = await conn.execute(`
      SELECT c.*, o.plot_summary, o.main_scenes, o.characters as outline_characters, o.emotion_tone
      FROM chapters c
      LEFT JOIN chapter_outlines o ON c.work_id = o.work_id AND c.chapter_number = o.chapter_number
      WHERE c.id = ?
    `, [req.params.id]);
    await conn.end();
    if (chapters.length === 0) {
      return res.status(404).json({ success: false, error: '章节不存在' });
    }
    res.json({ success: true, data: chapters[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取作品卷大纲
app.get('/api/works/:id/volumes', async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [volumes] = await conn.execute(`
      SELECT * FROM volume_outlines WHERE work_id = ? ORDER BY volume_number
    `, [req.params.id]);
    await conn.end();
    res.json({ success: true, data: volumes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取作品角色
app.get('/api/works/:id/characters', async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [characters] = await conn.execute(`
      SELECT * FROM characters WHERE work_id = ?
    `, [req.params.id]);
    await conn.end();
    res.json({ success: true, data: characters });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取章节大纲列表
app.get('/api/works/:id/outlines', async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [outlines] = await conn.execute(`
      SELECT * FROM chapter_outlines WHERE work_id = ? ORDER BY chapter_number
    `, [req.params.id]);
    await conn.end();
    res.json({ success: true, data: outlines });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取统计信息
app.get('/api/stats', async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    
    const [workStats] = await conn.execute(`SELECT COUNT(*) as count FROM works`);
    const [chapterStats] = await conn.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN word_count > 100 THEN 1 ELSE 0 END) as has_content,
        SUM(word_count) as total_words
      FROM chapters
    `);
    const [charStats] = await conn.execute(`SELECT COUNT(*) as count FROM characters`);
    const [outlineStats] = await conn.execute(`SELECT COUNT(*) as count FROM chapter_outlines`);
    
    await conn.end();
    
    res.json({
      success: true,
      data: {
        works: workStats[0].count,
        chapters: chapterStats[0].total,
        chaptersWithContent: chapterStats[0].has_content,
        totalWords: chapterStats[0].total_words,
        characters: charStats[0].count,
        outlines: outlineStats[0].count
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 搜索章节
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json({ success: true, data: [] });
    }
    
    const conn = await mysql.createConnection(dbConfig);
    const [results] = await conn.execute(`
      SELECT c.id, c.work_id, c.chapter_number, c.title, c.word_count, w.title as work_title
      FROM chapters c
      JOIN works w ON c.work_id = w.id
      WHERE c.title LIKE ? OR c.content LIKE ?
      ORDER BY c.chapter_number
      LIMIT 50
    `, [`%${q}%`, `%${q}%`]);
    await conn.end();
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 番茄扫描流水线 API ============

// 流水线进度存储
const pipelineProgressStore = new Map();

// 获取番茄作品列表
app.get('/api/fanqie/works/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    
    // 从数据库获取作品列表
    const conn = await mysql.createConnection(dbConfig);
    const [works] = await conn.execute(`
      SELECT id, title, status, 
        (SELECT COUNT(*) FROM chapters WHERE work_id = works.id) as chapterCount
      FROM works 
      WHERE source = 'fanqie' OR source IS NULL
      ORDER BY updated_at DESC
    `);
    await conn.end();
    
    const data = works.map(w => ({
      workId: String(w.id),
      title: w.title,
      chapterCount: w.chapterCount,
      status: w.status || 'draft'
    }));
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 扫描番茄作品
app.post('/api/fanqie/scan', async (req, res) => {
  try {
    const { accountId } = req.body;
    
    // 返回数据库中的作品
    const conn = await mysql.createConnection(dbConfig);
    const [works] = await conn.execute(`
      SELECT id, title, status,
        (SELECT COUNT(*) FROM chapters WHERE work_id = works.id) as chapterCount
      FROM works 
      ORDER BY updated_at DESC
    `);
    await conn.end();
    
    const data = works.map(w => ({
      workId: String(w.id),
      title: w.title,
      chapterCount: w.chapterCount,
      status: w.status || 'draft'
    }));
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 启动发布流水线
app.post('/api/fanqie/publish', async (req, res) => {
  try {
    const { workId, headless, dryRun, skipAudit, progressId, startChapter, endChapter } = req.body;
    
    if (!workId) {
      return res.status(400).json({ success: false, error: '缺少 workId' });
    }
    
    // 初始化进度
    const progress = {
      status: 'running',
      step: 'init',
      task: '正在初始化流水线...',
      percent: 0,
      results: [],
      startTime: Date.now()
    };
    pipelineProgressStore.set(progressId, progress);
    
    // 返回成功，实际处理在后台进行
    res.json({ success: true, progressId });
    
    // 模拟流水线进度（实际应该调用 FanqiePublisher）
    simulatePipeline(progressId, workId);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// SSE 进度推送
app.get('/api/fanqie/publish/progress/:id', (req, res) => {
  const { id } = req.params;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // 发送当前进度
  const sendProgress = () => {
    const progress = pipelineProgressStore.get(id);
    if (progress) {
      const elapsed = Date.now() - progress.startTime;
      res.write(`data: ${JSON.stringify({ ...progress, elapsed })}\n\n`);
      
      if (progress.status === 'completed' || progress.status === 'error') {
        res.end();
        pipelineProgressStore.delete(id);
      }
    }
  };
  
  // 定期发送进度
  const interval = setInterval(sendProgress, 500);
  
  // 初始发送
  sendProgress();
  
  // 清理
  req.on('close', () => {
    clearInterval(interval);
  });
});

// 模拟流水线进度（实际应调用真实服务）
async function simulatePipeline(progressId, workId) {
  const steps = [
    { step: 'init', task: '正在初始化流水线...', percent: 10 },
    { step: 'scan', task: '正在扫描章节...', percent: 30 },
    { step: 'audit', task: '正在审核内容...', percent: 50 },
    { step: 'publish', task: '正在发布章节...', percent: 70 }
  ];
  
  for (const s of steps) {
    await new Promise(r => setTimeout(r, 2000));
    
    const progress = pipelineProgressStore.get(progressId);
    if (!progress || progress.status !== 'running') break;
    
    progress.step = s.step;
    progress.task = s.task;
    progress.percent = s.percent;
    
    // 添加模拟结果
    if (s.step === 'publish') {
      progress.results.push({
        success: true,
        chapterNumber: Math.floor(Math.random() * 100) + 1,
        message: '发布成功'
      });
    }
  }
  
  // 完成
  const progress = pipelineProgressStore.get(progressId);
  if (progress && progress.status === 'running') {
    progress.status = 'completed';
    progress.step = 'done';
    progress.task = '流水线执行完成';
    progress.percent = 100;
  }
}

// 启动服务器 - 绑定到所有接口
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n📚 小说数据管理界面已启动`);
  console.log(`🌐 访问地址: http://0.0.0.0:${PORT}`);
  console.log(`\n按 Ctrl+C 停止服务\n`);
});
