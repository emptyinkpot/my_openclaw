export interface AIModelHubConfig {
  localModels: LocalModelConfig;
  fineTuning: FineTuningConfig;
  sandbox: SandboxConfig;
}

export interface LocalModelConfig {
  ollama: {
    enabled: boolean;
    host: string;
    defaultModel: string;
  };
  vllm: {
    enabled: boolean;
    host: string;
    model?: string;
  };
  scanDir?: string;
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

export interface FineTuningConfig {
  unsloth: {
    enabled: boolean;
    outputDir: string;
    defaultConfig: TrainingJobConfig;
  };
}

export interface TrainingJobConfig {
  r: number;
  loraAlpha: number;
  epochs: number;
  learningRate: number;
  batchSize: number;
}

export interface TrainingJobCreateInput {
  name: string;
  baseModel: string;
  dataset: string;
  config?: Partial<TrainingJobConfig>;
}

export interface TrainingJob {
  id: string;
  name: string;
  baseModel: string;
  dataset: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  config: TrainingJobConfig;
  progress: {
    currentEpoch: number;
    totalEpochs: number;
    loss: number;
    learningRate: number;
  };
  outputPath?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface SandboxConfig {
  enabled: boolean;
  provider: 'e2b' | 'local' | 'docker';
  astCheck: boolean;
  blockedModules: string[];
}

export interface CodeAnalysisResult {
  safe: boolean;
  threats: Array<{
    type: 'dangerous_import' | 'dangerous_call' | 'network_access' | 'file_access';
    line: number;
    code: string;
    message: string;
  }>;
  imports: string[];
  functionCalls: string[];
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  memoryUsage?: number;
}
