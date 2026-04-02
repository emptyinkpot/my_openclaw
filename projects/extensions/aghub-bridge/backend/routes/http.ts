import { IncomingMessage, OutgoingHttpHeaders, ServerResponse } from 'http';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as path from 'path';
import { buildSharedNavBarHtml, injectSharedNavBar } from '../../../../shared/nav-bar-server';

export const AGHUB_BRIDGE_PAGE_ROUTES = ['/aghub', '/aghub/'] as const;
export const AGHUB_BRIDGE_PROXY_PREFIX = '/aghub/_app';
export const AGHUB_BRIDGE_API_PREFIX = '/api/aghub-bridge';

const AGHUB_BRIDGE_PAGE_SOURCE = path.join(
  __dirname,
  '..',
  '..',
  'frontend',
  'pages',
  'aghub',
  'index.html'
);
type AghubBridgeConfig = {
  targetBaseUrl: string;
  requestTimeoutMs: number;
};

const DEFAULT_CONFIG: AghubBridgeConfig = {
  targetBaseUrl: 'http://127.0.0.1:5173',
  requestTimeoutMs: 15000,
};

let runtimeConfig: AghubBridgeConfig = { ...DEFAULT_CONFIG };

function readUtf8File(filePath: string, fallback: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error('[aghub-bridge] 读取文件失败:', filePath, error);
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

function injectNavBar(html: string): string {
  const navBarHtml = buildSharedNavBarHtml({
    sharedRoot: path.join(__dirname, '..', '..', '..', '..', 'shared'),
    activeHrefs: ['/aghub/'],
    fallbackHtml: '<div class="nav-bar"><a href="/aghub/" class="on">AGHub</a></div>',
  });
  return injectSharedNavBar({ html, navBarHtml });
}

function getPageHtml(): string {
  const fallback = '<html><body><h1>AGHub 页面加载失败</h1></body></html>';
  return injectNavBar(readUtf8File(AGHUB_BRIDGE_PAGE_SOURCE, fallback));
}

function getRequestPath(urlText: string): string {
  const pathPart = (urlText || '').split('?')[0] || '/';
  return pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
}

function buildConfig(raw: unknown): AghubBridgeConfig {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_CONFIG };
  }

  const candidate = raw as Partial<AghubBridgeConfig>;
  const targetBaseUrl = typeof candidate.targetBaseUrl === 'string' && candidate.targetBaseUrl.trim()
    ? candidate.targetBaseUrl.trim().replace(/\/+$/, '')
    : DEFAULT_CONFIG.targetBaseUrl;

  const timeout = Number(candidate.requestTimeoutMs);
  const requestTimeoutMs = Number.isFinite(timeout) && timeout > 1000
    ? timeout
    : DEFAULT_CONFIG.requestTimeoutMs;

  return {
    targetBaseUrl,
    requestTimeoutMs,
  };
}

