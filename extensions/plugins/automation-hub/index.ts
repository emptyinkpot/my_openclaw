/**
 * Automation Hub - 自动化中心插件
 * 功能：调度管理、飞书集成、进程管理
 */
import { IncomingMessage, ServerResponse } from 'http';
import * as fs from 'fs';
import * as path from 'path';

// 尝试导入 registerPluginHttpRoute
let registerPluginHttpRoute: any;
try {
  // @ts-ignore
  registerPluginHttpRoute = require('@openclaw/plugin-sdk').registerPluginHttpRoute;
} catch (e) {
  console.log('[automation-hub] 无法加载 plugin-sdk，将使用备用方案');
}

let htmlCache: string | null = null;

// 获取导航栏HTML
function getNavBarHtml(): string {
  const navBarPath = path.join(__dirname, '..', '..', 'public', 'nav-bar.html');
  try {
    return fs.readFileSync(navBarPath, 'utf-8');
  } catch (e) {
    console.error('[automation-hub] 无法读取导航栏文件:', navBarPath);
    return '<div class="nav-bar">导航栏加载失败</div>';
  }
}

// 注入导航栏到页面HTML中
function injectNavBar(html: string): string {
  let navBarHtml = getNavBarHtml();
  
  // 给自动化链接添加 "on" 类
  navBarHtml = navBarHtml.replace('href="/automation"', 'href="/automation" class="on"');
  
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

// 获取自动化中心界面HTML
function getAutomationHtml(): string {
  if (htmlCache) return htmlCache;
  
  const htmlPath = path.join(__dirname, 'public', 'index.html');
  try {
    let html = fs.readFileSync(htmlPath, 'utf-8');
    // 注入导航栏
    html = injectNavBar(html);
    htmlCache = html;
    return html;
  } catch (e) {
    console.error('[automation-hub] 无法读取HTML文件:', htmlPath);
    return '<html><body><h1>自动化中心加载失败</h1></body></html>';
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

// 内存存储（临时，后续可改为数据库）
let schedules: any[] = [];
let feishuConfig = { enabled: false, bot: {}, settings: {}, templates: [], commands: [], webhooks: [] };
let feishuMessages: any[] = [];

// 路由处理器 - 处理页面请求
async function handleAutomationPage(req: IncomingMessage, res: ServerResponse): Promise<boolean | void> {
  const url = req.url || '';
  const urlPath = url.split('?')[0];

  if (urlPath === '/automation' || urlPath === '/automation/' || urlPath === '/auto.html') {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(getAutomationHtml());
    return true;
  }
  
  return false;
}

// 路由处理器 - 处理 /api/automation/ API
async function handleAutomationApi(req: IncomingMessage, res: ServerResponse): Promise<boolean | void> {
  const url = req.url || '';
  const method = req.method || 'GET';
  
  const path = url.split('?')[0];
  const query = parseQuery(url);

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

    // ====== 调度相关API ======
    if (path === '/api/automation/schedules' && method === 'GET') {
      jsonRes(res, { success: true, data: { schedules } });
      return true;
    }

    if (path === '/api/automation/schedules/save' && method === 'POST') {
      const body = await parseBody(req);
      if (body.schedules) {
        schedules = body.schedules;
      }
      console.log('[automation-hub] 保存调度配置:', body);
      jsonRes(res, { success: true });
      return true;
    }

    // ====== 飞书相关API ======
    if (path === '/api/automation/feishu/config' && method === 'GET') {
      jsonRes(res, { success: true, data: feishuConfig });
      return true;
    }

    if (path === '/api/automation/feishu/config/save' && method === 'POST') {
      const body = await parseBody(req);
      feishuConfig = body;
      console.log('[automation-hub] 保存飞书配置:', body);
      jsonRes(res, { success: true });
      return true;
    }

    if (path === '/api/automation/feishu/messages' && method === 'GET') {
      const limit = parseInt(query.limit || '100', 10);
      jsonRes(res, { success: true, data: { messages: feishuMessages.slice(-limit) } });
      return true;
    }

    if (path === '/api/automation/feishu/messages/add' && method === 'POST') {
      const body = await parseBody(req);
      feishuMessages.push(body);
      console.log('[automation-hub] 添加飞书消息:', body);
      jsonRes(res, { success: true });
      return true;
    }

    if (path === '/api/automation/feishu/messages/clear' && method === 'POST') {
      feishuMessages = [];
      console.log('[automation-hub] 清除飞书消息');
      jsonRes(res, { success: true });
      return true;
    }

  } catch (error) {
    console.error('[automation-hub] API处理错误:', error);
    jsonRes(res, { success: false, error: error instanceof Error ? error.message : '未知错误' }, 500);
    return true;
  }
  
  return false;
}

console.log('[automation-hub] 插件正在初始化...');

// 插件对象
const plugin = {
  id: 'automation-hub',
  name: 'Automation Hub',
  version: '1.0.0',
  description: '自动化中心 - 调度管理、飞书集成、进程管理',
  
  // 插件注册函数
  register(api: any) {
    console.log('[automation-hub] Plugin registered, api:', typeof api, Object.keys(api || {}));
    
    // 页面路由配置
    const pageRoutes = [
      { path: '/automation', match: 'exact' as const },
      { path: '/automation/', match: 'exact' as const },
      { path: '/auto.html', match: 'exact' as const }
    ];
    
    // 注册页面路由 - 不需要认证
    if (api?.registerHttpRoute) {
      console.log('[automation-hub] 使用 api.registerHttpRoute');
      pageRoutes.forEach(route => {
        api.registerHttpRoute({
          path: route.path,
          match: route.match,
          handler: handleAutomationPage,
          auth: 'plugin'
        });
      });
      
      // 注册API路由 - 需要认证
      const apiRoutes = [
        '/api/automation/schedules',
        '/api/automation/schedules/save',
        '/api/automation/feishu/config',
        '/api/automation/feishu/config/save',
        '/api/automation/feishu/messages',
        '/api/automation/feishu/messages/add',
        '/api/automation/feishu/messages/clear'
      ];
      
      apiRoutes.forEach(route => {
        api.registerHttpRoute({
          path: route,
          match: 'exact' as const,
          handler: handleAutomationApi,
          auth: 'plugin'
        });
      });
      
      console.log('[automation-hub] API路由注册完成');
    }
  },
  
  activate() {
    console.log('[automation-hub] Plugin activated');
  }
};

export default plugin;
export const register = plugin.register;
export const activate = plugin.activate;
