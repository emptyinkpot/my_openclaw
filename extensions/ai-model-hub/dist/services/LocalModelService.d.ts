/**
 * 本地模型服务 - 管理Ollama和vLLM部署
 */
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
export declare class LocalModelService {
    private config;
    private ollamaReady;
    private vllmReady;
    constructor(config?: LocalModelConfig);
    initialize(): Promise<void>;
    private checkOllama;
    private checkVLLM;
    isOllamaReady(): boolean;
    isVLLMReady(): boolean;
    /**
     * 获取Ollama模型列表
     */
    getOllamaModels(): Promise<ModelInfo[]>;
    /**
     * 拉取Ollama模型
     */
    pullOllamaModel(modelName: string): Promise<void>;
    /**
     * 使用Ollama生成文本
     */
    generateWithOllama(model: string, prompt: string, options?: {
        temperature?: number;
        maxTokens?: number;
        stream?: boolean;
    }): Promise<string | AsyncIterable<string>>;
    private streamOllamaResponse;
    /**
     * 使用vLLM生成文本 (OpenAI兼容API)
     */
    generateWithVLLM(messages: Array<{
        role: string;
        content: string;
    }>, options?: {
        temperature?: number;
        maxTokens?: number;
        model?: string;
    }): Promise<string>;
    /**
     * 启动vLLM服务
     */
    startVLLM(modelPath: string, gpuCount?: number): Promise<void>;
    /**
     * 扫描本地模型文件
     */
    scanLocalModels(modelDir: string): Promise<ModelInfo[]>;
    private getDirectorySize;
    private formatSize;
}
//# sourceMappingURL=LocalModelService.d.ts.map