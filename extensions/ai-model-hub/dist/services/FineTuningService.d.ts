/**
 * 微调服务 - 基于Unsloth实现高效LoRA微调
 *
 * 技术栈:
 * - Unsloth: 2倍训练速度，70%显存节省
 * - PEFT: Hugging Face参数高效微调库
 * - LoRA: 低秩适配技术
 */
export interface FineTuningConfig {
    unsloth?: {
        enabled: boolean;
        outputDir: string;
        defaultConfig: {
            r: number;
            loraAlpha: number;
            epochs: number;
        };
    };
}
export interface TrainingJob {
    id: string;
    name: string;
    baseModel: string;
    dataset: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    config: {
        r: number;
        loraAlpha: number;
        epochs: number;
        learningRate: number;
        batchSize: number;
    };
    progress: {
        currentEpoch: number;
        totalEpochs: number;
        loss: number;
        learningRate: number;
    };
    outputPath?: string;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
}
export declare class FineTuningService {
    private config;
    private jobs;
    private isReady;
    constructor(config?: FineTuningConfig);
    initialize(): Promise<void>;
    private installUnsloth;
    getReadyState(): boolean;
    /**
     * 创建训练任务
     */
    createTrainingJob(params: {
        name: string;
        baseModel: string;
        dataset: string;
        config?: Partial<TrainingJob['config']>;
    }): TrainingJob;
    /**
     * 启动训练
     */
    startTraining(jobId: string): Promise<void>;
    /**
     * 生成Unsloth训练脚本
     */
    private generateTrainingScript;
    /**
     * 解析训练输出
     */
    private parseTrainingOutput;
    /**
     * 获取训练任务列表
     */
    getJobs(): TrainingJob[];
    /**
     * 获取训练任务详情
     */
    getJob(jobId: string): TrainingJob | undefined;
    /**
     * 导出模型
     */
    exportModel(jobId: string, format: 'gguf' | 'ollama' | 'huggingface'): Promise<string>;
    /**
     * 获取支持的预训练模型列表
     */
    getSupportedBaseModels(): Array<{
        name: string;
        description: string;
        size: string;
    }>;
}
//# sourceMappingURL=FineTuningService.d.ts.map