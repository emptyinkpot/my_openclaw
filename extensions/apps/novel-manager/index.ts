/**
 * 小说管理模块 - OpenClaw 插件
 */
import { IncomingMessage, ServerResponse } from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { NovelService } from './services/novel-service';
import { getDatabaseManager } from './core/data-scan-storage/database';

// 导入禁用词处理步骤
import { BannedWordsStep } from './core/content-craft/src/steps/process/banned-words';
// 导入配置管理器
import { configManager } from './core/content-craft/src/config-manager';
// 导入文本生成功能
import { GenerationPipeline } from './core/content-craft/src/generation-pipeline';
// 导入文本润色功能
import { PolishPipeline } from './core/content-craft/src/pipeline';
// 导入番茄发布功能
import { FanqieSimplePipeline } from './core/fanqie-simple-pipeline/FanqieSimplePipeline';

// 尝试导入 registerPluginHttpRoute
let registerPluginHttpRoute: any;
try {
  // @ts-ignore
  registerPluginHttpRoute = require('@openclaw/plugin-sdk').registerPluginHttpRoute;
} catch (e) {
  console.log('[novel-manager] 无法加载 plugin-sdk，将使用备用方案');
}

// 服务实例
let novelService: NovelService | null = null;
let htmlCache: string | null = null;

function getNovelService(): NovelService {
  if (!novelService) {
    novelService = new NovelService();
  }
  return novelService;
}

// 获取项目结构
async function getProjectStructure() {
  const projectRoot = path.join(__dirname, '..', '..', '..');
  
  // 获取插件列表
  const pluginsDir = path.join(projectRoot, 'extensions', 'apps');
  const plugins: string[] = [];
  try {
    const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        plugins.push(entry.name);
      }
    }
  } catch (e) {
    console.error('[ProjectStructure] 获取插件列表失败:', e);
  }

  // 获取 API 路由列表（从本文件中提取）
  const apiRoutes: string[] = [];
  try {
    const content = fs.readFileSync(__filename, 'utf-8');
    const matches = content.match(/path === '\/api\/novel\/[^']+'/g);
    if (matches) {
      const uniqueRoutes = new Set<string>();
      matches.forEach(m => {
        const route = m.match(/'(\/api\/novel\/[^']+)'/)?.[1];
        if (route) uniqueRoutes.add(route);
      });
      apiRoutes.push(...Array.from(uniqueRoutes).sort());
    }
  } catch (e) {
    console.error('[ProjectStructure] 获取API路由失败:', e);
  }

  // 获取内容工艺模块的步骤
  const contentCraftSteps: string[] = [];
  try {
    const stepsDir = path.join(__dirname, 'core', 'content-craft', 'src', 'steps');
    if (fs.existsSync(stepsDir)) {
      const entries = fs.readdirSync(stepsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          contentCraftSteps.push(entry.name);
        }
      }
    }
  } catch (e) {
    console.error('[ProjectStructure] 获取内容工艺步骤失败:', e);
  }

  // 获取服务列表
  const services: string[] = [];
  try {
    const servicesDir = path.join(__dirname, 'services');
    if (fs.existsSync(servicesDir)) {
      const entries = fs.readdirSync(servicesDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
          services.push(entry.name.replace(/\.(ts|js)$/, ''));
        }
      }
    }
  } catch (e) {
    console.error('[ProjectStructure] 获取服务列表失败:', e);
  }

  return {
    projectRoot,
    timestamp: new Date().toISOString(),
    modules: {
      plugins,
      apiRoutes,
      contentCraftSteps,
      services
    },
    structure: {
      frontend: {
        status: 'active',
        description: 'Control UI (原生界面)',
        components: ['Control UI', 'Dashboard']
      },
      backend: {
        routing: {
          status: 'active',
          count: apiRoutes.length,
          routes: apiRoutes
        },
        services: {
          status: 'active',
          count: services.length,
          list: services
        },
        database: {
          status: 'active',
          description: 'SQLite 数据库'
        }
      },
      contentCraft: {
        status: 'active',
        steps: contentCraftSteps
      },
      plugins: {
        status: 'active',
        count: plugins.length,
        list: plugins
      }
    }
  };
}

// 获取小说管理界面HTML
function getNovelHtml(): string {
  if (htmlCache) return htmlCache;
  
  const htmlPath = path.join(__dirname, '..', '..', 'public', 'index.html');
  try {
    htmlCache = fs.readFileSync(htmlPath, 'utf-8');
    return htmlCache;
  } catch (e) {
    console.error('[novel-manager] 无法读取HTML文件:', htmlPath);
    return '<html><body><h1>小说管理界面加载失败</h1></body></html>';
  }
}

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
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// 解析URL参数
function parseQuery(url: string): Record<string, string> {
  const query: Record<string, string> = {};
  const queryString = url.split('?')[1] || '';
  for (const pair of queryString.split('&')) {
    const [key, value] = pair.split('=');
    if (key) query[decodeURIComponent(key)] = decodeURIComponent(value || '');
  }
  return query;
}

// 获取导航栏HTML
function getNavBarHtml(): string {
  const navBarPath = path.join(__dirname, '..', '..', 'public', 'nav-bar.html');
  try {
    return fs.readFileSync(navBarPath, 'utf-8');
  } catch (e) {
    console.error('[novel-manager] 无法读取导航栏文件:', navBarPath);
    return '<div class="nav-bar">导航栏加载失败</div>';
  }
}

