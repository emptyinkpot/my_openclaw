/**
 * 经验积累模块 - OpenClaw 插件
 * 
 * 职责：
 * - 结构化记录问题解决经验
 * - 通过 MemorySync 同步到 memory-lancedb-pro
 * - 提供经验检索和统计分析
 */

import { IncomingMessage, ServerResponse } from 'http';
import { experienceRepo } from './src/core/ExperienceRepository';
import { syncExperienceToMemory } from './src/core/MemorySync';

// 插件信息
const PLUGIN_ID = 'experience-manager';
const PLUGIN_NAME = '经验积累系统';
const PLUGIN_VERSION = '1.0.0';

// JSON响应辅助函数
function jsonRes(res: ServerResponse, data: any, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data));
}

// 解析请求体
async function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// 解析 URL 查询参数
function parseQuery(url: string): Record<string, string> {
  const query: Record<string, string> = {};
  const queryStr = url.split('?')[1] || '';
  for (const pair of queryStr.split('&')) {
    const [key, value] = pair.split('=');
    if (key) query[decodeURIComponent(key)] = decodeURIComponent(value || '');
  }
  return query;
}

/**
 * 处理经验管理 API 请求
 */
async function handleExperienceApi(req: IncomingMessage, res: ServerResponse): Promise<boolean | void> {
  const url = req.url || '';
  const method = req.method || 'GET';
  const path = url.split('?')[0];
  const query = parseQuery(url);

  console.log(`[experience-manager] API request: ${method} ${path}`);

  // CORS 预检
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return true;
  }

  try {
    // GET /api/experience/stats - 获取统计
    if (path === '/api/experience/stats' && method === 'GET') {
      const rawStats = experienceRepo.getStats();
      // 转换为前端期望的格式
      const stats = {
        totalRecords: rawStats.totalRecords,
        totalXP: rawStats.totalXP,
        level: rawStats.level,
        levelTitle: rawStats.levelTitle,
        byType: rawStats.typeDistribution,
        byDifficulty: rawStats.difficultyDistribution,
        byTag: rawStats.tagDistribution,
        avgDifficulty: rawStats.totalRecords > 0 
          ? Object.entries(rawStats.difficultyDistribution)
              .reduce((sum, [d, count]) => sum + parseInt(d) * count, 0) / rawStats.totalRecords
          : 0,
        monthlyGrowth: rawStats.monthlyGrowth,
        recentRecords: rawStats.recentRecords,
      };
      jsonRes(res, { success: true, data: stats });
      return true;
    }

    // GET /api/experience/records - 获取所有记录
    if (path === '/api/experience/records' && method === 'GET') {
      const records = experienceRepo.getAll();
      jsonRes(res, { success: true, data: records });
      return true;
    }

    // POST /api/experience/records - 创建记录
    if (path === '/api/experience/records' && method === 'POST') {
      const body = await parseBody(req);
      const record = experienceRepo.create(body);
      
      // 同步到 memory-lancedb-pro
      if (process.env.EXPERIENCE_MEMORY_SYNC !== 'false') {
        syncExperienceToMemory(record).catch(err => {
          console.error('[experience-manager] 同步到 memory-lancedb-pro 失败:', err);
        });
      }
      
      jsonRes(res, { success: true, data: record });
      return true;
    }

    // GET /api/experience/search - 搜索记录
    if (path === '/api/experience/search' && method === 'GET') {
      const keyword = query.q || '';
      const records = keyword ? experienceRepo.search(keyword) : experienceRepo.getAll();
      jsonRes(res, { success: true, data: records });
      return true;
    }

    // GET /api/experience/tag/:tag - 按标签获取
    const tagMatch = path.match(/^\/api\/experience\/tag\/(.+)$/);
    if (tagMatch && method === 'GET') {
      const tag = decodeURIComponent(tagMatch[1]);
      const records = experienceRepo.getByTag(tag);
      jsonRes(res, { success: true, data: records });
      return true;
    }

    // GET /api/experience/records/:id - 获取单条记录
    const recordMatch = path.match(/^\/api\/experience\/records\/([a-zA-Z0-9-]+)$/);
    if (recordMatch && method === 'GET') {
      const record = experienceRepo.getById(recordMatch[1]);
      if (!record) {
        jsonRes(res, { success: false, error: '记录不存在' }, 404);
        return true;
      }
      jsonRes(res, { success: true, data: record });
      return true;
    }

    // PUT /api/experience/records/:id - 更新记录
    if (recordMatch && method === 'PUT') {
      const body = await parseBody(req);
      const record = experienceRepo.update(recordMatch[1], body);
      if (!record) {
        jsonRes(res, { success: false, error: '记录不存在' }, 404);
        return true;
      }
      jsonRes(res, { success: true, data: record });
      return true;
    }

    // DELETE /api/experience/records/:id - 删除记录
    if (recordMatch && method === 'DELETE') {
      const success = experienceRepo.delete(recordMatch[1]);
      if (!success) {
        jsonRes(res, { success: false, error: '记录不存在' }, 404);
        return true;
      }
      jsonRes(res, { success: true });
      return true;
    }

    // 未匹配的路由
    jsonRes(res, { success: false, error: 'Not found' }, 404);
    return true;

  } catch (error: any) {
    console.error('[experience-manager] API 错误:', error);
    jsonRes(res, { success: false, error: error.message }, 500);
    return true;
  }
}

