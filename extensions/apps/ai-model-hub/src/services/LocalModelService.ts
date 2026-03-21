/**
 * 本地模型服务 - 管理Ollama和vLLM部署
 */

import axios from 'axios';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

export interface LocalModelConfig {
  ollama?: {
    enabled: boolean;
    host: string;
    defaultModel: string;
  };
  vllm?: {
    enabled: boolean;
    host: string;
    model?: string;
  };
}

export interface ModelInfo {
  name: string;
  size: string;
  parameterSize?: string;
  quantization?: string;
  format: 'gguf' | 'safetensors' | 'other';
  source: 'ollama' | 'vllm' | 'local';
  status: 'ready' | 'downloading' | 'error';
}

export class LocalModelService {
  private config: LocalModelConfig;
  private ollamaReady: boolean = false;
  private vllmReady: boolean = false;

  constructor(config: LocalModelConfig = {}) {
    this.config = config;
  }

  public async initialize(): Promise<void> {
    console.log('🔧 初始化本地模型服务...');

    // 检查Ollama
    if (this.config.ollama?.enabled) {
      await this.checkOllama();
    }

    // 检查vLLM
    if (this.config.vllm?.enabled) {
      await this.checkVLLM();
    }
  }

  private async checkOllama(): Promise<void> {
    try {
      const response = await axios.get(`${this.config.ollama!.host}/api/tags`, {
        timeout: 5000
      });
      this.ollamaReady = true;
      console.log('✅ Ollama服务已连接');
      console.log(`   可用模型: ${response.data.models?.length || 0}个`);
    } catch (error) {
      console.warn('⚠️ Ollama服务未启动或无法连接');
      console.log(`   请运行: ollama serve`);
      this.ollamaReady = false;
    }
  }

  private async checkVLLM(): Promise<void> {
    try {
      const response = await axios.get(`${this.config.vllm!.host}/health`, {
        timeout: 5000
      });
      this.vllmReady = true;
      console.log('✅ vLLM服务已连接');
    } catch (error) {
      console.warn('⚠️ vLLM服务未启动或无法连接');
      this.vllmReady = false;
    }
  }

  public isOllamaReady(): boolean {
    return this.ollamaReady;
  }

  public isVLLMReady(): boolean {
    return this.vllmReady;
  }

  /**
   * 获取Ollama模型列表
   */
  public async getOllamaModels(): Promise<ModelInfo[]> {
    if (!this.ollamaReady) {
      throw new Error('Ollama服务未就绪');
    }

    const response = await axios.get(`${this.config.ollama!.host}/api/tags`);
    return response.data.models?.map((m: any) => ({
      name: m.name,
      size: this.formatSize(m.size),
      parameterSize: m.details?.parameter_size,
      quantization: m.details?.quantization_level,
      format: 'gguf',
      source: 'ollama',
      status: 'ready'
    })) || [];
  }

  /**
   * 拉取Ollama模型
   */
  public async pullOllamaModel(modelName: string): Promise<void> {
    if (!this.ollamaReady) {
      throw new Error('Ollama服务未就绪');
    }

    console.log(`📥 正在拉取模型: ${modelName}`);
    
    const response = await axios.post(
      `${this.config.ollama!.host}/api/pull`,
      { name: modelName, stream: false },
      { timeout: 300000 } // 5分钟超时
    );

    if (response.data.status === 'success') {
      console.log(`✅ 模型 ${modelName} 拉取成功`);
    } else {
      throw new Error(`拉取失败: ${response.data.status}`);
    }
  }

  /**
   * 使用Ollama生成文本
   */
  public async generateWithOllama(
    model: string,
    prompt: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    } = {}
  ): Promise<string | AsyncIterable<string>> {
    if (!this.ollamaReady) {
      throw new Error('Ollama服务未就绪');
    }

    const requestBody = {
      model,
      prompt,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens ?? 2048
      },
      stream: options.stream ?? false
    };

    if (options.stream) {
      // 返回流式响应
      return this.streamOllamaResponse(requestBody);
    } else {
      const response = await axios.post(
        `${this.config.ollama!.host}/api/generate`,
        requestBody,
        { timeout: 120000 }
      );
      return response.data.response;
    }
  }

  private async *streamOllamaResponse(requestBody: any): AsyncIterable<string> {
    const response = await axios.post(
      `${this.config.ollama!.host}/api/generate`,
      { ...requestBody, stream: true },
      { responseType: 'stream', timeout: 120000 }
    );

    for await (const chunk of response.data) {
      const lines = chunk.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.response) {
            yield data.response;
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
  }

  /**
   * 使用vLLM生成文本 (OpenAI兼容API)
   */
  public async generateWithVLLM(
    messages: Array<{ role: string; content: string }>,
    options: {
      temperature?: number;
      maxTokens?: number;
      model?: string;
    } = {}
  ): Promise<string> {
    if (!this.vllmReady) {
      throw new Error('vLLM服务未就绪');
    }

    const response = await axios.post(
      `${this.config.vllm!.host}/v1/chat/completions`,
      {
        model: options.model || this.config.vllm?.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048
      },
      { timeout: 120000 }
    );

    return response.data.choices?.[0]?.message?.content || '';
  }

  /**
   * 启动vLLM服务
   */
  public async startVLLM(modelPath: string, gpuCount: number = 1): Promise<void> {
    console.log(`🚀 启动vLLM服务，模型: ${modelPath}`);
    
    const vllmProcess = spawn('python', [
      '-m', 'vllm.entrypoints.openai.api_server',
      '--model', modelPath,
      '--tensor-parallel-size', gpuCount.toString(),
      '--port', '8000'
    ], {
      detached: true,
      stdio: 'ignore'
    });

    vllmProcess.unref();

    // 等待服务启动
    let retries = 0;
    while (retries < 30) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        await this.checkVLLM();
        if (this.vllmReady) {
          console.log('✅ vLLM服务启动成功');
          return;
        }
      } catch (e) {
        retries++;
      }
    }

    throw new Error('vLLM服务启动超时');
  }

  /**
   * 扫描本地模型文件
   */
  public async scanLocalModels(modelDir: string): Promise<ModelInfo[]> {
    const models: ModelInfo[] = [];

    if (!fs.existsSync(modelDir)) {
      return models;
    }

    const files = fs.readdirSync(modelDir);
    
    for (const file of files) {
      const filePath = path.join(modelDir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // 检查是否是Hugging Face模型目录
        const hasConfig = fs.existsSync(path.join(filePath, 'config.json'));
        const hasModelBin = fs.existsSync(path.join(filePath, 'model.safetensors')) ||
                           fs.existsSync(path.join(filePath, 'pytorch_model.bin'));
        
        if (hasConfig && hasModelBin) {
          models.push({
            name: file,
            size: this.formatSize(this.getDirectorySize(filePath)),
            format: 'safetensors',
            source: 'local',
            status: 'ready'
          });
        }
      } else if (file.endsWith('.gguf')) {
        models.push({
          name: file.replace('.gguf', ''),
          size: this.formatSize(stat.size),
          format: 'gguf',
          source: 'local',
          status: 'ready'
        });
      }
    }

    return models;
  }

  private getDirectorySize(dirPath: string): number {
    let size = 0;
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        size += this.getDirectorySize(filePath);
      } else {
        size += stat.size;
      }
    }
    
    return size;
  }

  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