// 注入导航栏到页面HTML中
function injectNavBar(html: string, currentPage: string): string {
  let navBarHtml = getNavBarHtml();
  
  // 根据当前页面给对应的链接添加 "on" 类
  const pageToLinkMap: Record<string, string> = {
    'index.html': '/novel/',
    'cache.html': '/cache.html',
    'project-structure.html': '/project-structure.html',
    'logs.html': '/logs.html',
    'cache-manage.html': '/cache-manage.html',
    'publish.html': '/publish.html',
    'experience.html': '/experience.html',
    'feishu.html': '/feishu.html'
  };
  
  const currentLink = pageToLinkMap[currentPage];
  if (currentLink) {
    // 给当前链接添加 "on" 类
    const linkRegex = new RegExp(`href="${currentLink}"`, 'g');
    navBarHtml = navBarHtml.replace(linkRegex, `href="${currentLink}" class="on"`);
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
  
  // 尝试替换页面中的 <div class="nav-bar"> 部分
  const navBarRegex = /<div class="nav-bar">[\s\S]*?<\/div>\s*<\/div>?/;
  
  if (navBarRegex.test(html)) {
    return html.replace(navBarRegex, navBarHtml);
  }
  
  // 如果没有找到，尝试在 <body> 标签后注入
  if (html.includes('<body>')) {
    return html.replace('<body>', '<body>' + navBarHtml);
  }
  
  return html;
}

// 获取页面HTML
function getPageHtml(pageName: string): string {
  // 原生界面使用control-ui目录
  if (pageName === 'native.html') {
    const nativePath = '/usr/lib/node_modules/openclaw/dist/control-ui/index.html';
    try {
      return fs.readFileSync(nativePath, 'utf-8');
    } catch (e) {
      console.error('[novel-manager] 无法读取原生界面:', nativePath);
      return '<html><body><h1>原生界面加载失败</h1></body></html>';
    }
  }
  
  const htmlPath = path.join(__dirname, '..', '..', 'public', pageName);
  try {
    let html = fs.readFileSync(htmlPath, 'utf-8');
    // 注入导航栏，传入当前页面
    html = injectNavBar(html, pageName);
    return html;
  } catch (e) {
    console.error('[novel-manager] 无法读取HTML文件:', htmlPath);
    return '<html><body><h1>页面加载失败</h1></body></html>';
  }
}

// 处理项目结构页面
function getProjectStructureHtml(): string {
  let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>工程结构 - 项目监视器</title>
  <style>
    :root {
      --bg: #0f172a;
      --bg-secondary: #1e293b;
      --card: #1e293b;
      --text: #e2e8f0;
      --text-muted: #94a3b8;
      --accent: #3b82f6;
      --accent-hover: #2563eb;
      --border: #334155;
      --success: #22c55e;
      --warning: #f59e0b;
      --danger: #ef4444;
    }
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      min-height: 100vh;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border);
    }
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header h1 .badge {
      font-size: 14px;
      font-weight: 500;
      background: var(--accent);
      padding: 4px 12px;
      border-radius: 6px;
    }
    .refresh-btn {
      padding: 10px 20px;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .refresh-btn:hover { background: var(--accent-hover); }
    .refresh-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }
    .card {
      background: var(--card);
      border-radius: 12px;
      padding: 20px;
      border: 1px solid var(--border);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
    }
    .card-title {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }
    .status-badge {
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 4px;
      font-weight: 500;
    }
    .status-active { background: var(--success); color: white; }
    .status-warning { background: var(--warning); color: #1f2937; }
    .status-danger { background: var(--danger); color: white; }
    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: var(--accent);
      margin-bottom: 4px;
    }
    .stat-label {
      color: var(--text-muted);
      font-size: 13px;
    }
    .list {
      max-height: 300px;
      overflow-y: auto;
    }
    .list-item {
      padding: 10px 0;
      border-bottom: 1px solid var(--border);
      font-size: 13px;
    }
    .list-item:last-child { border-bottom: none; }
    .list-item code {
      background: var(--bg);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
    }
    .timestamp {
      color: var(--text-muted);
      font-size: 12px;
      margin-top: 12px;
    }
    .loading {
      text-align: center;
      padding: 40px;
      color: var(--text-muted);
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-muted);
      margin: 20px 0 12px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .full-width {
      grid-column: 1 / -1;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>
        🏗️ 工程结构
        <span class="badge">项目监视器</span>
      </h1>
      <button class="refresh-btn" id="refreshBtn" onclick="loadData()">
        <span>🔄</span>
        刷新
      </button>
    </div>

    <div id="content">
      <div class="loading">加载中...</div>
    </div>
  </div>

  <script>
    const API_BASE = '/api/novel';
    const TOKEN = 'e1647cdb-1b80-4eee-a975-7599160cc89b';

    async function api(path, options = {}) {
      const res = await fetch(API_BASE + path, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + TOKEN,
          ...(options.headers || {})
        }
      });
      return res.json();
    }

    async function loadData() {
      const btn = document.getElementById('refreshBtn');
      btn.disabled = true;
      
      try {
        const result = await api('/project-structure');
        if (result.success) {
          renderData(result.data);
        } else {
          document.getElementById('content').innerHTML = \`
            <div class="loading">加载失败: \${result.error}</div>
          \`;
        }
      } catch (e) {
        document.getElementById('content').innerHTML = \`
          <div class="loading">网络错误: \${e.message}</div>
        \`;
      } finally {
        btn.disabled = false;
      }
    }

    function renderData(data) {
      const { structure, modules, timestamp } = data;
      
      document.getElementById('content').innerHTML = \`
        <div class="timestamp">最后更新: \${new Date(timestamp).toLocaleString('zh-CN')}</div>
        
        <div class="grid">
          <!-- 前端模块 -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">🎨 前端层</h3>
              <span class="status-badge status-active">Active</span>
            </div>
            <div class="stat-value">\${structure.frontend.components.length}</div>
            <div class="stat-label">组件</div>
            <div class="list">
              \${structure.frontend.components.map(c => \`<div class="list-item">\${c}</div>\`).join('')}
            </div>
          </div>

          <!-- 后端路由 -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">🔌 后端路由层</h3>
              <span class="status-badge status-active">Active</span>
            </div>
            <div class="stat-value">\${structure.backend.routing.count}</div>
            <div class="stat-label">API 端点</div>
          </div>

          <!-- 后端服务 -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">⚙️ 后端服务层</h3>
              <span class="status-badge status-active">Active</span>
            </div>
            <div class="stat-value">\${structure.backend.services.count}</div>
            <div class="stat-label">服务</div>
            <div class="list">
              \${structure.backend.services.list.map(s => \`<div class="list-item"><code>\${s}</code></div>\`).join('')}
            </div>
          </div>

          <!-- 内容工艺 -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">✏️ 内容工艺模块</h3>
              <span class="status-badge status-active">Active</span>
            </div>
            <div class="stat-value">\${structure.contentCraft.steps.length}</div>
            <div class="stat-label">处理步骤</div>
            <div class="list">
              \${structure.contentCraft.steps.map(s => \`<div class="list-item"><code>\${s}</code></div>\`).join('')}
            </div>
          </div>

          <!-- 插件模块 -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">🔌 插件模块</h3>
              <span class="status-badge status-active">Active</span>
            </div>
            <div class="stat-value">\${structure.plugins.count}</div>
            <div class="stat-label">插件</div>
            <div class="list">
              \${structure.plugins.list.map(p => \`<div class="list-item"><code>\${p}</code></div>\`).join('')}
            </div>
          </div>
        </div>

        <!-- API 路由详情 -->
        <div class="card full-width">
          <div class="card-header">
            <h3 class="card-title">📋 API 端点详情</h3>
          </div>
          <div class="list">
            \${structure.backend.routing.routes.map(r => \`<div class="list-item"><code>\${r}</code></div>\`).join('')}
          </div>
        </div>
      \`;
    }

    loadData();
  </script>
</body>
</html>`;
  
  // 注入导航栏
  html = injectNavBar(html, 'project-structure.html');
  return html;
}

// 路由处理器 - 处理页面请求（不需要认证）
async function handleNovelPage(req: IncomingMessage, res: ServerResponse): Promise<boolean | void> {
  const url = req.url || '';
  const urlPath = url.split('?')[0];

  // 页面路由映射 - 原生界面作为默认首页
  const pageMap: Record<string, string> = {
    '/': 'native.html',          // 默认首页 = 原生界面
    '/novel': 'index.html',
    '/novel/': 'index.html',
    '/cache.html': 'cache.html',
    '/project-structure.html': 'project-structure.html',
    // 新拆分的独立页面
    '/logs.html': 'logs.html',
    '/cache-manage.html': 'cache-manage.html',
    '/publish.html': 'publish.html',
    '/feishu.html': 'feishu.html',
    // 静态资源文件
    '/settings-modal.html': 'settings-modal.html',
    '/nav-bar.html': 'nav-bar.html',
    '/nav-bar.js': 'nav-bar.js',
    '/top-bar.html': 'top-bar.html',
    '/common-head.html': 'common-head.html'
  };



  const pageFile = pageMap[urlPath];
  if (pageFile) {
    // 特殊处理项目结构页面
    if (pageFile === 'project-structure.html') {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(getProjectStructureHtml());
      return true;
    }
    
    // 根据文件类型设置 Content-Type
    let contentType = 'text/html; charset=utf-8';
    if (pageFile.endsWith('.js')) {
      contentType = 'application/javascript; charset=utf-8';
    }
    
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(getPageHtml(pageFile));
    return true;
  }
  
  return false;
}

// SSE 处理器 - 处理进度推送（使用 URL 参数认证）
async function handleSse(req: IncomingMessage, res: ServerResponse): Promise<boolean | void> {
  const url = req.url || '';
  const method = req.method || 'GET';
  const path = url.split('?')[0];
  const query = parseQuery(url);
  
  console.log('[SSE] 收到请求:', method, path);
  
  // SSE 端点: /novel/sse/progress/:progressId
  const progressMatch = path.match(/^\/novel\/sse\/progress\/([^/]+)$/);
  if (progressMatch && method === 'GET') {
    const progressId = progressMatch[1];
    const token = query.token;
    
    // 验证 token（从 URL 参数）
    const validToken = 'e1647cdb-1b80-4eee-a975-7599160cc89b';
    if (token !== validToken) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
      return true;
    }
    
    console.log('[SSE] 客户端连接:', progressId);
    
    // 设置 SSE 响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    
    // 立即发送连接确认消息
    res.write(`data: ${JSON.stringify({ status: 'connected', message: 'SSE连接已建立', progressId })}\n\n`);
    
    // 导入进度管理器
    const { registerClient } = require('./core/pipeline/ProgressManager');
    
    // 注册客户端
    const unregister = registerClient(progressId, (data: string) => {
      try {
        res.write(data);
      } catch (e) {
        console.error('[SSE] 写入失败:', e);
      }
    });
    
    // 心跳保活
    const heartbeat = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch (e) {
        clearInterval(heartbeat);
        unregister();
      }
    }, 15000);
    
    // 连接关闭时清理
    req.on('close', () => {
      console.log('[SSE] 客户端断开:', progressId);
      clearInterval(heartbeat);
      unregister();
    });
    
    return true;
  }
  
  return false;
}

