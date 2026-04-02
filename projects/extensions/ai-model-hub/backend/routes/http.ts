import { IncomingMessage, ServerResponse } from 'http';
import * as fs from 'fs';
import * as path from 'path';
import type { AIModelHubConfig, SandboxConfig, TrainingJobCreateInput } from '../../contracts';
import { AI_MODEL_HUB_API_PREFIX, AI_MODEL_HUB_PAGE_ROUTES, mergeAIModelHubConfig } from '../../core/defaults';
import { LocalModelService } from '../services/local-model-service';
import { FineTuningService } from '../services/fine-tuning-service';
import { SandboxService } from '../services/sandbox-service';
const { buildSharedNavBarHtml, injectSharedNavBar } = require('../../../shared/nav-bar-server.js');

export { AI_MODEL_HUB_API_PREFIX, AI_MODEL_HUB_PAGE_ROUTES };

const AI_MODEL_HUB_PAGE_SOURCE = path.join(
  __dirname,
  '..',
  '..',
  'frontend',
  'pages',
  'ai-hub',
  'index.html'
);
type AIModelHubRuntime = {
  config: AIModelHubConfig;
  localModels: LocalModelService;
  fineTuning: FineTuningService;
  sandbox: SandboxService;
  initializePromise: Promise<void>;
};

let runtime: AIModelHubRuntime | null = null;

function createRuntime(config?: Partial<AIModelHubConfig> | null): AIModelHubRuntime {
  const mergedConfig = mergeAIModelHubConfig(config);
  const nextRuntime: AIModelHubRuntime = {
    config: mergedConfig,
    localModels: new LocalModelService(mergedConfig.localModels),
    fineTuning: new FineTuningService(mergedConfig.fineTuning),
    sandbox: new SandboxService(mergedConfig.sandbox),
    initializePromise: Promise.resolve(),
  };

  nextRuntime.initializePromise = Promise.all([
    nextRuntime.localModels.initialize(),
    nextRuntime.fineTuning.initialize(),
    nextRuntime.sandbox.initialize(),
  ])
    .then(() => undefined)
    .catch((error) => {
      console.error('[ai-model-hub] 初始化失败:', error);
    });

  return nextRuntime;
}

function getRuntime(): AIModelHubRuntime {
  if (!runtime) {
    runtime = createRuntime();
  }

  return runtime;
}

function resolvePluginConfig(api: any): Partial<AIModelHubConfig> | null {
  const config =
    api?.pluginConfig ||
    api?.config?.plugins?.entries?.['ai-model-hub']?.config ||
    null;

  return config && typeof config === 'object' ? (config as Partial<AIModelHubConfig>) : null;
}

function readUtf8File(filePath: string, fallback: string): string {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error('[ai-model-hub] 读取文件失败:', filePath, error);
    return fallback;
  }
}

function injectNavBar(html: string): string {
  const navBarHtml = buildSharedNavBarHtml({
    sharedRoot: path.join(__dirname, '..', '..', '..', 'shared'),
    activeHrefs: ['/ai-hub'],
    fallbackHtml: '<div class="nav-bar"><a href="/ai-hub" class="on">模型中心</a></div>',
  });
  return injectSharedNavBar({ html, navBarHtml });
}

function getPageHtml(): string {
  const fallback = '<html><body><h1>AI 模型中心页面加载失败</h1></body></html>';
  return injectNavBar(readUtf8File(AI_MODEL_HUB_PAGE_SOURCE, fallback));
}

