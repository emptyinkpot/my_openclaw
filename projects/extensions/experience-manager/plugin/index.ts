import { IncomingMessage, ServerResponse } from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { experienceRepo } from '../core/ExperienceRepository';
import { noteRepo } from '../core/NoteRepository';
import { getCloudSyncStatus, syncAllToCloud } from '../core/CloudSync';
const { buildSharedNavBarHtml, injectSharedNavBar } = require('../../shared/nav-bar-server.js');

const PLUGIN_ID = 'experience-manager';
const PLUGIN_NAME = '经验中心';
const PLUGIN_VERSION = '1.0.0';

const MODULE_ROOT = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(MODULE_ROOT, '..', '..');
const PAGE_FILE = path.join(MODULE_ROOT, 'frontend', 'pages', 'experience', 'index.html');


const SHARED_STATIC_FILES: Record<string, { filePath: string; contentType: string }> = {
  '/extensions/shared/nav-bar.html': {
    filePath: path.join(PROJECT_ROOT, 'extensions', 'shared', 'nav-bar.html'),
    contentType: 'text/html; charset=utf-8',
  },
  '/extensions/shared/key-guard.html': {
    filePath: path.join(PROJECT_ROOT, 'extensions', 'shared', 'key-guard.html'),
    contentType: 'text/html; charset=utf-8',
  },
  '/extensions/shared/nav-bar-behavior.js': {
    filePath: path.join(PROJECT_ROOT, 'extensions', 'shared', 'nav-bar-behavior.js'),
    contentType: 'application/javascript; charset=utf-8',
  },
};

function renderExperiencePage(): string {
  try {
    const html = fs.readFileSync(PAGE_FILE, 'utf-8');
    const injectedNavBar = buildSharedNavBarHtml({
      sharedRoot: path.join(PROJECT_ROOT, 'extensions', 'shared'),
      activeHrefs: ['/experience'],
      fallbackHtml: '<div class="nav-bar"><a href="/experience" class="on">经验中心</a></div>',
    });
    return injectSharedNavBar({ html, navBarHtml: injectedNavBar });
  } catch (error) {
    console.error('[experience-manager] 读取页面失败:', error);
    return '<html><body><h1>经验中心页面加载失败</h1></body></html>';
  }
}


function handleSharedStatic(req: IncomingMessage, res: ServerResponse): boolean {
  const requestPath = (req.url || '').split('?')[0];
  const target = SHARED_STATIC_FILES[requestPath];
  if (!target) {
    return false;
  }

  try {
    const content = fs.readFileSync(target.filePath, 'utf-8');
    res.writeHead(200, {
      'Content-Type': target.contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      Pragma: 'no-cache',
      Expires: '0',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(content);
  } catch (error) {
    console.error('[experience-manager] shared static file failed:', target.filePath, error);
    res.writeHead(404, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    });
    res.end('Not found');
  }

  return true;
}

function handleExperiencePage(req: IncomingMessage, res: ServerResponse): boolean {
  const requestPath = (req.url || '').split('?')[0];
  if (requestPath !== '/experience' && requestPath !== '/experience/') {
    return false;
  }

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    Pragma: 'no-cache',
    Expires: '0',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(renderExperiencePage());
  return true;
}

function handleLegacyExperienceAlias(req: IncomingMessage, res: ServerResponse): boolean {
  const requestPath = (req.url || '').split('?')[0];
  if (requestPath !== '/experience.html') {
    return false;
  }

  res.writeHead(308, {
    Location: '/experience',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  res.end();
  return true;
}

function json(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function requestUrl(req: IncomingMessage): URL {
  return new URL(req.url || '/', 'http://127.0.0.1');
}

function normalizePathname(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

function readJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });

    req.on('error', reject);
  });
}

function loadColumnsData(): any[] {
  const candidates = [
    path.resolve(MODULE_ROOT, 'data', 'columns.json'),
    path.resolve(PROJECT_ROOT, 'data', 'columns.json'),
  ];

  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) {
        continue;
      }

      const raw = fs.readFileSync(candidate, 'utf-8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.columns) ? parsed.columns : [];
    } catch (error) {
      console.error('[experience-manager] 加载专栏数据失败:', candidate, error);
    }
  }

  return [];
}

