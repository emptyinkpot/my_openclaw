/**
 * 经验积累模块 - OpenClaw 插件
 * 
 * 职责：
 * - 结构化记录问题解决经验
 * - 通过 MemorySync 同步到 memory-lancedb-pro
 * - 提供经验检索和统计分析
 */

import { IncomingMessage, ServerResponse } from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { experienceRepo } from './src/core/ExperienceRepository';
import { noteRepo } from './src/core/NoteRepository';
import { syncExperienceToMemory } from './src/core/MemorySync';

// 读取专栏数据
function getColumnsData(): any[] {
  try {
    // 尝试多个候选路径
    const candidates = [
      // 从源码目录计算
      path.join(__dirname, 'data', 'columns.json'),
      // 从编译后目录计算（dist/ -> data/）
      path.join(__dirname, '..', 'data', 'columns.json'),
      // 绝对路径
      '/workspace/projects/extensions/plugins/experience-manager/data/columns.json',
    ];
    
    for (const columnsPath of candidates) {
      if (fs.existsSync(columnsPath)) {
        console.log(`[experience-manager] 找到专栏数据: ${columnsPath}`);
        const content = fs.readFileSync(columnsPath, 'utf-8');
        const data = JSON.parse(content);
        return data.columns || [];
      }
    }
    console.log(`[experience-manager] 未找到专栏数据，尝试的路径:`, candidates);
  } catch (e) {
    console.error('[experience-manager] 读取专栏数据失败:', e);
  }
  return [];
}

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

    // ========== 笔记相关 API ==========

    // GET /api/experience/notes - 获取所有笔记
    if (path === '/api/experience/notes' && method === 'GET') {
      const notes = noteRepo.getAll();
      jsonRes(res, { success: true, data: notes });
      return true;
    }

    // GET /api/experience/notes/categories - 获取笔记分类
    if (path === '/api/experience/notes/categories' && method === 'GET') {
      const categories = noteRepo.getCategories();
      jsonRes(res, { success: true, data: categories });
      return true;
    }

    // POST /api/experience/notes - 创建笔记
    if (path === '/api/experience/notes' && method === 'POST') {
      const body = await parseBody(req);
      const note = noteRepo.create(body);
      jsonRes(res, { success: true, data: note });
      return true;
    }

    // GET /api/experience/notes/:id - 获取单条笔记
    const noteMatch = path.match(/^\/api\/experience\/notes\/([a-zA-Z0-9-_]+)$/);
    if (noteMatch && method === 'GET') {
      const note = noteRepo.getById(noteMatch[1]);
      if (!note) {
        jsonRes(res, { success: false, error: '笔记不存在' }, 404);
        return true;
      }
      jsonRes(res, { success: true, data: note });
      return true;
    }

    // PUT /api/experience/notes/:id - 更新笔记
    if (noteMatch && method === 'PUT') {
      const body = await parseBody(req);
      const note = noteRepo.update(noteMatch[1], body);
      if (!note) {
        jsonRes(res, { success: false, error: '笔记不存在' }, 404);
        return true;
      }
      jsonRes(res, { success: true, data: note });
      return true;
    }

    // DELETE /api/experience/notes/:id - 删除笔记
    if (noteMatch && method === 'DELETE') {
      const success = noteRepo.delete(noteMatch[1]);
      if (!success) {
        jsonRes(res, { success: false, error: '笔记不存在' }, 404);
        return true;
      }
      jsonRes(res, { success: true });
      return true;
    }

    // ========== 专栏相关 API ==========

    // GET /api/experience/columns - 获取所有专栏
    if (path === '/api/experience/columns' && method === 'GET') {
      const columns = getColumnsData();
      jsonRes(res, { success: true, data: columns });
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

// 获取导航栏HTML
function getNavBarHtml(): string {
  const navBarPath = path.join(__dirname, '..', '..', 'public', 'nav-bar.html');
  try {
    return fs.readFileSync(navBarPath, 'utf-8');
  } catch (e) {
    console.error('[experience-manager] 无法读取导航栏文件:', navBarPath);
    return '<div class="nav-bar">导航栏加载失败</div>';
  }
}

// 注入导航栏到页面HTML中
function injectNavBar(html: string, currentPage: string): string {
  let navBarHtml = getNavBarHtml();
  
  // 给经验页面链接添加 "on" 类
  if (currentPage === 'experience.html') {
    navBarHtml = navBarHtml.replace('href="/experience.html"', 'href="/experience.html" class="on"');
  }
  
  // 添加动态设置导航栏高度的脚本
  const dynamicHeightScript = `
<script>
// 动态设置导航栏高度
(function() {
  function setNavHeight() {
    const navBar = document.querySelector('.nav-bar');
    if (navBar) {
      const height = navBar.offsetHeight;
      document.documentElement.style.setProperty('--nav-height', height + 'px');
      
      // 给 body 添加 padding-top
      document.body.style.paddingTop = 'var(--nav-height)';
    }
  }
  
  // 使用 MutationObserver 监听导航栏加载
  const observer = new MutationObserver(function() {
    const navBar = document.querySelector('.nav-bar');
    if (navBar) {
      observer.disconnect();
      setNavHeight();
    }
  });
  
  observer.observe(document.documentElement, { childList: true, subtree: true });
  
  // 立即尝试执行
  setNavHeight();
  
  // DOMContentLoaded 时再次执行
  document.addEventListener('DOMContentLoaded', setNavHeight);
  
  // load 时再次执行
  window.addEventListener('load', setNavHeight);
  
  // 监听窗口大小变化
  window.addEventListener('resize', setNavHeight);
})();
</script>
`;
  
  navBarHtml = navBarHtml + dynamicHeightScript;
  
  // 尝试替换页面中的 <div class="nav-bar"> 部分（更宽松的匹配）
  // 匹配从 <div class="nav-bar"> 到 </div>，包括可能的空白字符
  const navBarRegex = /<div[^>]*class="[^"]*nav-bar[^"]*"[^>]*>[\s\S]*?<\/div>/;
  
  if (navBarRegex.test(html)) {
    return html.replace(navBarRegex, navBarHtml);
  }
  
  // 如果没有找到，尝试在 <body> 标签后注入
  if (html.includes('<body>')) {
    return html.replace('<body>', '<body>' + navBarHtml);
  }
  
  return html;
}

// 获取经验页面HTML
function getExperiencePageHtml(): string {
  const htmlPath = path.join(__dirname, '..', '..', 'public', 'experience.html');
  try {
    let html = fs.readFileSync(htmlPath, 'utf-8');
    // 注入导航栏，传入当前页面
    html = injectNavBar(html, 'experience.html');
    return html;
  } catch (e) {
    console.error('[experience-manager] 无法读取HTML文件:', htmlPath);
    return '<html><body><h1>页面加载失败</h1></body></html>';
  }
}

/**
 * 处理经验页面请求
 */
async function handleExperiencePage(req: IncomingMessage, res: ServerResponse): Promise<boolean | void> {
  const url = req.url || '';
  const path = url.split('?')[0];
  
  if (path === '/experience.html' || path === '/experience') {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(getExperiencePageHtml());
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
    
    const notes = noteRepo.getAll();
    console.log(`[experience-manager] 已加载 ${notes.length} 条笔记`);
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
    
    // 注册页面路由和 API 路由
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
