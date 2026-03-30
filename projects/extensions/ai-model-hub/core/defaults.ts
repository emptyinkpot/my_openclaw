import * as path from 'path';
import type { AIModelHubConfig } from '../contracts';

export const AI_MODEL_HUB_PAGE_ROUTES = ['/ai-hub', '/ai-hub/'] as const;
export const AI_MODEL_HUB_API_PREFIX = '/api/ai-hub';

const DEFAULT_BLOCKED_MODULES = ['os', 'subprocess', 'socket', 'requests', 'child_process', 'fs', 'http'];

export function resolveAIModelHubRoot(): string {
  const normalizedDir = path.normalize(__dirname);
  const distToken = `${path.sep}dist${path.sep}`;
  return normalizedDir.includes(distToken)
    ? path.resolve(__dirname, '..', '..')
    : path.resolve(__dirname, '..');
}

export function getPythonCommand(): string {
  return process.env.PYTHON_COMMAND || (process.platform === 'win32' ? 'python' : 'python3');
}

function resolveAIModelHubRuntimeRoot(moduleRoot: string): string {
  const runtimeBase = path.resolve(
    process.env.AI_MODEL_HUB_RUNTIME_ROOT ||
      process.env.OPENCLAW_RUNTIME_ROOT ||
      path.join(moduleRoot, '..', '..', '.runtime')
  );

  return path.join(runtimeBase, 'extensions', 'ai-model-hub');
}

export function getDefaultAIModelHubConfig(): AIModelHubConfig {
  const moduleRoot = resolveAIModelHubRoot();
  const runtimeRoot = resolveAIModelHubRuntimeRoot(moduleRoot);

  return {
    localModels: {
      ollama: {
        enabled: true,
        host: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',
        defaultModel: 'qwen2.5:7b',
      },
      vllm: {
        enabled: false,
        host: process.env.VLLM_HOST || 'http://127.0.0.1:8000',
      },
      scanDir: path.join(runtimeRoot, 'models'),
    },
    fineTuning: {
      unsloth: {
        enabled: false,
        outputDir: path.join(runtimeRoot, 'fine-tuned'),
        defaultConfig: {
          r: 16,
          loraAlpha: 16,
          epochs: 3,
          learningRate: 2e-4,
          batchSize: 2,
        },
      },
    },
    sandbox: {
      enabled: true,
      provider: 'local',
      astCheck: true,
      blockedModules: [...DEFAULT_BLOCKED_MODULES],
    },
  };
}

export function mergeAIModelHubConfig(
  partialConfig?: Partial<AIModelHubConfig> | null
): AIModelHubConfig {
  const defaults = getDefaultAIModelHubConfig();
  const next = partialConfig || {};

  return {
    localModels: {
      ...defaults.localModels,
      ...next.localModels,
      ollama: {
        ...defaults.localModels.ollama,
        ...next.localModels?.ollama,
      },
      vllm: {
        ...defaults.localModels.vllm,
        ...next.localModels?.vllm,
      },
    },
    fineTuning: {
      ...defaults.fineTuning,
      ...next.fineTuning,
      unsloth: {
        ...defaults.fineTuning.unsloth,
        ...next.fineTuning?.unsloth,
        defaultConfig: {
          ...defaults.fineTuning.unsloth.defaultConfig,
          ...next.fineTuning?.unsloth?.defaultConfig,
        },
      },
    },
    sandbox: {
      ...defaults.sandbox,
      ...next.sandbox,
      blockedModules: Array.isArray(next.sandbox?.blockedModules)
        ? [...next.sandbox.blockedModules]
        : [...defaults.sandbox.blockedModules],
    },
  };
}
