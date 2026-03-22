/**
 * 微调服务 - 基于Unsloth实现高效LoRA微调
 * 
 * 技术栈:
 * - Unsloth: 2倍训练速度，70%显存节省
 * - PEFT: Hugging Face参数高效微调库
 * - LoRA: 低秩适配技术
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

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

export class FineTuningService {
  private config: FineTuningConfig;
  private jobs: Map<string, TrainingJob> = new Map();
  private isReady: boolean = false;

  constructor(config: FineTuningConfig = {}) {
    this.config = config;
  }

  public async initialize(): Promise<void> {
    console.log('🔧 初始化微调服务...');

    if (!this.config.unsloth?.enabled) {
      console.log('⏭️ Unsloth微调服务已禁用');
      return;
    }

    // 检查Python环境
    try {
      await execAsync('python3 --version');
      console.log('✅ Python环境检查通过');
    } catch {
      console.warn('⚠️ Python3未安装');
      return;
    }

    // 检查Unsloth是否安装
    try {
      await execAsync('python3 -c "import unsloth; print(unsloth.__version__)"');
      console.log('✅ Unsloth已安装');
      this.isReady = true;
    } catch {
      console.warn('⚠️ Unsloth未安装，正在安装...');
      await this.installUnsloth();
    }

    // 确保输出目录存在
    const outputDir = this.config.unsloth?.outputDir || './models/fine-tuned';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  private async installUnsloth(): Promise<void> {
    console.log('📦 安装Unsloth...');
    try {
      // 使用pip安装unsloth
      await execAsync('pip install unsloth transformers datasets peft accelerate bitsandbytes', {
        timeout: 300000 // 5分钟超时
      });
      console.log('✅ Unsloth安装完成');
      this.isReady = true;
    } catch (error) {
      console.error('❌ Unsloth安装失败:', error);
      this.isReady = false;
    }
  }

  public getReadyState(): boolean {
    return this.isReady;
  }

  /**
   * 创建训练任务
   */
  public createTrainingJob(params: {
    name: string;
    baseModel: string;
    dataset: string;
    config?: Partial<TrainingJob['config']>;
  }): TrainingJob {
    const jobId = `ft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: TrainingJob = {
      id: jobId,
      name: params.name,
      baseModel: params.baseModel,
      dataset: params.dataset,
      status: 'pending',
      config: {
        r: params.config?.r ?? this.config.unsloth?.defaultConfig.r ?? 16,
        loraAlpha: params.config?.loraAlpha ?? this.config.unsloth?.defaultConfig.loraAlpha ?? 16,
        epochs: params.config?.epochs ?? this.config.unsloth?.defaultConfig.epochs ?? 3,
        learningRate: params.config?.learningRate ?? 2e-4,
        batchSize: params.config?.batchSize ?? 2
      },
      progress: {
        currentEpoch: 0,
        totalEpochs: params.config?.epochs ?? 3,
        loss: 0,
        learningRate: 2e-4
      },
      createdAt: new Date()
    };

    this.jobs.set(jobId, job);
    return job;
  }

  /**
   * 启动训练
   */
  public async startTraining(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error('训练任务不存在');
    }

    if (!this.isReady) {
      throw new Error('微调服务未就绪');
    }

    job.status = 'running';
    job.startedAt = new Date();

    // 生成训练脚本
    const scriptPath = await this.generateTrainingScript(job);

    // 启动训练进程
    const trainProcess = spawn('python3', [scriptPath], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // 监听输出
    trainProcess.stdout.on('data', (data) => {
      const output = data.toString();
      this.parseTrainingOutput(job, output);
    });

    trainProcess.stderr.on('data', (data) => {
      console.error(`训练错误: ${data}`);
    });

    trainProcess.on('close', (code) => {
      if (code === 0) {
        job.status = 'completed';
        job.completedAt = new Date();
        job.outputPath = path.join(
          this.config.unsloth!.outputDir,
          job.id,
          'final_model'
        );
        console.log(`✅ 训练任务 ${jobId} 完成`);
      } else {
        job.status = 'failed';
        console.error(`❌ 训练任务 ${jobId} 失败，退出码: ${code}`);
      }
    });

    console.log(`🚀 训练任务 ${jobId} 已启动`);
  }

  /**
   * 生成Unsloth训练脚本
   */
  private async generateTrainingScript(job: TrainingJob): Promise<string> {
    const scriptDir = path.join(this.config.unsloth!.outputDir, job.id);
    if (!fs.existsSync(scriptDir)) {
      fs.mkdirSync(scriptDir, { recursive: true });
    }

    const scriptContent = `
# 自动生成的Unsloth训练脚本
import torch
from unsloth import FastLanguageModel
from datasets import load_dataset
from trl import SFTTrainer
from transformers import TrainingArguments
from peft import LoraConfig

# 配置
max_seq_length = 2048
dtype = None  # 自动检测
load_in_4bit = True

# 加载模型
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = "${job.baseModel}",
    max_seq_length = max_seq_length,
    dtype = dtype,
    load_in_4bit = load_in_4bit,
)

