import { IncomingMessage, ServerResponse } from 'http';
import * as fs from 'fs';
import * as path from 'path';
import type { FileManagerConfig } from '../../contracts';
import { createFileManagerService, FileManagerService } from '../services/file-manager-service';

export const FILE_MANAGER_PAGE_ROUTES = ['/file-manager', '/file-manager/'] as const;
export const FILE_MANAGER_API_PREFIX = '/api/file-manager';

const FILE_MANAGER_PAGE_SOURCE = path.join(
  __dirname,
  '..',
  '..',
  'frontend',
  'pages',
  'file-manager',
  'index.html'
);
const SHARED_NAV_BAR_SOURCE = path.join(__dirname, '..', '..', '..', '..', 'shared', 'nav-bar.html');

let fileManagerService: FileManagerService | null = null;

function readUtf8File(filePath: string, fallback: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error('[file-manager] 读取文件失败:', filePath, error);
    return fallback;
  }
}

function jsonRes(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

function parseQuery(url: string): Record<string, string> {
  const query: Record<string, string> = {};
  const queryString = url.split('?')[1] || '';

  for (const pair of queryString.split('&')) {
    const [key, value] = pair.split('=');
    if (key) {
      query[decodeURIComponent(key)] = decodeURIComponent(value || '');
    }
  }

  return query;
}

function injectNavBar(html: string): string {
  const fallbackNav = '<div class="nav-bar"><a href="/file-manager" class="on">文件管理</a></div>';
  const navBarHtml = readUtf8File(SHARED_NAV_BAR_SOURCE, fallbackNav).replace(
    'href="/file-manager"',
    'href="/file-manager" class="on"'
  );

  if (html.includes('<div id="navbar-container"></div>')) {
    return html.replace('<div id="navbar-container"></div>', `<div id="navbar-container">${navBarHtml}</div>`);
  }

  if (html.includes('<body>')) {
    return html.replace('<body>', `<body>${navBarHtml}`);
  }

  return `${navBarHtml}${html}`;
}

function getFileManagerHtml(): string {
  const fallback = '<html><body><h1>文件管理页面加载失败</h1></body></html>';
  return injectNavBar(readUtf8File(FILE_MANAGER_PAGE_SOURCE, fallback));
}

function getService(): FileManagerService {
  if (!fileManagerService) {
    fileManagerService = createFileManagerService();
  }

  return fileManagerService;
}

function resolvePluginConfig(api: any): FileManagerConfig {
  const config =
    api?.pluginConfig ||
    api?.config?.plugins?.entries?.['file-manager']?.config ||
    {};

  return config && typeof config === 'object' ? (config as FileManagerConfig) : {};
}

export function configureFileManagerRuntime(api: any): void {
  const nextService = createFileManagerService(resolvePluginConfig(api));
  if (fileManagerService) {
    fileManagerService.dispose();
  }
  fileManagerService = nextService;
}

export function disposeFileManagerRuntime(): void {
  if (!fileManagerService) {
    return;
  }

  fileManagerService.dispose();
  fileManagerService = null;
}

export async function handleFileManagerPage(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const routePath = (req.url || '').split('?')[0];
  if (!FILE_MANAGER_PAGE_ROUTES.includes(routePath as (typeof FILE_MANAGER_PAGE_ROUTES)[number])) {
    return false;
  }

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    Pragma: 'no-cache',
    Expires: '0',
  });
  res.end(getFileManagerHtml());
  return true;
}

export async function handleFileManagerApi(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const method = req.method || 'GET';
  const url = req.url || '';
  const routePath = url.split('?')[0];
  const query = parseQuery(url);

  if (!routePath.startsWith(FILE_MANAGER_API_PREFIX)) {
    return false;
  }

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return true;
  }

  try {
    const service = getService();

    if (routePath === `${FILE_MANAGER_API_PREFIX}/health` && method === 'GET') {
      jsonRes(res, {
        success: true,
        status: 'ok',
        module: 'file-manager',
        pageSource: FILE_MANAGER_PAGE_SOURCE,
        pageRoutes: [...FILE_MANAGER_PAGE_ROUTES],
        runtime: service.getRuntimeInfo(),
      });
      return true;
    }

    if (routePath === `${FILE_MANAGER_API_PREFIX}/config` && method === 'GET') {
      jsonRes(res, {
        success: true,
        data: service.getRuntimeInfo(),
      });
      return true;
    }

    if (routePath === `${FILE_MANAGER_API_PREFIX}/tree` && method === 'GET') {
      const tree = service.getDirectoryTree(query.path);
      jsonRes(res, { success: true, data: tree });
      return true;
    }

    if (routePath === `${FILE_MANAGER_API_PREFIX}/file` && method === 'GET') {
      const filePath = query.path;
      if (!filePath) {
        jsonRes(res, { success: false, error: '缺少 path 参数' }, 400);
        return true;
      }

      const preview = service.readFile(filePath);
      jsonRes(res, { success: true, data: preview });
      return true;
    }
  } catch (error) {
    console.error('[file-manager] API 处理失败:', error);
    jsonRes(
      res,
      {
        success: false,
        error: error instanceof Error ? error.message : '未知文件管理错误',
      },
      500
    );
    return true;
  }

  jsonRes(res, { success: false, error: 'File Manager API route not found' }, 404);
  return true;
}
