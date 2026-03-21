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

// 获取自动化中心界面HTML
function getAutomationHtml(): string {
  if (htmlCache) return htmlCache;
  
  const htmlPath = path.join(__dirname, 'public', 'index.html');
  try {
    htmlCache = fs.readFileSync(htmlPath, 'utf-8');
    return htmlCache;
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
