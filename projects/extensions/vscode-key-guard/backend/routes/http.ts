import { IncomingMessage, ServerResponse } from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { buildSharedNavBarHtml, injectSharedNavBar } from '../../../../shared/nav-bar-server';

import { getDiagnosisPayload } from './diagnosis.ts';
import { createKeyPayload, deleteKeyPayload, getKeysPayload, updateKeyPayload } from './keys.ts';
import { getProviderPayload, getProvidersPayload } from './providers.ts';
import { getRepairPayload } from './repair.ts';
import { getSnapshotPayload } from './snapshots.ts';
import { switchKeyPayload } from './switch.ts';
import { getUsagePayload, refreshUsagePayload } from './usage.ts';

export const VSCODE_KEY_GUARD_PAGE_ROUTES = [
  '/vscode-key-guard',
  '/vscode-key-guard/',
  '/key-guard',
  '/key-guard/',
  '/key-guard/chat',
  '/key-guard/chat/',
] as const;
export const VSCODE_KEY_GUARD_API_PREFIX = '/api/key-guard';

const VSCODE_KEY_GUARD_CANONICAL_PATH = '/vscode-key-guard/';
const moduleDir = path.dirname(fileURLToPath(import.meta.url));

const PAGE_SOURCE = path.join(
  moduleDir,
  '..',
  '..',
  'frontend',
  'pages',
  'vscode-key-guard',
  'index.html'
);
function readUtf8File(filePath: string, fallback: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error('[vscode-key-guard] failed to read file:', filePath, error);
    return fallback;
  }
}

function injectNavBar(html: string): string {
  const navBarHtml = buildSharedNavBarHtml({
    sharedRoot: path.join(moduleDir, '..', '..', '..', '..', 'shared'),
    activeHrefs: ['/vscode-key-guard/'],
    fallbackHtml: '<div class="nav-bar"><a href="/vscode-key-guard/" class="on">Key Guard</a></div>',
  });
  return injectSharedNavBar({ html, navBarHtml });
}

function getPageHtml(): string {
  const fallback = '<html><body><h1>Key Guard page failed to load.</h1></body></html>';
  return injectNavBar(readUtf8File(PAGE_SOURCE, fallback));
}

function jsonRes(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  const content = Buffer.concat(chunks).toString('utf8').trim();
  if (content.length === 0) {
    return {};
  }

  return JSON.parse(content);
}

export async function handleVscodeKeyGuardPage(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const routePath = (req.url || '').split('?')[0];

  const isKeyGuardChatPath = routePath === '/key-guard/chat' || routePath.startsWith('/key-guard/chat/');
  const isVscodeKeyGuardPath = routePath === '/vscode-key-guard' || routePath.startsWith('/vscode-key-guard/');
  if (
    !VSCODE_KEY_GUARD_PAGE_ROUTES.includes(routePath as (typeof VSCODE_KEY_GUARD_PAGE_ROUTES)[number]) &&
    !isKeyGuardChatPath &&
    !isVscodeKeyGuardPath
  ) {
    return false;
  }

  if (routePath === '/key-guard' || routePath === '/key-guard/' || routePath === '/key-guard/chat') {
    res.writeHead(302, {
      Location: VSCODE_KEY_GUARD_CANONICAL_PATH,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      Pragma: 'no-cache',
      Expires: '0',
    });
    res.end();
    return true;
  }

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    Pragma: 'no-cache',
    Expires: '0',
  });
  res.end(getPageHtml());
  return true;
}

export async function handleVscodeKeyGuardApi(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const method = req.method || 'GET';
  const requestUrl = new URL(req.url || '/', 'http://127.0.0.1');
  const routePath = requestUrl.pathname;
  const searchParams = requestUrl.searchParams;

  if (!routePath.startsWith(VSCODE_KEY_GUARD_API_PREFIX)) {
    return false;
  }

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return true;
  }

  try {
    if (routePath === `${VSCODE_KEY_GUARD_API_PREFIX}/health` && method === 'GET') {
      jsonRes(res, {
        success: true,
        data: {
          pageSource: PAGE_SOURCE,
          pageRoutes: [...VSCODE_KEY_GUARD_PAGE_ROUTES],
          canonicalPath: VSCODE_KEY_GUARD_CANONICAL_PATH,
          apiPrefix: VSCODE_KEY_GUARD_API_PREFIX,
        },
      });
      return true;
    }

    if (routePath === `${VSCODE_KEY_GUARD_API_PREFIX}/snapshots` && method === 'GET') {
      jsonRes(res, { success: true, data: await getSnapshotPayload() });
      return true;
    }

    if (routePath === `${VSCODE_KEY_GUARD_API_PREFIX}/diagnosis` && method === 'GET') {
      jsonRes(res, { success: true, data: await getDiagnosisPayload() });
      return true;
    }

    if (routePath === `${VSCODE_KEY_GUARD_API_PREFIX}/repair` && method === 'GET') {
      jsonRes(res, { success: true, data: await getRepairPayload() });
      return true;
    }

    if (routePath === `${VSCODE_KEY_GUARD_API_PREFIX}/keys` && method === 'GET') {
      jsonRes(res, { success: true, data: await getKeysPayload() });
      return true;
    }

    if (routePath === `${VSCODE_KEY_GUARD_API_PREFIX}/keys` && method === 'POST') {
      jsonRes(res, { success: true, data: await createKeyPayload(await readJsonBody(req)) }, 201);
      return true;
    }

    if (routePath.startsWith(`${VSCODE_KEY_GUARD_API_PREFIX}/keys/`)) {
      const keyId = decodeURIComponent(routePath.slice(`${VSCODE_KEY_GUARD_API_PREFIX}/keys/`.length));

      if (method === 'PATCH') {
        jsonRes(res, { success: true, data: await updateKeyPayload(keyId, await readJsonBody(req)) });
        return true;
      }

      if (method === 'DELETE') {
        jsonRes(res, { success: true, data: await deleteKeyPayload(keyId) });
        return true;
      }
    }

    if (routePath === `${VSCODE_KEY_GUARD_API_PREFIX}/providers` && method === 'GET') {
      jsonRes(res, { success: true, data: await getProvidersPayload() });
      return true;
    }

    if (routePath.startsWith(`${VSCODE_KEY_GUARD_API_PREFIX}/providers/`) && method === 'GET') {
      const provider = decodeURIComponent(routePath.slice(`${VSCODE_KEY_GUARD_API_PREFIX}/providers/`.length));
      jsonRes(res, { success: true, data: await getProviderPayload(provider) });
      return true;
    }

    if (routePath === `${VSCODE_KEY_GUARD_API_PREFIX}/usage` && method === 'GET') {
      jsonRes(res, { success: true, data: await getUsagePayload(searchParams) });
      return true;
    }

    if (routePath === `${VSCODE_KEY_GUARD_API_PREFIX}/usage/refresh` && method === 'POST') {
      jsonRes(res, { success: true, data: await refreshUsagePayload(await readJsonBody(req)) });
      return true;
    }

    if (routePath === `${VSCODE_KEY_GUARD_API_PREFIX}/switch` && method === 'POST') {
      jsonRes(res, { success: true, data: await switchKeyPayload(await readJsonBody(req)) });
      return true;
    }

    jsonRes(res, { success: false, message: `Unknown route: ${routePath}` }, 404);
    return true;
  } catch (error) {
    console.error('[vscode-key-guard] api error:', error);
    jsonRes(
      res,
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown vscode-key-guard API error.',
      },
      500
    );
    return true;
  }
}
