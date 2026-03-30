import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import type { LocalModelConfig, ModelInfo } from '../../contracts';

export class LocalModelService {
  private readonly config: LocalModelConfig;
  private ollamaReady = false;
  private vllmReady = false;

  constructor(config: LocalModelConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.config.ollama.enabled) {
      await this.checkOllama();
    }

    if (this.config.vllm.enabled) {
      await this.checkVLLM();
    }
  }

  async refreshStatus(): Promise<void> {
    await Promise.all([this.checkOllama(), this.checkVLLM()]);
  }

  isOllamaReady(): boolean {
    return this.ollamaReady;
  }

  isVLLMReady(): boolean {
    return this.vllmReady;
  }

  getStatus(): { ollamaReady: boolean; vllmReady: boolean; defaultModel: string } {
    return {
      ollamaReady: this.ollamaReady,
      vllmReady: this.vllmReady,
      defaultModel: this.config.ollama.defaultModel,
    };
  }

  async getOllamaModels(): Promise<ModelInfo[]> {
    if (!this.ollamaReady) {
      throw new Error('Ollama 服务未就绪');
    }

    const response = await axios.get(`${this.config.ollama.host}/api/tags`, { timeout: 10000 });
    return (response.data.models || []).map((model: any) => ({
      name: model.name,
      size: this.formatSize(model.size),
      parameterSize: model.details?.parameter_size,
      quantization: model.details?.quantization_level,
      format: 'gguf',
      source: 'ollama',
      status: 'ready',
    }));
  }

  async pullOllamaModel(modelName: string): Promise<void> {
    if (!modelName) {
      throw new Error('缺少模型名称');
    }

    if (!this.ollamaReady) {
      throw new Error('Ollama 服务未就绪');
    }

    const response = await axios.post(
      `${this.config.ollama.host}/api/pull`,
      { name: modelName, stream: false },
      { timeout: 300000 }
    );

    if (response.data?.status !== 'success') {
      throw new Error(`模型拉取失败: ${response.data?.status || 'unknown'}`);
    }
  }

  async generateWithOllama(
    model: string,
    prompt: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      numCtx?: number;
    } = {}
  ): Promise<string> {
    if (!this.ollamaReady) {
      throw new Error('Ollama 服务未就绪');
    }

    if (!model || !prompt) {
      throw new Error('缺少模型或提示词');
    }

    const response = await axios.post(
      `${this.config.ollama.host}/api/generate`,
      {
        model,
        prompt,
        options: {
          temperature: options.temperature ?? 0.7,
          num_ctx: options.numCtx ?? 2048,
          num_predict: options.maxTokens ?? 2048,
          num_gpu: 0,
          low_vram: true,
          use_mmap: true,
        },
        stream: false,
      },
      { timeout: 120000 }
    );

    return response.data?.response || '';
  }

  async generateWithVLLM(
    messages: Array<{ role: string; content: string }>,
    options: {
      temperature?: number;
      maxTokens?: number;
      model?: string;
    } = {}
  ): Promise<string> {
    if (!this.vllmReady) {
      throw new Error('vLLM 服务未就绪');
    }

    const response = await axios.post(
      `${this.config.vllm.host}/v1/chat/completions`,
      {
        model: options.model || this.config.vllm.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
      },
      { timeout: 120000 }
    );

    return response.data?.choices?.[0]?.message?.content || '';
  }

  async startVLLM(modelPath: string, gpuCount = 1): Promise<void> {
    if (!modelPath) {
      throw new Error('缺少模型路径');
    }

    const processHandle = spawn(
      'python',
      [
        '-m',
        'vllm.entrypoints.openai.api_server',
        '--model',
        modelPath,
        '--tensor-parallel-size',
        String(gpuCount),
        '--port',
        '8000',
      ],
      {
        detached: true,
        stdio: 'ignore',
      }
    );

    processHandle.unref();

    for (let index = 0; index < 30; index += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await this.checkVLLM();
      if (this.vllmReady) {
        return;
      }
    }

    throw new Error('vLLM 启动超时');
  }

  async scanLocalModels(dir?: string): Promise<ModelInfo[]> {
    const targetDir = dir || this.config.scanDir || path.join(process.cwd(), 'models');
    if (!fs.existsSync(targetDir)) {
      return [];
    }

    const models: ModelInfo[] = [];

    for (const fileName of fs.readdirSync(targetDir)) {
      const filePath = path.join(targetDir, fileName);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        const hasConfig = fs.existsSync(path.join(filePath, 'config.json'));
        const hasWeights =
          fs.existsSync(path.join(filePath, 'model.safetensors')) ||
          fs.existsSync(path.join(filePath, 'pytorch_model.bin'));

        if (hasConfig && hasWeights) {
          models.push({
            name: fileName,
            size: this.formatSize(this.getDirectorySize(filePath)),
            format: 'safetensors',
            source: 'local',
            status: 'ready',
          });
        }
        continue;
      }

      if (fileName.endsWith('.gguf')) {
        models.push({
          name: fileName.replace(/\.gguf$/i, ''),
          size: this.formatSize(stat.size),
          format: 'gguf',
          source: 'local',
          status: 'ready',
        });
      }
    }

    return models;
  }

  private async checkOllama(): Promise<void> {
    if (!this.config.ollama.enabled) {
      this.ollamaReady = false;
      return;
    }

    try {
      await axios.get(`${this.config.ollama.host}/api/tags`, { timeout: 5000 });
      this.ollamaReady = true;
    } catch {
      this.ollamaReady = false;
    }
  }

  private async checkVLLM(): Promise<void> {
    if (!this.config.vllm.enabled) {
      this.vllmReady = false;
      return;
    }

    try {
      await axios.get(`${this.config.vllm.host}/health`, { timeout: 5000 });
      this.vllmReady = true;
    } catch {
      this.vllmReady = false;
    }
  }

  private getDirectorySize(dirPath: string): number {
    let total = 0;

    for (const fileName of fs.readdirSync(dirPath)) {
      const filePath = path.join(dirPath, fileName);
      const stat = fs.statSync(filePath);
      total += stat.isDirectory() ? this.getDirectorySize(filePath) : stat.size;
    }

    return total;
  }

  private formatSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / 1024 ** index;
    return `${value.toFixed(value >= 10 || index === 0 ? 0 : 2)} ${units[index]}`;
  }
}