// 路由处理器 - 处理 /api/novel/ API（需要认证）
async function handleNovelApi(req: IncomingMessage, res: ServerResponse): Promise<boolean | void> {
  const url = req.url || '';
  const method = req.method || 'GET';
  
  const path = url.split('?')[0];
  const query = parseQuery(url);

  // 初始化数据库表
  const service = getNovelService();
  await service.initTables().catch(() => {});

  try {
    // CORS预检
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end();
      return true;
    }

    // ====== 配置管理API ======
    // 获取配置
    if (path === '/api/novel/config' && method === 'GET') {
      try {
        const settings = configManager.getSettings();
        const stepConfigs = configManager.getAllStepConfigs();
        jsonRes(res, { 
          success: true, 
          data: { 
            settings, 
            stepConfigs 
          } 
        });
      } catch (error) {
        console.error('[ConfigAPI] 获取配置失败:', error);
        jsonRes(res, { success: false, error: '获取配置失败' }, 500);
      }
      return true;
    }

    // 保存配置
    if (path === '/api/novel/config' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { settings } = body;
        if (settings) {
          configManager.saveSettings(settings);
        }
        jsonRes(res, { success: true, message: '配置保存成功' });
      } catch (error) {
        console.error('[ConfigAPI] 保存配置失败:', error);
        jsonRes(res, { success: false, error: '保存配置失败' }, 500);
      }
      return true;
    }

    // 更新单个步骤配置
    if (path === '/api/novel/config/step' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { stepId, settings } = body;
        if (stepId && settings) {
          configManager.updateStepSetting(stepId, settings);
        }
        jsonRes(res, { success: true, message: '步骤配置更新成功' });
      } catch (error) {
        console.error('[ConfigAPI] 更新步骤配置失败:', error);
        jsonRes(res, { success: false, error: '更新步骤配置失败' }, 500);
      }
      return true;
    }

    // 更新全局配置
    if (path === '/api/novel/config/global' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { global } = body;
        if (global) {
          configManager.updateGlobalSetting(global);
        }
        jsonRes(res, { success: true, message: '全局配置更新成功' });
      } catch (error) {
        console.error('[ConfigAPI] 更新全局配置失败:', error);
        jsonRes(res, { success: false, error: '更新全局配置失败' }, 500);
      }
      return true;
    }

    // 重置配置
    if (path === '/api/novel/config/reset' && method === 'POST') {
      try {
        configManager.resetToDefaults();
        jsonRes(res, { success: true, message: '配置已重置为默认值' });
      } catch (error) {
        console.error('[ConfigAPI] 重置配置失败:', error);
        jsonRes(res, { success: false, error: '重置配置失败' }, 500);
      }
      return true;
    }

    // ====== 番茄发布API ======
    // 发布章节
    if (path === '/api/novel/publish' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { workId, chapterNumber, headless = true, dryRun = false } = body;
        
        if (!workId) {
          jsonRes(res, { success: false, error: '缺少必要参数：workId' }, 400);
          return true;
        }

        console.log('[PublishAPI] 启动番茄发布, workId:', workId, 'chapterNumber:', chapterNumber);

        // 创建番茄发布流水线
        const pipeline = new FanqieSimplePipeline();
        
        // 生成 progressId（可选）
        const progressId = body.progressId || `publish_${Date.now()}`;
        
        // 异步执行发布
        pipeline.publishToFanqie({
          workId: parseInt(workId as string, 10),
          chapterNumber: chapterNumber ? parseInt(chapterNumber as string, 10) : undefined,
          headless,
          dryRun,
          onProgress: (event) => {
            console.log('[PublishAPI] 进度:', event.stepLabel, event.task, `${event.percent}%`);
            // 这里可以添加 SSE 广播
          }
        }).then((results) => {
          const successCount = results.filter(r => r.success).length;
          console.log(`[PublishAPI] 发布完成: 成功 ${successCount}/${results.length}`);
        }).catch((error) => {
          console.error('[PublishAPI] 发布失败:', error);
        });

        jsonRes(res, { 
          success: true, 
          message: '发布任务已启动', 
          progressId,
          note: '发布任务正在后台执行中'
        });
      } catch (error) {
        console.error('[PublishAPI] 发布失败:', error);
        jsonRes(res, { success: false, error: error instanceof Error ? error.message : '发布失败' }, 500);
      }
      return true;
    }

    // 获取作品列表（用于发布选择）
    if (path === '/api/novel/publish/works' && method === 'GET') {
      try {
        const service = getNovelService();
        const works = await service.getWorks();
        jsonRes(res, { success: true, data: works });
      } catch (error) {
        console.error('[PublishAPI] 获取作品列表失败:', error);
        jsonRes(res, { success: false, error: '获取作品列表失败' }, 500);
      }
      return true;
    }

    // 获取作品章节列表
    const chaptersMatch = path.match(/^\/api\/novel\/publish\/works\/(\d+)\/chapters$/);
    if (chaptersMatch && method === 'GET') {
      try {
        const workId = parseInt(chaptersMatch[1], 10);
        const service = getNovelService();
        const chapters = await service.getChaptersByWorkId(workId);
        jsonRes(res, { success: true, data: chapters });
      } catch (error) {
        console.error('[PublishAPI] 获取章节列表失败:', error);
        jsonRes(res, { success: false, error: '获取章节列表失败' }, 500);
      }
      return true;
    }

    // ====== 文本润色API（优化版） ======
    // 从数据库读取章节内容并润色
    if (path === '/api/novel/polish/from-db' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { workId, chapterNumber, settings } = body;
        
        if (!workId || !chapterNumber) {
          jsonRes(res, { success: false, error: '缺少必要参数：workId, chapterNumber' }, 400);
          return true;
        }

        console.log('[PolishAPI] 从数据库读取并润色，workId:', workId, 'chapter:', chapterNumber);

        // 1. 从数据库读取章节内容
        const db = getDatabaseManager();
        const chapter = await db.queryOne(
          'SELECT * FROM chapters WHERE work_id = ? AND chapter_number = ?', 
          [workId, chapterNumber]
        );
        
        if (!chapter || !chapter.content) {
          jsonRes(res, { success: false, error: '未找到章节内容' }, 404);
          return true;
        }

        // 2. 使用 PolishPipeline 润色
        const polishPipeline = new PolishPipeline();
        const result = await polishPipeline.execute({
          text: chapter.content,
          settings: settings || configManager.getSettings()
        }, (progress) => {
          console.log(`[PolishAPI] [进度] ${progress.currentStep || 'processing'}: ${progress.message} (${progress.progress}%)`);
        });
        
        jsonRes(res, { 
          success: true, 
          data: result 
        });
      } catch (error) {
        console.error('[PolishAPI] 润色失败:', error);
        jsonRes(res, { success: false, error: error instanceof Error ? error.message : '润色失败' }, 500);
      }
      return true;
    }

    // ====== 文本生成API（仅保留核心端点） ======
    // 从数据库生成文本（完整流程：生成 + 润色）
    if (path === '/api/novel/generation/generate-from-db' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { workId, chapterNumber, relatedChapterCount = 2, settings } = body;
        
        if (!workId || !chapterNumber) {
          jsonRes(res, { success: false, error: '缺少必要参数：workId, chapterNumber' }, 400);
          return true;
        }

        console.log('[GenerationAPI] 从数据库生成，workId:', workId, 'chapter:', chapterNumber);

        const generator = new GenerationPipeline();
        const result = await generator.generateFromDatabase({
          workId,
          chapterNumber,
          relatedChapterCount,
          settings
        }, (progress) => {
          console.log(`[GenerationAPI] [进度] ${progress.phase || 'generating'}: ${progress.message} (${progress.progress}%)`);
        });
        
        jsonRes(res, { 
          success: true, 
          data: result 
        });
      } catch (error) {
        console.error('[GenerationAPI] 从数据库生成失败:', error);
        jsonRes(res, { success: false, error: error instanceof Error ? error.message : '生成失败' }, 500);
      }
      return true;
    }

    // 测试浏览器（截图版本）
    if (path === '/api/novel/test-browser' && method === 'POST') {
      try {
        console.log('[NovelManager] 测试浏览器（截图版本）...');
        const result = await getNovelService().testBrowser();
        jsonRes(res, result);
      } catch (error: any) {
        console.error('[NovelManager] 测试浏览器错误:', error);
        jsonRes(res, { success: false, message: error.message });
      }
      return true;
    }

    // 提供截图文件
    const screenshotMatch = path.match(/^\/api\/novel\/screenshot\/(.+)$/);
    if (screenshotMatch && method === 'GET') {
      const filename = screenshotMatch[1];
      const fs = require('fs');
      const path = require('path');
      const screenshotPath = path.join('/workspace/projects/workspace/screenshots', filename);
      
      if (fs.existsSync(screenshotPath)) {
        const content = fs.readFileSync(screenshotPath);
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': content.length
        });
        res.end(content);
      } else {
        res.writeHead(404);
        res.end();
      }
      return true;
    }

    // 统计数据
    if (path === '/api/novel/stats' && method === 'GET') {
      const stats = await getNovelService().getStats();
      jsonRes(res, { success: true, data: stats });
      return true;
    }

    // 作品列表
    if (path === '/api/novel/works' && method === 'GET') {
      const filter = {
        status: query.status,
        platform: query.platform,
        search: query.search,
      };
      const works = await getNovelService().getWorks(filter);
      jsonRes(res, { success: true, data: works });
      return true;
    }

    // 作品详情
    const workDetailMatch = path.match(/^\/api\/novel\/works\/(\d+)$/);
    if (workDetailMatch && method === 'GET') {
      const id = parseInt(workDetailMatch[1]);
      const work = await getNovelService().getWorkById(id);
      if (!work) {
        jsonRes(res, { success: false, error: '作品不存在' }, 404);
        return true;
      }
      jsonRes(res, { success: true, data: work });
      return true;
    }

    // 删除作品
    if (workDetailMatch && method === 'DELETE') {
      const id = parseInt(workDetailMatch[1]);
      await getNovelService().deleteWork(id);
      jsonRes(res, { success: true });
      return true;
    }

    // 更新作品
    if (workDetailMatch && method === 'PUT') {
      const id = parseInt(workDetailMatch[1]);
      const body = await parseBody(req);
      await getNovelService().updateWork(id, body);
      jsonRes(res, { success: true });
      return true;
    }

    // 章节详情
    const chapterMatch = path.match(/^\/api\/novel\/chapters\/(\d+)$/);
    if (chapterMatch && method === 'GET') {
      const id = parseInt(chapterMatch[1]);
      const chapter = await getNovelService().getChapterById(id);
      jsonRes(res, { success: true, data: chapter });
      return true;
    }

    // 更新章节
    if (chapterMatch && method === 'PUT') {
      const id = parseInt(chapterMatch[1]);
      const body = await parseBody(req);
      await getNovelService().updateChapter(id, body);
      jsonRes(res, { success: true });
      return true;
    }

    // 调试：检查章节内容
    const debugChapterMatch = path.match(/^\/api\/novel\/debug\/chapter\/(\d+)\/(\d+)$/);
    if (debugChapterMatch && method === 'GET') {
      const workId = parseInt(debugChapterMatch[1]);
      const chapterNumber = parseInt(debugChapterMatch[2]);
      const result = await getNovelService().debugChapter(workId, chapterNumber);
      jsonRes(res, { success: true, data: result });
      return true;
    }

    // 调试：测试待发布章节查询
    const debugPendingMatch = path.match(/^\/api\/novel\/debug\/pending\/(\d+)\/(\d+)-(\d+)$/);
    if (debugPendingMatch && method === 'GET') {
      const workId = parseInt(debugPendingMatch[1]);
      const startChapter = parseInt(debugPendingMatch[2]);
      const endChapter = parseInt(debugPendingMatch[3]);
      const result = await getNovelService().debugPendingChapters(workId, startChapter, endChapter);
      jsonRes(res, { success: true, data: result });
      return true;
    }

    // 章节列表（按作品ID）
    const chaptersByWorkMatch = path.match(/^\/api\/novel\/works\/(\d+)\/chapters$/);
    if (chaptersByWorkMatch && method === 'GET') {
      const workId = parseInt(chaptersByWorkMatch[1]);
      const chapters = await getNovelService().getChaptersByWorkId(workId);
      jsonRes(res, { success: true, data: chapters });
      return true;
    }

    // 角色列表
    const charactersByWorkMatch = path.match(/^\/api\/novel\/works\/(\d+)\/characters$/);
    if (charactersByWorkMatch && method === 'GET') {
      const workId = parseInt(charactersByWorkMatch[1]);
      const characters = await getNovelService().getCharactersByWorkId(workId);
      jsonRes(res, { success: true, data: characters });
      return true;
    }

    // 根据卷纲生成章节
    const generateChaptersMatch = path.match(/^\/api\/novel\/works\/(\d+)\/generate-chapters-from-volumes$/);
    if (generateChaptersMatch && method === 'POST') {
      const id = parseInt(generateChaptersMatch[1]);
      const result = await getNovelService().generateChaptersFromVolumes(id);
      jsonRes(res, { success: true, ...result });
      return true;
    }

    // 番茄作品列表
    if (path === '/api/novel/fanqie/works' && method === 'GET') {
      const works = await getNovelService().getFanqieWorks();
      jsonRes(res, { success: true, data: works });
      return true;
    }

    // 番茄作品列表（按账号）
    const fanqieWorksByAccountMatch = path.match(/^\/api\/novel\/fanqie\/works\/([^/]+)$/);
    if (fanqieWorksByAccountMatch && method === 'GET') {
      const accountId = parseInt(fanqieWorksByAccountMatch[1], 10) || 0;
      const works = await getNovelService().getFanqieWorksByAccount(accountId);
      jsonRes(res, { success: true, data: works });
      return true;
    }

    // 番茄扫描
    if (path === '/api/novel/fanqie/scan' && method === 'POST') {
      const body = await parseBody(req);
      const result = await getNovelService().scanFanqieWorks(body.accountId);
      jsonRes(res, { success: true, data: result });
      return true;
    }

    // 番茄发布（暂时禁用）
    /*
    if (path === '/api/novel/fanqie/publish' && method === 'POST') {
      const body = await parseBody(req);
      const result = await getNovelService().startFanqiePublish(body);
      jsonRes(res, { success: true, message: result.message, note: result.note });
      return true;
    }
    */

    // 经验记录列表
    if (path === '/api/novel/experience/records' && method === 'GET') {
      const records = await getNovelService().getExperienceRecords();
      jsonRes(res, { success: true, data: records });
      return true;
    }

    // 添加经验记录
    if (path === '/api/novel/experience/records' && method === 'POST') {
      const body = await parseBody(req);
      const record = await getNovelService().addExperienceRecord(body);
      jsonRes(res, { success: true, data: record });
      return true;
    }

    // 缓存文件列表
    if (path === '/api/novel/cache/files' && method === 'GET') {
      const files = await getNovelService().getCacheFiles();
      jsonRes(res, { success: true, data: files });
      return true;
    }

    // 获取缓存文件内容
    const cacheFileMatch = path.match(/^\/api\/novel\/cache\/files\/([^/]+)$/);
    if (cacheFileMatch && method === 'GET') {
      const content = await getNovelService().getCacheFileContent(cacheFileMatch[1]);
      jsonRes(res, { success: true, data: content });
      return true;
    }

    // 保存缓存文件
    if (cacheFileMatch && method === 'PUT') {
      const body = await parseBody(req);
      await getNovelService().saveCacheFileContent(cacheFileMatch[1], body.content);
      jsonRes(res, { success: true });
      return true;
    }

    // ====== 番茄账号相关API ======
    if (path === '/api/novel/fanqie/accounts' && method === 'GET') {
      const { getConfig } = require('./core/config');
      const config = getConfig();
      const accounts = config.scheduler.fanqieAccounts || [];
      jsonRes(res, { success: true, data: accounts });
      return true;
    }

    // ====== 流水线相关API ======
    if (path === '/api/novel/pipeline/start' && method === 'POST') {
      const body = await parseBody(req);
      const result = await getNovelService().startPipeline({
        workId: body.workId,
        accountId: body.accountId,
        dryRun: body.dryRun
      });
      jsonRes(res, result);
      return true;
    }

    if (path === '/api/novel/pipeline/stop' && method === 'POST') {
      const result = await getNovelService().stopPipeline();
      jsonRes(res, result);
      return true;
    }

    if (path === '/api/novel/pipeline/status' && method === 'GET') {
      const status = await getNovelService().getPipelineStatus();
      jsonRes(res, { success: true, data: status });
      return true;
    }

    // ====== 资源库相关API ======
    // 资源库：词汇表
    if (path === '/api/novel/main-library' && method === 'GET') {
      const db = getDatabaseManager();
      const rows = await db.query(`
        SELECT 
          id,
          content,
          category,
          tags,
          note,
          created_at,
          updated_at
        FROM vocabulary
        ORDER BY content ASC
      `);
      jsonRes(res, { success: true, items: rows });
      return true;
    }

    // 资源库：文献
    if (path === '/api/novel/literature' && method === 'GET') {
      const db = getDatabaseManager();
      const rows = await db.query(`
        SELECT 
          id,
          title,
          author,
          tags,
          note,
          content,
          priority,
          created_at,
          updated_at
        FROM literature
        ORDER BY title ASC
      `);
      jsonRes(res, { success: true, items: rows });
      return true;
    }

    // 资源库：禁用词
    if (path === '/api/novel/banned-words' && method === 'GET') {
      const db = getDatabaseManager();
      const rows = await db.query(`
        SELECT 
          id,
          content,
          type,
          category,
          reason,
          alternative,
          created_at,
          updated_at
        FROM banned_words
        ORDER BY content ASC
      `);
      jsonRes(res, { success: true, items: rows });
      return true;
    }

    // ====== 查看所有禁用词数据（调试用）======
    if (path === '/api/novel/banned-words-debug' && method === 'GET') {
      try {
        const db = getDatabaseManager();
        const bannedWords = await db.query(`
          SELECT content AS word, alternative AS replacement, reason
          FROM banned_words
          ORDER BY content ASC
        `);
        jsonRes(res, { success: true, data: bannedWords, count: bannedWords.length });
        return true;
      } catch (error) {
        console.error('[BannedWordsDebug] Error:', error);
        jsonRes(res, { success: false, error: error instanceof Error ? error.message : '处理失败' }, 500);
        return true;
      }
    }

    // ====== 禁用词替换API（使用LLM智能评估） ======
    if (path === '/api/novel/banned-words-replace' && method === 'POST') {
      const body = await parseBody(req);
      const { text } = body;
      
      if (!text?.trim()) {
        jsonRes(res, { success: false, error: '请提供要处理的文本' }, 400);
        return true;
      }
      
      try {
        // 从 MySQL 加载所有160条禁用词
        const db = getDatabaseManager();
        const bannedWords = await db.query(`
          SELECT content AS word, alternative AS replacement, reason
          FROM banned_words
          ORDER BY content ASC
        `);
        
        // 使用LLM进行智能评估和替换
        const { LLMClient, Config } = require('coze-coding-dev-sdk');
        const config = new Config();
        const client = new LLMClient(config);
        
        const systemPrompt = `你是一个专业的文本润色专家，专门处理禁用词替换任务。

任务要求：
1. 给定一段文本和禁用词列表，将文本中的禁用词替换为合适的词
2. 替换后的文本必须：
   - 语义通顺、流畅、无歧义
   - 不损失原文语义和信息
   - 符合文学性表达（适合小说创作）
3. 禁用词列表（共${bannedWords.length}个）：
${bannedWords.map((w: any) => `- ${w.word}`).join('\n')}

请直接返回替换后的完整文本，不要添加任何解释或说明。`;

        const messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ];
        
        const response = await client.invoke(messages, { 
          temperature: 0.3,
          model: "doubao-seed-1-8-251228"
        });
        
        const resultText = response.content;
        
        // 生成替换记录（简单记录，因为是LLM智能替换）
        const replacements = bannedWords
          .filter((w: any) => text.includes(w.word) && !resultText.includes(w.word))
          .map((w: any) => ({
            original: w.word,
            replaced: '(智能替换)',
            reason: w.reason || '禁用词替换',
            source: 'MySQL禁用词库+LLM智能评估'
          }));
        
        jsonRes(res, { 
          success: true, 
          data: { 
            text: resultText, 
            replacements,
            totalBannedWords: bannedWords.length
          } 
        });
        return true;
      } catch (error) {
        console.error('[BannedWordsReplace] Error:', error);
        jsonRes(res, { success: false, error: error instanceof Error ? error.message : '处理失败' }, 500);
        return true;
      }
    }

    // ====== 优选词替换API（使用LLM智能评估） ======
    if (path === '/api/novel/preferred-words-replace' && method === 'POST') {
      const body = await parseBody(req);
      const { text } = body;
      
      if (!text?.trim()) {
        jsonRes(res, { success: false, error: '请提供要处理的文本' }, 400);
        return true;
      }
      
      try {
        // 从 MySQL 加载所有908个优选词
        const db = getDatabaseManager();
        const vocabulary = await db.query(`
          SELECT content AS word, category, tags, note
          FROM vocabulary
          ORDER BY content ASC
        `);
        
        // 使用LLM进行智能评估和替换
        const { LLMClient, Config } = require('coze-coding-dev-sdk');
        const config = new Config();
        const client = new LLMClient(config);
        
        const systemPrompt = `你是一个专业的中文文本润色专家，专门处理优选词替换任务。

任务要求：
1. 给定一段文本和优选词库，将文本中的普通词汇智能替换为更合适的优选词
2. 替换后的文本必须：
   - 语义通顺、流畅、无歧义
   - 不损失原文语义和信息
   - 符合文学性表达（适合小说创作）
   - 禁止欧化表达，禁止不符合中文习惯的外文语序
   - 不要过度替换，保持自然
3. 优选词库（共${vocabulary.length}个，部分示例）：
${vocabulary.slice(0, 50).map((w: any) => `- ${w.word}`).join('\n')}

请直接返回替换后的完整文本，不要添加任何解释或说明。`;

        const messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ];
        
        const response = await client.invoke(messages, { 
          temperature: 0.5,
          model: "doubao-seed-1-8-251228"
        });
        
        const resultText = response.content;
        
        // 简单记录替换（因为是LLM智能替换）
        const replacements: any[] = [];
        if (resultText !== text) {
          replacements.push({
            original: '(原文本)',
            replaced: '(智能润色)',
            reason: '优选词智能替换',
            source: 'MySQL优选词库+LLM智能评估'
          });
        }
        
        jsonRes(res, { 
          success: true, 
          data: { 
            text: resultText, 
            replacements,
            vocabularyCount: vocabulary.length
          } 
        });
        return true;
      } catch (error) {
        console.error('[PreferredWordsReplace] Error:', error);
        jsonRes(res, { success: false, error: error instanceof Error ? error.message : '处理失败' }, 500);
        return true;
      }
    }

    // ====== 完整长文本测试 API（10000+字） ======
    if (path === '/api/novel/full-long-text-test' && method === 'POST') {
      try {
        console.log('[FullLongTextTest] 开始完整长文本测试...');
        
        const { PolishPipeline } = require('./core/content-craft/src/pipeline');
        const pipeline = new PolishPipeline();
        
        // 生成真实的长文本（10000+字）
        const generateLongText = () => {
          const paragraphs = [];
          
          // 第1段：背景介绍
          paragraphs.push(`春日的阳光透过窗户洒进房间，落在桌上那本厚厚的书上。这是一个普通的周末早晨，小明坐在书桌前，手里拿着笔，却迟迟没有写下第一个字。他的脑海里浮现出昨天发生的事情，那些画面像是电影一样在眼前回放。

  昨天下午，小明去了图书馆。图书馆里人很多，大家都在安静地看书或者学习。小明找到了自己想要的书，找了一个靠窗的位置坐下。就在他准备开始看书的时候，一个女孩走了过来，问他旁边的位置是否有人。小明摇摇头，女孩便坐了下来。

  女孩手里拿着一本关于天文学的书，看得很认真。小明偷偷地看了她几眼，她的侧脸很好看，阳光洒在她的头发上，泛着金色的光芒。小明的心跳突然加快了，他赶紧低下头，假装看书，但其实一个字也没看进去。

  过了一会儿，女孩似乎注意到了小明的目光，她转过头来，对小明笑了笑。小明的脸一下子红了，他赶紧低下头，假装在书上做笔记。女孩看到他这个样子，忍不住笑出了声。小明听到笑声，更加不好意思了，他恨不得找个地缝钻进去。

  就在这个时候，图书馆的管理员走了过来，提醒大家保持安静。女孩赶紧止住了笑声，对小明做了个鬼脸，然后继续看书。小明也松了一口气，他抬起头，对女孩笑了笑，然后也开始看书。

  从那以后，小明和女孩经常在图书馆见面。他们有时候会一起讨论书中的内容，有时候会一起去图书馆附近的咖啡店喝咖啡。小明发现女孩不仅长得好看，而且很聪明，很有思想。他越来越喜欢这个女孩了。`);
          
          // 第2段：情节发展
          paragraphs.push(`有一天，小明终于鼓起勇气，约女孩去看电影。女孩欣然答应了。电影是一部浪漫的爱情片，看着看着，小明忍不住偷偷地握住了女孩的手。女孩没有拒绝，她也握住了小明的手。小明的心里甜滋滋的，他觉得自己是世界上最幸福的人。

  电影结束后，小明和女孩一起走在回家的路上。月光洒在他们身上，显得格外浪漫。小明停下来，转过身看着女孩，认真地说："我喜欢你，你愿意做我的女朋友吗？"女孩看着小明，眼睛里闪烁着光芒，她点了点头，说："我愿意。"小明激动得把女孩抱了起来，转了好几个圈。

  从那以后，小明和女孩成了一对恋人。他们一起上学，一起吃饭，一起看电影，一起做很多很多事情。小明觉得自己的生活变得越来越美好了，他每天都过得很开心。

  然而，好景不长。有一天，女孩突然告诉小明，她要去国外留学了。小明听到这个消息，一下子愣住了。他问女孩："你要去多久？"女孩说："大概两年。"小明沉默了，他不知道该说什么。

  女孩看到小明这个样子，心里也很难过。她握住小明的手，说："我知道这对你来说很难接受，但这是一个很好的机会，我不想错过。"小明点点头，说："我理解，你去吧，我会等你的。"女孩感动得哭了，她抱住小明，说："谢谢你，我一定会回来的。"`);
          
          // 第3段：离别和思念
          paragraphs.push(`离别的日子终于到了。小明去机场送女孩。在安检口，女孩紧紧地抱住小明，说："我会想你的，你一定要好好照顾自己。"小明也抱住女孩，说："我也会想你的，你在国外也要好好照顾自己，有什么事情一定要告诉我。"女孩点了点头，然后松开了小明，转身走进了安检口。

  小明站在安检口外，看着女孩的背影消失在人群中，心里空落落的。他拿出手机，给女孩发了一条消息："一路平安，我等你回来。"过了一会儿，女孩回了消息："谢谢你，我到了会给你打电话的。"

  从那以后，小明和女孩每天都会通电话或者视频聊天。他们会分享彼此的生活，会告诉对方自己遇到的有趣的事情。虽然相隔万里，但他们的心却紧紧地连在一起。

  然而，时间久了，小明开始觉得有些不安。他不知道女孩在国外会不会遇到什么困难，会不会遇到其他的人。他开始变得多疑，经常会问女孩一些奇怪的问题。女孩刚开始还会耐心地解释，但时间久了，她也开始觉得有些不耐烦了。

  有一天，小明和女孩又因为一件小事吵了起来。小明生气地挂了电话，然后把手机关机了。他躺在床上，心里越想越难过，越想越生气。他觉得女孩变了，不再像以前那样爱他了。`);
          
          // 第4段：转折和反思
          paragraphs.push(`就这样过了一个星期，小明没有和女孩联系。他每天都过得很痛苦，很后悔。他知道自己不应该那样对女孩，他想给女孩打电话道歉，但又拉不下脸。

  有一天，小明收到了女孩的一封邮件。邮件里，女孩写了很多很多话。她说她在国外过得很好，学习也很顺利，但她很想小明，很想他们在一起的日子。她说她知道小明最近心情不好，她也很理解，但她希望小明能相信她，相信他们的感情。她说她会一直爱着小明，直到永远。

  小明看完邮件，忍不住哭了。他知道自己错了，他不应该怀疑女孩，不应该那样对她。他立刻给女孩打了电话，电话接通后，小明第一句话就是："对不起，我错了。"女孩在电话那头也哭了，她说："我也对不起你，我应该多关心你的感受。"

  从那以后，小明和女孩的感情变得更好了。他们更加信任彼此，更加理解彼此。他们每天都会通电话，都会告诉对方自己的生活。小明也不再多疑了，他知道女孩是爱他的，他也会一直爱着女孩。`);
          
          // 第5段：重逢和结局
          paragraphs.push(`两年的时间很快就过去了。小明终于等到了女孩回来的那一天。他早早地就来到了机场，手里拿着一束玫瑰花，等待着女孩的出现。

  终于，他看到了女孩。女孩比以前更漂亮了，也更成熟了。她看到小明，激动得跑了过来，扑进了小明的怀里。小明紧紧地抱住女孩，说："你终于回来了，我好想你。"女孩也抱住小明，说："我也好想你。"

  从那以后，小明和女孩再也没有分开过。他们一起努力工作，一起建设他们的未来。小明知道，他这辈子最正确的决定就是等女孩回来，而女孩也知道，她这辈子最幸福的事情就是遇到了小明。

  他们的爱情故事，就像一部浪漫的电影，有欢笑，有泪水，有离别，有重逢。但最终，他们还是走到了一起，幸福地生活着。

  这个故事告诉我们，爱情需要信任，需要理解，需要等待。只要你真心爱着对方，只要你愿意为对方付出，那么，你们的爱情一定会有一个美好的结局。`);
          
          // 继续增加内容，直到达到10000字
          for (let i = 0; i < 15; i++) {
            paragraphs.push(`在这个世界上，有很多很多美好的事情等待着我们去发现，去体验。生活就像一盒巧克力，你永远不知道下一颗是什么味道。但无论遇到什么，我们都应该保持乐观的心态，勇敢地面对生活中的挑战。

    小明和女孩的故事还在继续。他们每天都过得很充实，很快乐。小明在工作中取得了很大的成就，而女孩也在自己的领域里做出了一番事业。他们互相支持，互相鼓励，一起成长，一起进步。

    周末的时候，他们会一起去公园散步，一起去看电影，一起去超市买菜，一起在家做饭。他们的生活虽然平淡，但却充满了幸福。

    有时候，他们也会吵架。但每次吵架后，他们都会冷静下来，认真地沟通，找出问题的根源，然后一起解决问题。他们知道，吵架并不可怕，可怕的是吵架后不沟通，不解决问题。

    小明和女孩的朋友们都很羡慕他们的感情。他们经常说，小明和女孩是他们见过的最般配的一对。小明和女孩听到这些话，心里都甜滋滋的。

    有一天，小明突然向女孩求婚了。他在一个浪漫的餐厅里，单膝跪地，拿出一枚戒指，认真地说："你愿意嫁给我吗？"女孩看着小明，眼睛里闪烁着泪花，她点了点头，说："我愿意。"小明激动得把戒指戴在了女孩的手指上，然后抱住她，吻了她。

    他们的婚礼办得很隆重，很多亲朋好友都来参加了。在婚礼上，小明说："我这辈子最幸运的事情就是遇到了我的妻子，是她让我的生活变得如此美好。我会永远爱她，照顾她，守护她。"女孩也说："我这辈子最幸福的事情就是嫁给了我的丈夫，是他让我明白了什么是真正的爱情。我会永远爱他，支持他，陪伴他。"

    从那以后，小明和女孩成了一对夫妻。他们的生活更加甜蜜了，也更加稳定了。他们一起买了房子，一起装修，一起布置他们的小家。他们的家里充满了温馨，充满了爱。

    不久之后，女孩怀孕了。小明高兴坏了，他每天都无微不至地照顾着女孩，生怕她有一点不舒服。十个月后，他们的孩子出生了，是一个健康的男孩。小明抱着孩子，激动得哭了。他知道，他的人生从此变得更加完整了。

    孩子慢慢长大了，他很聪明，很可爱。小明和女孩每天都陪着孩子，看着他一天天长大，心里充满了幸福。他们知道，这就是他们想要的生活，这就是他们的幸福。

    岁月匆匆，时光荏苒。小明和女孩都慢慢变老了，但他们的感情却依然像年轻时那样甜蜜。他们每天一起散步，一起看日出日落，一起回忆他们年轻时候的事情。他们知道，他们这辈子没有白活，他们拥有了世界上最美好的东西——爱情和家庭。

    这个故事告诉我们，幸福其实很简单。它不需要太多的金钱，不需要太多的物质，它只需要两个人真心相爱，互相信任，互相理解，互相支持。只要你拥有了这些，你就拥有了幸福。

    小明和女孩的故事还在继续，他们的幸福也在继续。他们相信，只要他们一直这样相爱下去，他们的生活一定会越来越美好，他们的幸福也一定会越来越多。`);
          }
          
          return paragraphs.join('\n\n');
        };
        
        const longText = generateLongText();
        console.log(`[FullLongTextTest] 生成的长文本长度: ${longText.length} 字符`);
        
        // 统计中文字数
        const chineseChars = (longText.match(/[\u4e00-\u9fa5]/g) || []).length;
        console.log(`[FullLongTextTest] 中文字数: ${chineseChars}`);
        
        // 故意加入一些禁用词测试
        const testText = longText + `
    
    测试禁用词替换：
    这个APP真好用，代码写得很棒，像公司一样高效。
    这个产品真不错，用户体验很好，商业模式很清晰。
    `;
        
        console.log('[FullLongTextTest] 执行完整 pipeline 处理...');
        
        const settings = {
          steps: {
            detect: { enabled: true },
            'proper-noun': { enabled: true },
            'banned-words': { enabled: true },
            'preferred-words': { enabled: true },
            polish: { enabled: true },
            'sentence-patterns': { enabled: true },
            'semantic-check': { enabled: true },
            'final-review': { enabled: true },
            'word-usage-check': { enabled: true },
          },
          global: {
            strictness: 'conservative',
            style: 'literary',
          }
        };
        
        const result = await pipeline.execute({
          text: testText,
          settings
        }, (progress: any) => {
          console.log(`[FullLongTextTest] 进度: ${progress.progress}% - ${progress.message}`);
        });
        
        console.log('[FullLongTextTest] 完整长文本测试完成');
        
        jsonRes(res, {
          success: true,
          test: {
            inputLength: testText.length,
            inputChineseChars: chineseChars,
            outputLength: result.text.length,
            outputChineseChars: (result.text.match(/[\u4e00-\u9fa5]/g) || []).length,
            processingTime: result.metadata.processingTime,
            stepsExecuted: result.metadata.stepsExecuted,
            totalSteps: result.metadata.totalSteps,
            replacements: result.replacements.length,
            reports: result.reports.length,
          },
          reports: result.reports,
          sampleInput: testText.substring(0, 500) + '...',
          sampleOutput: result.text.substring(0, 500) + '...',
          result
        });
        return true;
        
      } catch (error) {
        console.error('[FullLongTextTest] 完整长文本测试失败:', error);
        jsonRes(res, { 
          success: false, 
          error: error instanceof Error ? error.message : '未知错误' 
        }, 500);
        return true;
      }
    }

    // ====== 经验统计API ======
    if (path === '/api/novel/experience/stats' && method === 'GET') {
      const records = await getNovelService().getExperienceRecords();
      
      // 计算总XP
      const totalXP = records.reduce((sum: number, r: any) => sum + (r.xpGained || r.difficulty * 50 || 0), 0);
      const level = Math.floor(totalXP / 1000) + 1;
      
      // 统计类型分布
      const typeDistribution: Record<string, number> = {};
      records.forEach((r: any) => {
        if (r.type) typeDistribution[r.type] = (typeDistribution[r.type] || 0) + 1;
      });
      
      const stats = {
        totalRecords: records.length,
        totalXP,
        level,
        typeDistribution
      };
      jsonRes(res, { success: true, data: stats });
      return true;
    }
    
    // ====== 数据库表结构API ======
    if (path === '/api/novel/db/schema' && method === 'GET') {
      const db = getDatabaseManager();
      
      try {
        // 获取所有表
        const tables = await db.query('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);
        
        const schemaData: Record<string, any> = {};
        
        for (const tableName of tableNames as string[]) {
          // 使用 SHOW FULL COLUMNS 获取 COMMENT 注释
          const columns = await db.query(`SHOW FULL COLUMNS FROM ${tableName}`);
          schemaData[tableName] = columns.map(col => ({
            name: col.Field,
            type: col.Type,
            null: col.Null,
            key: col.Key,
            default: col.Default,
            extra: col.Extra,
            comment: col.Comment || '',
          }));
        }
        
        jsonRes(res, { success: true, data: schemaData });
        return true;
      } catch (error: any) {
        jsonRes(res, { success: false, error: error.message }, 500);
        return true;
      }
    }

    // ====== 笔记API ======
    if (path === '/api/novel/notes' && method === 'GET') {
      const category = query.category;
      const notes = await getNovelService().getNotes(category);
      jsonRes(res, { success: true, data: notes });
      return true;
    }
    
    if (path === '/api/novel/notes/categories' && method === 'GET') {
      const categories = await getNovelService().getNoteCategories();
      jsonRes(res, { success: true, data: categories });
      return true;
    }
    
    const noteDetailMatch = path.match(/^\/api\/novel\/notes\/(\d+)$/);
    if (noteDetailMatch && method === 'GET') {
      const id = parseInt(noteDetailMatch[1]);
      const note = await getNovelService().getNoteById(id);
      if (!note) {
        jsonRes(res, { success: false, error: '笔记不存在' }, 404);
        return true;
      }
      jsonRes(res, { success: true, data: note });
      return true;
    }
    
    if (path === '/api/novel/notes' && method === 'POST') {
      const body = await parseBody(req);
      const note = await getNovelService().addNote(body);
      jsonRes(res, { success: true, data: note });
      return true;
    }
    
    if (noteDetailMatch && method === 'PUT') {
      const id = parseInt(noteDetailMatch[1]);
      const body = await parseBody(req);
      await getNovelService().updateNote(id, body);
      jsonRes(res, { success: true });
      return true;
    }
    
    if (noteDetailMatch && method === 'DELETE') {
      const id = parseInt(noteDetailMatch[1]);
      await getNovelService().deleteNote(id);
      jsonRes(res, { success: true });
      return true;
    }

    // ====== 缓存文件API (单文件) ======
    if (path === '/api/novel/cache/file' && method === 'GET') {
      const filename = query.name;
      if (!filename) {
        jsonRes(res, { success: false, error: '缺少文件名参数' }, 400);
        return true;
      }
      const content = await getNovelService().getCacheFileContent(filename);
      jsonRes(res, { success: true, data: content });
      return true;
    }

    if (path === '/api/novel/cache/file' && method === 'PUT') {
      const filename = query.name;
      const body = await parseBody(req);
      if (!filename) {
        jsonRes(res, { success: false, error: '缺少文件名参数' }, 400);
        return true;
      }
      await getNovelService().saveCacheFileContent(filename, body.content);
      jsonRes(res, { success: true });
      return true;
    }

    if (path === '/api/novel/cache/file' && method === 'DELETE') {
      const filename = query.name;
      if (!filename) {
        jsonRes(res, { success: false, error: '缺少文件名参数' }, 400);
        return true;
      }
      // TODO: 实现删除
      jsonRes(res, { success: true });
      return true;
    }

    // ====== 流水线进度 SSE ======
    // SSE 路由已单独注册，这里不再处理
    const progressMatch = path.match(/^\/api\/novel\/fanqie\/publish\/progress\/([^/]+)$/);
    if (progressMatch && method === 'GET') {
      // 返回 404，让单独的 SSE 路由处理
      jsonRes(res, { success: false, error: '请使用 /api/novel/sse/progress/ 端点' }, 404);
      return true;
    }

    // ====== 项目结构API ======
    // 获取项目结构
    if (path === '/api/novel/project-structure' && method === 'GET') {
      try {
        const structure = await getProjectStructure();
        jsonRes(res, { success: true, data: structure });
      } catch (error) {
        console.error('[ProjectStructureAPI] 获取项目结构失败:', error);
        jsonRes(res, { success: false, error: '获取项目结构失败' }, 500);
      }
      return true;
    }

    // 404
    jsonRes(res, { success: false, error: 'API路由不存在' }, 404);
    return true;

  } catch (err: any) {
    console.error('[novel-manager] API错误:', err);
    jsonRes(res, { success: false, error: err.message || '服务器错误' }, 500);
    return true;
  }
}

