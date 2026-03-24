import { IncomingMessage, ServerResponse } from 'http';
import { FileSystem } from './src/file-system';
import { FileWatcher } from './src/file-watcher';
import { RulesEngine } from './src/rules-engine';
import * as path from 'path';
import * as fs from 'fs';

// JSON响应辅助函数
function jsonRes(res: ServerResponse, data: any, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data));
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

// 插件信息
const PLUGIN_ID = 'file-manager';
const PLUGIN_NAME = '文件管理器';
const PLUGIN_VERSION = '1.0.0';
const workspaceRoot = '/workspace/projects';

// 初始化
const fileSystem = new FileSystem(workspaceRoot);

// 获取配置
module.exports = {
  id: PLUGIN_ID,
  name: PLUGIN_NAME,
  description: '实时文件结构浏览 + 文件变化监听 + 可视化文件浏览器',
  version: PLUGIN_VERSION,
  configSchema: {
    type: 'object',
    properties: {
      watchPaths: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: '要监听的目录路径'
      },
      rules: {
        type: 'array',
        description: '变化处理规则'
      }
    }
  },

  /**
   * 注册插件
   */
  register(api: any) {
    console.log(`[${PLUGIN_ID}] Plugin registered`);

    // 获取配置
    const pluginConfig = api.getConfig().plugins?.entries?.file-manager?.config || {};
    const watchPaths = pluginConfig.watchPaths || [workspaceRoot];
    const rules = pluginConfig.rules || [];

    // 初始化文件监听
    const fileWatcher = new FileWatcher(watchPaths);
    const rulesEngine = new RulesEngine(rules);

    // 绑定事件
    fileWatcher.on('change', event => {
      rulesEngine.processEvent(event);
    });
    fileWatcher.start();

    console.log(`[${PLUGIN_ID}] Started watching ${watchPaths.length} directories`);

    // 注册 API 路由
    // 获取目录树 - 不需要认证
    api.registerHttpRoute({
      path: '/file-manager/api/tree',
      method: 'GET',
      auth: 'plugin',
      handler: (req: IncomingMessage, res: ServerResponse) => {
        const url = req.url || '';
        const query = parseQuery(url);
        const dirPath = query.path || workspaceRoot;
        fileSystem.getDirectoryTree(dirPath)
          .then(tree => {
            jsonRes(res, { success: true, data: tree });
          })
          .catch(e => {
            jsonRes(res, { success: false, error: String(e) }, 500);
          });
      }
    });

    // 获取文件内容 - 不需要认证
    api.registerHttpRoute({
      path: '/file-manager/api/file',
      method: 'GET',
      auth: 'plugin',
      handler: (req: IncomingMessage, res: ServerResponse) => {
        const url = req.url || '';
        const query = parseQuery(url);
        const filePath = query.path;
        if (!filePath) {
          return jsonRes(res, { success: false, error: '缺少 path 参数' }, 400);
        }
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          jsonRes(res, { success: true, data: { path: filePath, content: content } });
        } catch (e) {
          jsonRes(res, { success: false, error: String(e) }, 500);
        }
      }
    });

    // 注册 UI 页面
    api.registerHttpRoute({
      path: '/file-manager',
      method: 'GET',
      auth: 'plugin',
      handler: (req: IncomingMessage, res: ServerResponse) => {
        const htmlPath = path.join(__dirname, 'public', 'index.html');
        const html = fs.readFileSync(htmlPath, 'utf-8');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(html);
      }
    });

    // 注册 CLI 命令
    api.registerCli({
      name: 'file-manager',
      description: '打开文件管理器',
      handler: () => {
        console.log('📁 文件管理器: http://localhost:5000/file-manager');
      }
    });

    console.log(`[${PLUGIN_ID}] 初始化完成 ✓`);
  }
};