async function handleExperienceApi(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = requestUrl(req);
  const routePath = normalizePathname(url.pathname);
  const method = req.method || 'GET';

  if (!routePath.startsWith('/api/experience')) {
    return false;
  }

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'no-store',
    });
    res.end();
    return true;
  }

  try {
    await Promise.all([experienceRepo.waitReady(), noteRepo.waitReady()]);

    if (routePath === '/api/experience/health' && method === 'GET') {
      json(res, 200, {
        success: true,
        data: {
          status: 'ok',
          module: PLUGIN_ID,
          version: PLUGIN_VERSION,
          timestamp: new Date().toISOString(),
        },
      });
      return true;
    }

    if (routePath === '/api/experience/stats' && method === 'GET') {
      json(res, 200, { success: true, data: experienceRepo.getStats() });
      return true;
    }

    if (routePath === '/api/experience/records' && method === 'GET') {
      json(res, 200, { success: true, data: experienceRepo.getAll() });
      return true;
    }

    if (routePath === '/api/experience/records' && method === 'POST') {
      const record = await experienceRepo.create(await readJsonBody(req));
      json(res, 200, { success: true, data: record });
      return true;
    }

    if (routePath.startsWith('/api/experience/records/') && method === 'GET') {
      const id = decodeURIComponent(routePath.slice('/api/experience/records/'.length));
      const record = experienceRepo.getById(id);
      if (!record) {
        json(res, 404, { success: false, error: 'Record not found' });
        return true;
      }

      json(res, 200, { success: true, data: record });
      return true;
    }

    if (routePath.startsWith('/api/experience/records/') && method === 'PUT') {
      const id = decodeURIComponent(routePath.slice('/api/experience/records/'.length));
      const record = await experienceRepo.update(id, await readJsonBody(req));
      if (!record) {
        json(res, 404, { success: false, error: 'Record not found' });
        return true;
      }

      json(res, 200, { success: true, data: record });
      return true;
    }

    if (routePath.startsWith('/api/experience/records/') && method === 'DELETE') {
      const id = decodeURIComponent(routePath.slice('/api/experience/records/'.length));
      const success = await experienceRepo.delete(id);
      if (!success) {
        json(res, 404, { success: false, error: 'Record not found' });
        return true;
      }

      json(res, 200, { success: true });
      return true;
    }

    if (routePath === '/api/experience/search' && method === 'GET') {
      const keyword = url.searchParams.get('q') || '';
      json(res, 200, {
        success: true,
        data: keyword ? experienceRepo.search(keyword) : experienceRepo.getAll(),
      });
      return true;
    }

    if (routePath.startsWith('/api/experience/tag/') && method === 'GET') {
      const tag = decodeURIComponent(routePath.slice('/api/experience/tag/'.length));
      json(res, 200, { success: true, data: experienceRepo.getByTag(tag) });
      return true;
    }

    if (routePath === '/api/experience/columns' && method === 'GET') {
      json(res, 200, { success: true, data: loadColumnsData() });
      return true;
    }

    if (routePath === '/api/experience/notes/categories' && method === 'GET') {
      json(res, 200, { success: true, data: noteRepo.getCategories() });
      return true;
    }

    if (routePath === '/api/experience/notes' && method === 'GET') {
      json(res, 200, { success: true, data: noteRepo.getAll() });
      return true;
    }

    if (routePath === '/api/experience/notes' && method === 'POST') {
      const note = await noteRepo.create(await readJsonBody(req));
      json(res, 200, { success: true, data: note });
      return true;
    }

    if (routePath.startsWith('/api/experience/notes/') && method === 'GET') {
      const id = decodeURIComponent(routePath.slice('/api/experience/notes/'.length));
      const note = noteRepo.getById(id);
      if (!note) {
        json(res, 404, { success: false, error: 'Note not found' });
        return true;
      }

      json(res, 200, { success: true, data: note });
      return true;
    }

    if (routePath.startsWith('/api/experience/notes/') && method === 'PUT') {
      const id = decodeURIComponent(routePath.slice('/api/experience/notes/'.length));
      const note = await noteRepo.update(id, await readJsonBody(req));
      if (!note) {
        json(res, 404, { success: false, error: 'Note not found' });
        return true;
      }

      json(res, 200, { success: true, data: note });
      return true;
    }

    if (routePath.startsWith('/api/experience/notes/') && method === 'DELETE') {
      const id = decodeURIComponent(routePath.slice('/api/experience/notes/'.length));
      const success = await noteRepo.delete(id);
      if (!success) {
        json(res, 404, { success: false, error: 'Note not found' });
        return true;
      }

      json(res, 200, { success: true });
      return true;
    }

    if (routePath === '/api/experience/cloud/status' && method === 'GET') {
      json(res, 200, { success: true, data: getCloudSyncStatus() });
      return true;
    }

    if (routePath === '/api/experience/cloud/sync' && method === 'POST') {
      const body = await readJsonBody(req);
      const scope = String(body?.scope || 'all').toLowerCase();
      const includeExperiences = scope === 'all' || scope === 'experiences' || scope === 'records';
      const includeNotes = scope === 'all' || scope === 'notes';
      const result = await syncAllToCloud({
        experiences: includeExperiences ? experienceRepo.getAll() : [],
        notes: includeNotes ? noteRepo.getAll() : [],
      });
      json(res, 200, { success: true, data: result });
      return true;
    }
  } catch (error) {
    console.error('[experience-manager] API failed:', error);
    json(res, 500, {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown experience-manager error',
    });
    return true;
  }

  json(res, 404, { success: false, error: 'Not found' });
  return true;
}

async function activate() {
  await Promise.all([experienceRepo.waitReady(), noteRepo.waitReady()]);
  console.log(`[${PLUGIN_ID}] ready`);
}

const plugin = {
  id: PLUGIN_ID,
  name: PLUGIN_NAME,
  description: '经验记录、笔记与专栏模块',
  version: PLUGIN_VERSION,
  configSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  },
  register(api: any) {
    if (!api?.registerHttpRoute) {
      return;
    }

    Object.keys(SHARED_STATIC_FILES).forEach((staticPath) => {
      api.registerHttpRoute({
        path: staticPath,
        match: 'exact',
        handler: handleSharedStatic,
        auth: 'plugin',
      });
    });

    ['/experience', '/experience/'].forEach((pagePath) => {
      api.registerHttpRoute({
        path: pagePath,
        match: 'exact',
        handler: handleExperiencePage,
        auth: 'plugin',
      });
    });

    api.registerHttpRoute({
      path: '/api/experience',
      match: 'prefix',
      handler: handleExperienceApi,
      auth: 'gateway',
    });
  },
  activate,
};

export default plugin;
export { activate };
export const register = plugin.register;