function jsonRes(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

function parseQuery(url: string): Record<string, string> {
  const queryIndex = url.indexOf('?');
  const searchParams = new URLSearchParams(queryIndex >= 0 ? url.slice(queryIndex + 1) : '');
  return Object.fromEntries(searchParams.entries());
}

async function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

function matchActionRoute(routePath: string, action: 'detail' | 'start' | 'export'): string | null {
  const suffix = action === 'detail' ? '' : `/${action}`;
  const match = routePath.match(new RegExp(`^${AI_MODEL_HUB_API_PREFIX}/finetune/jobs/([^/]+)${suffix}$`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function configureAIModelHubRuntime(api: any): void {
  runtime = createRuntime(resolvePluginConfig(api));
}

export function disposeAIModelHubRuntime(): void {
  runtime = null;
}

export async function handleAIModelHubPage(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const routePath = (req.url || '').split('?')[0];
  if (!AI_MODEL_HUB_PAGE_ROUTES.includes(routePath as (typeof AI_MODEL_HUB_PAGE_ROUTES)[number])) {
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

export async function handleAIModelHubApi(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const method = req.method || 'GET';
  const url = req.url || '';
  const routePath = url.split('?')[0];
  const query = parseQuery(url);

  if (!routePath.startsWith(AI_MODEL_HUB_API_PREFIX)) {
    return false;
  }

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return true;
  }

  const currentRuntime = getRuntime();

  try {
    if (routePath === `${AI_MODEL_HUB_API_PREFIX}/health` && method === 'GET') {
      await currentRuntime.localModels.refreshStatus();
      jsonRes(res, {
        success: true,
        status: 'ok',
        module: 'ai-model-hub',
        pageSource: AI_MODEL_HUB_PAGE_SOURCE,
        pageRoutes: [...AI_MODEL_HUB_PAGE_ROUTES],
        services: {
          ollamaReady: currentRuntime.localModels.isOllamaReady(),
          vllmReady: currentRuntime.localModels.isVLLMReady(),
          fineTuningReady: currentRuntime.fineTuning.getReadyState(),
          sandboxReady: currentRuntime.sandbox.getReadyState(),
        },
      });
      return true;
    }

    if (routePath === `${AI_MODEL_HUB_API_PREFIX}/config` && method === 'GET') {
      jsonRes(res, { success: true, data: currentRuntime.config });
      return true;
    }

    if (routePath === `${AI_MODEL_HUB_API_PREFIX}/models/status` && method === 'GET') {
      await currentRuntime.localModels.refreshStatus();
      jsonRes(res, { success: true, data: currentRuntime.localModels.getStatus() });
      return true;
    }

    if (routePath === `${AI_MODEL_HUB_API_PREFIX}/models/ollama` && method === 'GET') {
      jsonRes(res, { success: true, data: await currentRuntime.localModels.getOllamaModels() });
      return true;
    }

    if (routePath === `${AI_MODEL_HUB_API_PREFIX}/models/local` && method === 'GET') {
      jsonRes(res, { success: true, data: await currentRuntime.localModels.scanLocalModels(query.dir) });
      return true;
    }

    if (routePath === `${AI_MODEL_HUB_API_PREFIX}/models/ollama/pull` && method === 'POST') {
      const body = await parseBody(req);
      await currentRuntime.localModels.pullOllamaModel(body.model);
      jsonRes(res, { success: true });
      return true;
    }

    if (routePath === `${AI_MODEL_HUB_API_PREFIX}/models/ollama/generate` && method === 'POST') {
      const body = await parseBody(req);
      const text = await currentRuntime.localModels.generateWithOllama(body.model, body.prompt, body.options);
      jsonRes(res, { success: true, data: text });
      return true;
    }

    if (routePath === `${AI_MODEL_HUB_API_PREFIX}/models/vllm/generate` && method === 'POST') {
      const body = await parseBody(req);
      const messages = Array.isArray(body.messages) ? body.messages : [];
      const text = await currentRuntime.localModels.generateWithVLLM(messages, body.options);
      jsonRes(res, { success: true, data: text });
      return true;
    }

    if (routePath === `${AI_MODEL_HUB_API_PREFIX}/models/vllm/start` && method === 'POST') {
      const body = await parseBody(req);
      await currentRuntime.localModels.startVLLM(body.modelPath, Number(body.gpuCount) || 1);
      jsonRes(res, { success: true });
      return true;
    }

    if (routePath === `${AI_MODEL_HUB_API_PREFIX}/finetune/base-models` && method === 'GET') {
      jsonRes(res, { success: true, data: currentRuntime.fineTuning.getSupportedBaseModels() });
      return true;
    }

    if (routePath === `${AI_MODEL_HUB_API_PREFIX}/finetune/jobs` && method === 'GET') {
      jsonRes(res, { success: true, data: currentRuntime.fineTuning.getJobs() });
      return true;
    }

    if (routePath === `${AI_MODEL_HUB_API_PREFIX}/finetune/jobs` && method === 'POST') {
      const body = (await parseBody(req)) as TrainingJobCreateInput;
      const job = currentRuntime.fineTuning.createTrainingJob(body);
      jsonRes(res, { success: true, data: job });
      return true;
    }

    const detailJobId = matchActionRoute(routePath, 'detail');
    if (detailJobId && method === 'GET') {
      const job = currentRuntime.fineTuning.getJob(detailJobId);
      if (!job) {
        jsonRes(res, { success: false, error: '训练任务不存在' }, 404);
        return true;
      }

      jsonRes(res, { success: true, data: job });
      return true;
    }

    const startJobId = matchActionRoute(routePath, 'start');
    if (startJobId && method === 'POST') {
      await currentRuntime.fineTuning.startTraining(startJobId);
      jsonRes(res, { success: true });
      return true;
    }

    const exportJobId = matchActionRoute(routePath, 'export');
    if (exportJobId && method === 'POST') {
      const body = await parseBody(req);
      const format = (body.format || 'huggingface') as 'gguf' | 'ollama' | 'huggingface';
      const exportPath = await currentRuntime.fineTuning.exportModel(exportJobId, format);
      jsonRes(res, { success: true, data: { path: exportPath } });
      return true;
    }

    if (routePath === `${AI_MODEL_HUB_API_PREFIX}/sandbox/config` && method === 'GET') {
      jsonRes(res, { success: true, data: currentRuntime.sandbox.getConfig() });
      return true;
    }

    if (routePath === `${AI_MODEL_HUB_API_PREFIX}/sandbox/config` && method === 'POST') {
      const body = (await parseBody(req)) as Partial<SandboxConfig>;
      const nextConfig = currentRuntime.sandbox.updateConfig(body);
      jsonRes(res, { success: true, data: nextConfig });
      return true;
    }

    if (routePath === `${AI_MODEL_HUB_API_PREFIX}/sandbox/analyze` && method === 'POST') {
      const body = await parseBody(req);
      const result = body.language === 'python'
        ? await currentRuntime.sandbox.analyzePythonCode(body.code || '')
        : currentRuntime.sandbox.analyzeJavaScriptCode(body.code || '');
      jsonRes(res, { success: true, data: result });
      return true;
    }

    if (routePath === `${AI_MODEL_HUB_API_PREFIX}/sandbox/execute` && method === 'POST') {
      const body = await parseBody(req);
      const result = await currentRuntime.sandbox.executeCode(
        body.code || '',
        body.language === 'python' ? 'python' : 'javascript',
        Number(body.timeout) || 30000
      );
      jsonRes(res, { success: true, data: result });
      return true;
    }
  } catch (error) {
    console.error('[ai-model-hub] API 处理失败:', error);
    jsonRes(
      res,
      { success: false, error: error instanceof Error ? error.message : 'AI 模型中心接口错误' },
      500
    );
    return true;
  }

  jsonRes(res, { success: false, error: 'AI Model Hub API route not found' }, 404);
  return true;
}

