import { IncomingMessage, ServerResponse } from 'http';
import * as fs from 'fs';
import * as path from 'path';
import type { AutomationFeishuMessage, AutomationSchedule } from '../../contracts';
const { buildSharedNavBarHtml, injectSharedNavBar } = require('../../../shared/nav-bar-server.js');
import {
  addFeishuMessage,
  clearFeishuMessages,
  getFeishuConfig,
  getFeishuMessages,
  getSchedules,
  setFeishuConfig,
  setSchedules,
} from '../services/automation-store';

export const AUTOMATION_PAGE_ROUTES = ['/automation', '/automation/'] as const;
export const AUTOMATION_API_PREFIX = '/api/automation';

const AUTOMATION_PAGE_SOURCE = path.join(
  __dirname,
  '..',
  '..',
  'frontend',
  'pages',
  'automation',
  'index.html'
);
function readUtf8File(filePath: string, fallback: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error('[automation-hub] failed to read file:', filePath, error);
    return fallback;
  }
}

function stripClientNavLoader(html: string): string {
  return html.replace(
    /<script>\s*async function loadSharedNavBar\(\) \{[\s\S]*?<\/script>\s*/i,
    ''
  );
}

function injectNavBar(html: string): string {
  const navBarHtml = buildSharedNavBarHtml({
    sharedRoot: path.join(__dirname, '..', '..', '..', 'shared'),
    activeHrefs: ['/automation'],
    fallbackHtml: '<div class="nav-bar"><a href="/automation" class="on">自动化</a></div>',
  });
  return injectSharedNavBar({ html, navBarHtml });
}

function getAutomationHtml(): string {
  const fallback = '<html><body><h1>自动化页面加载失败</h1></body></html>';
  return injectNavBar(stripClientNavLoader(readUtf8File(AUTOMATION_PAGE_SOURCE, fallback)));
}

function jsonRes(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

async function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk: Buffer) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

export async function handleAutomationPage(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const urlPath = (req.url || '').split('?')[0];

  if (!AUTOMATION_PAGE_ROUTES.includes(urlPath as (typeof AUTOMATION_PAGE_ROUTES)[number])) {
    return false;
  }

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    Pragma: 'no-cache',
    Expires: '0',
  });
  res.end(getAutomationHtml());
  return true;
}

export async function handleLegacyAutomationAlias(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const urlPath = (req.url || '').split('?')[0];
  if (urlPath !== '/auto.html') {
    return false;
  }

  res.writeHead(308, {
    Location: '/automation',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  res.end();
  return true;
}

export async function handleAutomationApi(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const url = req.url || '';
  const method = req.method || 'GET';
  const routePath = url.split('?')[0];
  const query = parseQuery(url);

  if (!routePath.startsWith(AUTOMATION_API_PREFIX)) {
    return false;
  }

  try {
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });
      res.end();
      return true;
    }

    if (routePath === `${AUTOMATION_API_PREFIX}/health` && method === 'GET') {
      jsonRes(res, {
        success: true,
        status: 'ok',
        module: 'automation-hub',
        pageSource: AUTOMATION_PAGE_SOURCE,
        pageRoutes: [...AUTOMATION_PAGE_ROUTES],
      });
      return true;
    }

    if (routePath === `${AUTOMATION_API_PREFIX}/schedules` && method === 'GET') {
      jsonRes(res, { success: true, data: { schedules: getSchedules() } });
      return true;
    }

    if (routePath === `${AUTOMATION_API_PREFIX}/schedules/save` && method === 'POST') {
      const body = await parseBody(req);
      const nextSchedules = Array.isArray((body as { schedules?: unknown[] })?.schedules)
        ? ((body as { schedules: unknown[] }).schedules as AutomationSchedule[])
        : [];

      setSchedules(nextSchedules);
      jsonRes(res, { success: true });
      return true;
    }

    if (routePath === `${AUTOMATION_API_PREFIX}/feishu/config` && method === 'GET') {
      jsonRes(res, { success: true, data: getFeishuConfig() });
      return true;
    }

    if (routePath === `${AUTOMATION_API_PREFIX}/feishu/config/save` && method === 'POST') {
      setFeishuConfig(await parseBody(req));
      jsonRes(res, { success: true });
      return true;
    }

    if (routePath === `${AUTOMATION_API_PREFIX}/feishu/messages` && method === 'GET') {
      const limit = parseInt(query.limit || '100', 10);
      jsonRes(res, { success: true, data: { messages: getFeishuMessages(limit) } });
      return true;
    }

    if (routePath === `${AUTOMATION_API_PREFIX}/feishu/messages/add` && method === 'POST') {
      addFeishuMessage((await parseBody(req)) as AutomationFeishuMessage);
      jsonRes(res, { success: true });
      return true;
    }

    if (routePath === `${AUTOMATION_API_PREFIX}/feishu/messages/clear` && method === 'POST') {
      clearFeishuMessages();
      jsonRes(res, { success: true });
      return true;
    }
  } catch (error) {
    console.error('[automation-hub] API error:', error);
    jsonRes(
      res,
      { success: false, error: error instanceof Error ? error.message : 'Unknown automation API error' },
      500
    );
    return true;
  }

  jsonRes(res, { success: false, error: 'Automation API route not found' }, 404);
  return true;
}