/**
 * 处理经验页面请求
 */
async function handleExperiencePage(req: IncomingMessage, res: ServerResponse): Promise<boolean | void> {
  const url = req.url || '';
  const path = url.split('?')[0];
  
  if (path === '/experience.html' || path === '/experience') {
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>经验积累系统</title>
  <style>
    :root { --bg: #0f172a; --card: #1e293b; --text: #e2e8f0; --text-muted: #94a3b8; --accent: #3b82f6; --border: #334155; }
    body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); margin: 0; }
    .container { max-width: 1400px; margin: 0 auto; padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    h1 { font-size: 24px; font-weight: 600; margin: 0; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: var(--card); border-radius: 12px; padding: 20px; }
    .stat-value { font-size: 32px; font-weight: 700; color: var(--accent); }
    .stat-label { color: var(--text-muted); font-size: 14px; margin-top: 4px; }
    .records-list { background: var(--card); border-radius: 12px; padding: 20px; }
    .record-item { border-bottom: 1px solid var(--border); padding: 16px 0; }
    .record-item:last-child { border-bottom: none; }
    .record-title { font-weight: 600; margin-bottom: 8px; }
    .record-meta { display: flex; gap: 16px; font-size: 12px; color: var(--text-muted); flex-wrap: wrap; }
    .tag { background: var(--accent); padding: 2px 8px; border-radius: 4px; font-size: 11px; color: white; }
    .btn { padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; font-weight: 500; background: var(--accent); color: white; }
    .btn:hover { opacity: 0.9; }
    .type-bug { color: #ef4444; }
    .type-feature { color: #22c55e; }
    .type-optimization { color: #f59e0b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📚 经验积累系统</h1>
      <button class="btn" onclick="showCreateModal()">+ 记录经验</button>
    </div>
    <div class="stats-grid" id="statsGrid">
      <div class="stat-card">
        <div class="stat-value" id="totalCount">-</div>
        <div class="stat-label">总经验数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="bugCount">-</div>
        <div class="stat-label">Bug 修复</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="featureCount">-</div>
        <div class="stat-label">功能实现</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="avgDifficulty">-</div>
        <div class="stat-label">平均难度</div>
      </div>
    </div>
    <div class="records-list">
      <h3 style="margin-bottom: 16px;">经验列表</h3>
      <div id="recordsList">加载中...</div>
    </div>
  </div>
  <div id="createModal" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); z-index:1000; align-items:center; justify-content:center;">
    <div style="background:var(--card); padding:24px; border-radius:12px; width:90%; max-width:600px; max-height:80vh; overflow-y:auto;">
      <h3 style="margin-top:0;">记录新经验</h3>
      <form id="createForm">
        <div style="margin-bottom:16px;">
          <label style="display:block; margin-bottom:4px;">标题 *</label>
          <input type="text" name="title" required style="width:100%; padding:8px; background:var(--bg); border:1px solid var(--border); color:var(--text); border-radius:4px;">
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
          <div>
            <label style="display:block; margin-bottom:4px;">类型</label>
            <select name="type" style="width:100%; padding:8px; background:var(--bg); border:1px solid var(--border); color:var(--text); border-radius:4px;">
              <option value="bug">Bug 修复</option>
              <option value="feature">功能实现</option>
              <option value="optimization">优化改进</option>
              <option value="learning">学习笔记</option>
            </select>
          </div>
          <div>
            <label style="display:block; margin-bottom:4px;">难度 (1-5)</label>
            <input type="number" name="difficulty" min="1" max="5" value="3" style="width:100%; padding:8px; background:var(--bg); border:1px solid var(--border); color:var(--text); border-radius:4px;">
          </div>
        </div>
        <div style="margin-bottom:16px;">
          <label style="display:block; margin-bottom:4px;">问题描述</label>
          <textarea name="userQuery" rows="3" style="width:100%; padding:8px; background:var(--bg); border:1px solid var(--border); color:var(--text); border-radius:4px;"></textarea>
        </div>
        <div style="margin-bottom:16px;">
          <label style="display:block; margin-bottom:4px;">解决方案</label>
          <textarea name="solution" rows="3" style="width:100%; padding:8px; background:var(--bg); border:1px solid var(--border); color:var(--text); border-radius:4px;"></textarea>
        </div>
        <div style="margin-bottom:16px;">
          <label style="display:block; margin-bottom:4px;">标签 (逗号分隔)</label>
          <input type="text" name="tags" placeholder="tag1, tag2" style="width:100%; padding:8px; background:var(--bg); border:1px solid var(--border); color:var(--text); border-radius:4px;">
        </div>
        <div style="display:flex; gap:12px; justify-content:flex-end;">
          <button type="button" class="btn" style="background:var(--text-muted);" onclick="hideCreateModal()">取消</button>
          <button type="submit" class="btn">保存</button>
        </div>
      </form>
    </div>
  </div>
  <script>
    const API_BASE = '/api/experience';
    async function api(path, options = {}) {
      const res = await fetch(API_BASE + path, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer e1647cdb-1b80-4eee-a975-7599160cc89b',
          ...(options.headers || {})
        }
      });
      return res.json();
    }
    async function loadStats() {
      const result = await api('/stats');
      if (result.success) {
        const stats = result.data;
        document.getElementById('totalCount').textContent = stats.totalRecords || 0;
        document.getElementById('bugCount').textContent = stats.byType?.bug || 0;
        document.getElementById('featureCount').textContent = stats.byType?.feature || 0;
        document.getElementById('avgDifficulty').textContent = (stats.avgDifficulty || 0).toFixed(1);
      }
    }
    async function loadRecords() {
      const result = await api('/records');
      const container = document.getElementById('recordsList');
      if (result.success && result.data?.length > 0) {
        container.innerHTML = result.data.map(r => \`
          <div class="record-item">
            <div class="record-title">\${r.title}</div>
            <div class="record-meta">
              <span class="type-\${r.type}">\${r.type}</span>
              <span>难度: \${'⭐'.repeat(r.difficulty || 1)}</span>
              <span>\${(r.tags || []).map(t => \`<span class="tag">\${t}</span>\`).join(' ')}</span>
            </div>
          </div>
        \`).join('');
      } else {
        container.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 40px;">暂无经验记录</div>';
      }
    }
    function showCreateModal() {
      document.getElementById('createModal').style.display = 'flex';
    }
    function hideCreateModal() {
      document.getElementById('createModal').style.display = 'none';
      document.getElementById('createForm').reset();
    }
    document.getElementById('createForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const data = {
        title: form.title.value,
        type: form.type.value,
        difficulty: parseInt(form.difficulty.value),
        userQuery: form.userQuery.value,
        solution: form.solution.value,
        tags: form.tags.value.split(',').map(t => t.trim()).filter(Boolean),
        experienceGained: []
      };
      const result = await api('/records', { method: 'POST', body: JSON.stringify(data) });
      if (result.success) {
        hideCreateModal();
        loadStats();
        loadRecords();
      } else {
        alert('保存失败: ' + result.error);
      }
    });
    loadStats();
    loadRecords();
  </script>
</body>
</html>`;
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(html);
    return true;
  }
  
  return false;
}

/**
 * 初始化数据
 */
async function initializeData() {
  try {
    const stats = experienceRepo.getStats();
    console.log(`[experience-manager] 已加载 ${stats.totalRecords} 条经验记录`);
  } catch (error) {
    console.error('[experience-manager] 初始化数据失败:', error);
  }
}

/**
 * OpenClaw 插件定义
 */
const plugin = {
  id: PLUGIN_ID,
  name: PLUGIN_NAME,
  description: '自我学习与经验积累模块，记录问题解决经验',
  version: PLUGIN_VERSION,
  configSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {}
  },
  
  /**
   * 注册插件
   */
  register(api: any) {
    console.log(`[${PLUGIN_ID}] Plugin registered`);
    
    // 注册页面路由
    if (api?.registerHttpRoute) {
      console.log(`[${PLUGIN_ID}] 注册 HTTP 路由...`);
      
      // 页面路由 - 无需认证
      api.registerHttpRoute({
        path: '/experience.html',
        match: 'exact',
        handler: handleExperiencePage,
        auth: 'plugin'
      });
      
      // API 路由 - 需要 Gateway 认证
      api.registerHttpRoute({
        path: '/api/experience',
        match: 'prefix',
        handler: handleExperienceApi,
        auth: 'gateway'
      });
      
      console.log(`[${PLUGIN_ID}] 路由注册完成`);
    }
  },
  
  /**
   * 激活插件
   */
  async activate() {
    console.log(`[${PLUGIN_ID}] Plugin activated`);
    await initializeData();
  }
};

export default plugin;
export const register = plugin.register;
export const activate = plugin.activate;

// 导出核心功能
export { experienceRepo, syncExperienceToMemory };
export { ExperienceRepository } from './src/core/ExperienceRepository';