// OpenClaw 插件定义
const plugin = {
  id: "novel-manager",
  name: "小说数据管理",
  description: "小说数据管理Web界面",
  version: "1.0.0",
  configSchema: {
    type: "object",
    additionalProperties: false,
    properties: {}
  },
  register(api: any) {
    console.log('[novel-manager] Plugin registered, api:', typeof api, Object.keys(api || {}));
    
    // 页面路由配置
    const pageRoutes = [
      { path: '/', match: 'exact' as const },
      { path: '/novel', match: 'exact' as const },
      { path: '/cache.html', match: 'exact' as const },
      { path: '/project-structure.html', match: 'exact' as const },
      { path: '/logs.html', match: 'exact' as const },
      { path: '/cache-manage.html', match: 'exact' as const },
      { path: '/publish.html', match: 'exact' as const }
    ];
    
    // 注册页面路由 - 不需要认证
    if (api?.registerHttpRoute) {
      console.log('[novel-manager] 使用 api.registerHttpRoute');
      pageRoutes.forEach(route => {
        api.registerHttpRoute({
          path: route.path,
          match: route.match,
          handler: handleNovelPage,
          auth: 'plugin'
        });
      });
      // 注册API路由 - 需要认证
      api.registerHttpRoute({
        path: '/api/novel',
        match: 'prefix',
        handler: handleNovelApi,
        auth: 'gateway'
      });
      // 注册 SSE 路由 - 不需要认证（使用 URL 参数认证）
      api.registerHttpRoute({
        path: '/novel/sse',
        match: 'prefix',
        handler: handleSse,
        auth: 'plugin'
      });
    }
    // 尝试直接使用 registerPluginHttpRoute
    else if (registerPluginHttpRoute) {
      console.log('[novel-manager] 使用 registerPluginHttpRoute');
      pageRoutes.forEach(route => {
        registerPluginHttpRoute({
          path: route.path,
          match: route.match,
          handler: handleNovelPage,
          auth: 'plugin',
          pluginId: 'novel-manager'
        });
      });
      registerPluginHttpRoute({
        path: '/api/novel',
        match: 'prefix',
        handler: handleNovelApi,
        auth: 'gateway',
        pluginId: 'novel-manager'
      });
      // 注册 SSE 路由
      registerPluginHttpRoute({
        path: '/novel/sse',
        match: 'prefix',
        handler: handleSse,
        auth: 'plugin',
        pluginId: 'novel-manager'
      });
    }
    // 备用：直接注册到全局
    else {
      console.log('[novel-manager] 使用全局注册');
      // @ts-ignore
      if (globalThis.__openclawHttpRoutes) {
        pageRoutes.forEach(route => {
          // @ts-ignore
          globalThis.__openclawHttpRoutes.push({
            path: route.path,
            match: route.match,
            handler: handleNovelPage,
            auth: 'plugin'
          });
        });
        // @ts-ignore
        globalThis.__openclawHttpRoutes.push({
          path: '/api/novel',
          match: 'prefix',
          handler: handleNovelApi,
          auth: 'gateway'
        });
        // SSE 路由
        // @ts-ignore
        globalThis.__openclawHttpRoutes.push({
          path: '/novel/sse',
          match: 'prefix',
          handler: handleSse,
          auth: 'plugin'
        });
      }
    }
    console.log('[novel-manager] API路由注册完成');
  },
  activate() {
    console.log('[novel-manager] Plugin activated');
  }
};

export default plugin;
export const register = plugin.register;
export const activate = plugin.activate;

// 导出 content-craft 模块的主要类和函数
export { configManager, PolishPipeline } from './core/content-craft/src';
export { GenerationPipeline } from './core/content-craft/src/generation-pipeline';
export type { 
  GenerationInput, 
  GenerationOutput, 
  GenerationSettings,
  GenerateFromDbInput,
  Character,
  StoryBackground,
  ChapterOutline,
  RelatedChapter
} from './core/content-craft/src/generation-types';
export type { 
  PolishInput, 
  PolishOutput, 
  PolishSettings 
} from './core/content-craft/src/types';
