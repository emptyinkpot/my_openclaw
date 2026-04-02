import { IncomingMessage, OutgoingHttpHeaders, ServerResponse } from 'http';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as path from 'path';
import { buildSharedNavBarHtml, injectSharedNavBar } from '../../../../shared/nav-bar-server';

export const SUPERSET_BRIDGE_PAGE_ROUTES = ['/superset', '/superset/'] as const;
export const SUPERSET_BRIDGE_PROXY_PREFIX = '/superset/_app';
export const SUPERSET_BRIDGE_API_PREFIX = '/api/superset-bridge';

const SUPERSET_BRIDGE_PAGE_SOURCE = path.join(
  __dirname,
  '..',
  '..',
  'frontend',
  'pages',
  'superset',
  'index.html'
);
type SupersetBridgeConfig = {
  targetBaseUrl: string;
  requestTimeoutMs: number;
};

const DEFAULT_CONFIG: SupersetBridgeConfig = {
  targetBaseUrl: 'http://127.0.0.1:3000',
  requestTimeoutMs: 15000,
};

let runtimeConfig: SupersetBridgeConfig = { ...DEFAULT_CONFIG };

function readUtf8File(filePath: string, fallback: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error('[superset-bridge] 读取文件失败:', filePath, error);
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
    activeHrefs: ['/superset/'],
    fallbackHtml: '<div class="nav-bar"><a href="/superset/" class="on">Superset BI</a></div>',
  });
  return injectSharedNavBar({ html, navBarHtml });
}

function getPageHtml(): string {
  const fallback = '<html><body><h1>Superset 页面加载失败</h1></body></html>';
  return injectNavBar(readUtf8File(SUPERSET_BRIDGE_PAGE_SOURCE, fallback));
}

function getRequestPath(urlText: string): string {
  const pathPart = (urlText || '').split('?')[0] || '/';
  return pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
}

function buildConfig(raw: unknown): SupersetBridgeConfig {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_CONFIG };
  }

  const candidate = raw as Partial<SupersetBridgeConfig>;
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
      return `${SUPERSET_BRIDGE_PROXY_PREFIX}${location}`;
    }

    try {
      const targetBase = new URL(runtimeConfig.targetBaseUrl);
      const absolute = new URL(location);
      if (absolute.origin === targetBase.origin) {
        const pathWithQuery = `${absolute.pathname}${absolute.search}${absolute.hash}`;
        return `${SUPERSET_BRIDGE_PROXY_PREFIX}${pathWithQuery}`;
      }
    } catch {
      // Keep original location when parsing fails.
    }

    return location;
  };

  return rewriteOne(value);
}

function proxyToSuperset(req: IncomingMessage, res: ServerResponse, upstreamPathAndQuery: string): void {
  let upstreamUrl: URL;
  try {
    upstreamUrl = getTargetUrl(upstreamPathAndQuery);
  } catch (error) {
    jsonRes(
      res,
      {
        success: false,
        error: error instanceof Error ? error.message : 'Superset 目标地址无效',
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
      };

      const rawLocation = Array.isArray(proxyRes.headers.location)
        ? proxyRes.headers.location[0]
        : proxyRes.headers.location;
      const rewrittenLocation = rewriteLocationHeader(typeof rawLocation === 'string' ? rawLocation : undefined);
      if (rewrittenLocation) {
        headers.location = rewrittenLocation;
      } else {
        delete headers.location;
      }

      res.writeHead(proxyRes.statusCode || 502, headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('timeout', () => {
    proxyReq.destroy(new Error('Superset upstream timeout'));
  });

  proxyReq.on('error', (error) => {
    console.error('[superset-bridge] 代理请求失败:', error);
    if (!res.headersSent) {
      jsonRes(
        res,
        {
          success: false,
          error: 'Superset 服务暂不可用，请先启动 Superset Web。',
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
  if (!raw.startsWith(SUPERSET_BRIDGE_PROXY_PREFIX)) {
    return null;
  }

  const suffix = raw.slice(SUPERSET_BRIDGE_PROXY_PREFIX.length);
  if (!suffix || suffix === '/') {
    return '/';
  }

  return suffix.startsWith('/') ? suffix : `/${suffix}`;
}

function pingSuperset(): Promise<{ ok: boolean; statusCode?: number; error?: string }> {
  return new Promise((resolve) => {
    let target: URL;
    try {
      target = getTargetUrl('/');
    } catch (error) {
      resolve({
        ok: false,
        error: error instanceof Error ? error.message : 'Superset 目标地址无效',
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
        path: '/'
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
        error: error instanceof Error ? error.message : 'Superset 连接失败',
      });
    });

    req.end();
  });
}

export function configureSupersetBridgeRuntime(api: any): void {
  const rawConfig =
    api?.pluginConfig ||
    api?.config?.plugins?.entries?.['superset-bridge']?.config ||
    {};

  runtimeConfig = buildConfig(rawConfig);
}

export function disposeSupersetBridgeRuntime(): void {
  runtimeConfig = { ...DEFAULT_CONFIG };
}

export async function handleSupersetBridgePage(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const routePath = getRequestPath(req.url || '');
  if (!SUPERSET_BRIDGE_PAGE_ROUTES.includes(routePath as (typeof SUPERSET_BRIDGE_PAGE_ROUTES)[number])) {
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

export async function handleSupersetBridgeProxy(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const urlText = req.url || '';
  const proxyPath = parseProxyPath(urlText);
  if (!proxyPath) {
    return false;
  }

  proxyToSuperset(req, res, proxyPath);
  return true;
}

export async function handleSupersetBridgeApi(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const method = req.method || 'GET';
  const routePath = (req.url || '').split('?')[0];

  if (!routePath.startsWith(SUPERSET_BRIDGE_API_PREFIX)) {
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

  if (routePath === `${SUPERSET_BRIDGE_API_PREFIX}/health` && method === 'GET') {
    const ping = await pingSuperset();
    jsonRes(res, {
      success: ping.ok,
      status: ping.ok ? 'ok' : 'down',
      module: 'superset-bridge',
      targetBaseUrl: runtimeConfig.targetBaseUrl,
      proxyPrefix: SUPERSET_BRIDGE_PROXY_PREFIX,
      pageRoutes: [...SUPERSET_BRIDGE_PAGE_ROUTES],
      upstream: ping,
      startupHint: '在 projects/apps/superset 执行 Bun 启动 web/api，或将 targetBaseUrl 指向已运行的 Superset Web。',
    }, ping.ok ? 200 : 503);
    return true;
  }

  if (routePath === `${SUPERSET_BRIDGE_API_PREFIX}/config` && method === 'GET') {
    jsonRes(res, {
      success: true,
      data: runtimeConfig,
    });
    return true;
  }

  jsonRes(res, { success: false, error: 'Superset Bridge API route not found' }, 404);
  return true;
}