# 添加LoRA适配器
model = FastLanguageModel.get_peft_model(
    model,
    r = ${job.config.r},
    target_modules = ["q_proj", "k_proj", "v_proj", "o_proj", 
                      "gate_proj", "up_proj", "down_proj"],
    lora_alpha = ${job.config.loraAlpha},
    lora_dropout = 0,
    bias = "none",
    use_gradient_checkpointing = "unsloth",
    random_state = 3407,
)

# 加载数据集
dataset = load_dataset("${job.dataset}", split = "train")

# 训练参数
training_args = TrainingArguments(
    per_device_train_batch_size = ${job.config.batchSize},
    gradient_accumulation_steps = 4,
    warmup_steps = 10,
    max_steps = -1,
    num_train_epochs = ${job.config.epochs},
    learning_rate = ${job.config.learningRate},
    fp16 = not torch.cuda.is_bf16_supported(),
    bf16 = torch.cuda.is_bf16_supported(),
    logging_steps = 10,
    optim = "adamw_8bit",
    weight_decay = 0.01,
    lr_scheduler_type = "linear",
    seed = 3407,
    output_dir = "${scriptDir}",
    report_to = "none",
)

# 创建训练器
trainer = SFTTrainer(
    model = model,
    tokenizer = tokenizer,
    train_dataset = dataset,
    dataset_text_field = "text",
    max_seq_length = max_seq_length,
    dataset_num_proc = 2,
    packing = False,
    args = training_args,
)

# 开始训练
trainer.train()

# 保存模型
model.save_pretrained_merged("${scriptDir}/final_model", tokenizer, save_method = "merged_16bit")
print("✅ 训练完成！")
`;

    const scriptPath = path.join(scriptDir, 'train.py');
    fs.writeFileSync(scriptPath, scriptContent);
    
    return scriptPath;
  }

  /**
   * 解析训练输出
   */
  private parseTrainingOutput(job: TrainingJob, output: string): void {
    // 解析损失和epoch信息
    const lossMatch = output.match(/loss[:\s]+([\d.]+)/i);
    const epochMatch = output.match(/epoch[:\s]+([\d.]+)/i);
    
    if (lossMatch) {
      job.progress.loss = parseFloat(lossMatch[1]);
    }
    if (epochMatch) {
      job.progress.currentEpoch = parseFloat(epochMatch[1]);
    }

    // 写入日志文件
    const logPath = path.join(this.config.unsloth!.outputDir, job.id, 'train.log');
    fs.appendFileSync(logPath, output);
  }

  /**
   * 获取训练任务列表
   */
  public getJobs(): TrainingJob[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  /**
   * 获取训练任务详情
   */
  public getJob(jobId: string): TrainingJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * 导出模型
   */
  public async exportModel(jobId: string, format: 'gguf' | 'ollama' | 'huggingface'): Promise<string> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'completed') {
      throw new Error('模型训练尚未完成');
    }

    const modelPath = job.outputPath!;
    const exportDir = path.join(this.config.unsloth!.outputDir, job.id, `export_${format}`);

    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    let script = '';
    
    switch (format) {
      case 'gguf':
        script = `
from unsloth import FastLanguageModel
model, tokenizer = FastLanguageModel.from_pretrained("${modelPath}")
model.save_pretrained_gguf("${exportDir}", tokenizer, quantization_method="q4_k_m")
`;
        break;
      case 'ollama':
        script = `
from unsloth import FastLanguageModel
model, tokenizer = FastLanguageModel.from_pretrained("${modelPath}")
model.save_pretrained_gguf("${exportDir}", tokenizer, quantization_method="q4_k_m")
# 创建Modelfile
with open("${exportDir}/Modelfile", "w") as f:
    f.write(f'''FROM ${exportDir}/unsloth.Q4_K_M.gguf
PARAMETER temperature 0.7
PARAMETER top_p 0.9
SYSTEM You are a helpful assistant.
''')
`;
        break;
      case 'huggingface':
        // 直接使用保存的模型
        return modelPath;
    }

    if (script) {
      const scriptPath = path.join(exportDir, 'export.py');
      fs.writeFileSync(scriptPath, script);
      await execAsync(`python3 ${scriptPath}`, { timeout: 300000 });
    }

    return exportDir;
  }

  /**
   * 获取支持的预训练模型列表
   */
  public getSupportedBaseModels(): Array<{ name: string; description: string; size: string }> {
    return [
      { name: 'unsloth/llama-3-8b-bnb-4bit', description: 'Llama 3 8B (4-bit量化)', size: '5GB' },
      { name: 'unsloth/llama-3-70b-bnb-4bit', description: 'Llama 3 70B (4-bit量化)', size: '40GB' },
      { name: 'unsloth/mistral-7b-bnb-4bit', description: 'Mistral 7B (4-bit量化)', size: '4GB' },
      { name: 'unsloth/qwen2-7b-bnb-4bit', description: 'Qwen2 7B (4-bit量化)', size: '4GB' },
      { name: 'unsloth/Phi-4', description: 'Phi-4 (4-bit量化)', size: '8GB' },
    ];
  }
}