function getTargetUrl(pathAndQuery: string): URL {
  const normalized = pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`;
  return new URL(normalized, `${runtimeConfig.targetBaseUrl}/`);
}

function rewriteLocationHeader(value: string | undefined): string | undefined {
  if (!value) {
    return value;
  }

  const rewriteOne = (location: string): string => {
    if (location.startsWith('/')) {
      return `${AGHUB_BRIDGE_PROXY_PREFIX}${location}`;
    }

    try {
      const targetBase = new URL(runtimeConfig.targetBaseUrl);
      const absolute = new URL(location);
      if (absolute.origin === targetBase.origin) {
        const pathWithQuery = `${absolute.pathname}${absolute.search}${absolute.hash}`;
        return `${AGHUB_BRIDGE_PROXY_PREFIX}${pathWithQuery}`;
      }
    } catch {
      // Keep original location when parsing fails.
    }

    return location;
  };

  return rewriteOne(value);
}

function proxyToAghub(req: IncomingMessage, res: ServerResponse, upstreamPathAndQuery: string): void {
  let upstreamUrl: URL;
  try {
    upstreamUrl = getTargetUrl(upstreamPathAndQuery);
  } catch (error) {
    jsonRes(
      res,
      {
        success: false,
        error: error instanceof Error ? error.message : 'AGHub 目标地址无效',
      },
      500
    );
    return;
  }

  const useHttps = upstreamUrl.protocol === 'https:';
  const requestImpl = useHttps ? https.request : http.request;
  const hostHeader = upstreamUrl.host;

  const proxyReq = requestImpl(
    {
      protocol: upstreamUrl.protocol,
      hostname: upstreamUrl.hostname,
      port: upstreamUrl.port || (useHttps ? 443 : 80),
      method: req.method || 'GET',
      path: `${upstreamUrl.pathname}${upstreamUrl.search}`,
      headers: {
        ...req.headers,
        host: hostHeader,
        'x-forwarded-host': req.headers.host || '',
        'x-forwarded-proto': 'http',
      },
      timeout: runtimeConfig.requestTimeoutMs,
    },
    (proxyRes) => {
      const headers: OutgoingHttpHeaders = {
        ...proxyRes.headers,
        location: rewriteLocationHeader(
          typeof proxyRes.headers.location === 'string' ? proxyRes.headers.location : undefined
        ),
      };

      res.writeHead(proxyRes.statusCode || 502, headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('timeout', () => {
    proxyReq.destroy(new Error('AGHub upstream timeout'));
  });

  proxyReq.on('error', (error) => {
    console.error('[aghub-bridge] 代理请求失败:', error);
    if (!res.headersSent) {
      jsonRes(
        res,
        {
          success: false,
          error: 'AGHub 服务暂不可用，请先启动 AGHub。',
          targetBaseUrl: runtimeConfig.targetBaseUrl,
        },
        502
      );
    } else {
      res.end();
    }
  });

  req.pipe(proxyReq);
}

function parseProxyPath(urlText: string): string | null {
  const raw = urlText || '';
  if (!raw.startsWith(AGHUB_BRIDGE_PROXY_PREFIX)) {
    return null;
  }

  const suffix = raw.slice(AGHUB_BRIDGE_PROXY_PREFIX.length);
  if (!suffix || suffix === '/') {
    return '/';
  }

  return suffix.startsWith('/') ? suffix : `/${suffix}`;
}

function pingAghub(): Promise<{ ok: boolean; statusCode?: number; error?: string }> {
  return new Promise((resolve) => {
    let target: URL;
    try {
      target = getTargetUrl('/');
    } catch (error) {
      resolve({
        ok: false,
        error: error instanceof Error ? error.message : 'AGHub 目标地址无效',
      });
      return;
    }

    const useHttps = target.protocol === 'https:';
    const requestImpl = useHttps ? https.request : http.request;
    const req = requestImpl(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || (useHttps ? 443 : 80),
        method: 'GET',
        path: '/',
      },
      (res) => {
        const statusCode = res.statusCode;
        res.resume();
        resolve({
          ok: !!statusCode && statusCode >= 200 && statusCode < 500,
          statusCode,
        });
      }
    );

    req.setTimeout(runtimeConfig.requestTimeoutMs, () => {
      req.destroy(new Error('timeout'));
    });

    req.on('error', (error) => {
      resolve({
        ok: false,
        error: error instanceof Error ? error.message : 'AGHub 连接失败',
      });
    });

    req.end();
  });
}

export function configureAghubBridgeRuntime(api: any): void {
  const rawConfig =
    api?.pluginConfig ||
    api?.config?.plugins?.entries?.['aghub-bridge']?.config ||
    {};

  runtimeConfig = buildConfig(rawConfig);
}

export function disposeAghubBridgeRuntime(): void {
  runtimeConfig = { ...DEFAULT_CONFIG };
}

export async function handleAghubBridgePage(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const routePath = getRequestPath(req.url || '');
  if (!AGHUB_BRIDGE_PAGE_ROUTES.includes(routePath as (typeof AGHUB_BRIDGE_PAGE_ROUTES)[number])) {
    return false;
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

export async function handleAghubBridgeProxy(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const urlText = req.url || '';
  const proxyPath = parseProxyPath(urlText);
  if (!proxyPath) {
    return false;
  }

  proxyToAghub(req, res, proxyPath);
  return true;
}

export async function handleAghubBridgeApi(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const method = req.method || 'GET';
  const routePath = (req.url || '').split('?')[0];

  if (!routePath.startsWith(AGHUB_BRIDGE_API_PREFIX)) {
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

  if (routePath === `${AGHUB_BRIDGE_API_PREFIX}/health` && method === 'GET') {
    const ping = await pingAghub();
    jsonRes(
      res,
      {
        success: ping.ok,
        status: ping.ok ? 'ok' : 'down',
        module: 'aghub-bridge',
        targetBaseUrl: runtimeConfig.targetBaseUrl,
        proxyPrefix: AGHUB_BRIDGE_PROXY_PREFIX,
        pageRoutes: [...AGHUB_BRIDGE_PAGE_ROUTES],
        upstream: ping,
        startupHint: '请先启动 AGHub 前端服务，或将 targetBaseUrl 指向已运行的 AGHub。',
      },
      ping.ok ? 200 : 503
    );
    return true;
  }

  if (routePath === `${AGHUB_BRIDGE_API_PREFIX}/config` && method === 'GET') {
    jsonRes(res, {
      success: true,
      data: runtimeConfig,
    });
    return true;
  }

  jsonRes(res, { success: false, error: 'AGHub Bridge API route not found' }, 404);
  return true;
}
