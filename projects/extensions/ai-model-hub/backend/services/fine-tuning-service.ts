import * as fs from 'fs';
import * as path from 'path';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import type {
  FineTuningConfig,
  TrainingJob,
  TrainingJobCreateInput,
  TrainingJobConfig,
} from '../../contracts';
import { getPythonCommand } from '../../core/defaults';

const execAsync = promisify(exec);

export class FineTuningService {
  private readonly config: FineTuningConfig;
  private readonly jobs = new Map<string, TrainingJob>();
  private ready = false;

  constructor(config: FineTuningConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    this.ensureOutputDir();

    if (!this.config.unsloth.enabled) {
      this.ready = false;
      return;
    }

    const python = getPythonCommand();

    try {
      await execAsync(`${python} --version`, { timeout: 10000 });
    } catch {
      this.ready = false;
      return;
    }

    try {
      await execAsync(`${python} -c "import unsloth"`, { timeout: 10000 });
      this.ready = true;
    } catch {
      this.ready = false;
    }
  }

  getReadyState(): boolean {
    return this.ready;
  }

  getJobs(): TrainingJob[] {
    return [...this.jobs.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  getJob(jobId: string): TrainingJob | undefined {
    return this.jobs.get(jobId);
  }

  createTrainingJob(input: TrainingJobCreateInput): TrainingJob {
    if (!input.name || !input.baseModel || !input.dataset) {
      throw new Error('训练任务信息不完整');
    }

    const defaults = this.config.unsloth.defaultConfig;
    const config: TrainingJobConfig = {
      r: input.config?.r ?? defaults.r,
      loraAlpha: input.config?.loraAlpha ?? defaults.loraAlpha,
      epochs: input.config?.epochs ?? defaults.epochs,
      learningRate: input.config?.learningRate ?? defaults.learningRate,
      batchSize: input.config?.batchSize ?? defaults.batchSize,
    };

    const createdAt = new Date().toISOString();
    const job: TrainingJob = {
      id: `ft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: input.name,
      baseModel: input.baseModel,
      dataset: input.dataset,
      status: 'pending',
      config,
      progress: {
        currentEpoch: 0,
        totalEpochs: config.epochs,
        loss: 0,
        learningRate: config.learningRate,
      },
      createdAt,
    };

    this.jobs.set(job.id, job);
    return job;
  }

  async startTraining(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error('训练任务不存在');
    }

    if (!this.ready) {
      throw new Error('微调服务未就绪，请先安装 Unsloth');
    }

    const python = getPythonCommand();
    const scriptPath = this.generateTrainingScript(job);
    const jobDir = path.dirname(scriptPath);

    job.status = 'running';
    job.startedAt = new Date().toISOString();

    const processHandle = spawn(python, [scriptPath], {
      cwd: jobDir,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    processHandle.stdout.on('data', (chunk: Buffer) => {
      this.parseTrainingOutput(job, chunk.toString());
    });

    processHandle.stderr.on('data', (chunk: Buffer) => {
      this.appendJobLog(job.id, chunk.toString());
    });

    processHandle.on('close', (code) => {
      if (code === 0) {
        job.status = 'completed';
        job.completedAt = new Date().toISOString();
        job.outputPath = path.join(jobDir, 'final_model');
        return;
      }

      job.status = 'failed';
    });
  }

  async exportModel(jobId: string, format: 'gguf' | 'ollama' | 'huggingface' = 'huggingface'): Promise<string> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'completed') {
      throw new Error('模型训练尚未完成');
    }

    if (!job.outputPath) {
      throw new Error('缺少模型输出目录');
    }

    if (format === 'huggingface') {
      return job.outputPath;
    }

    const exportDir = path.join(this.config.unsloth.outputDir, job.id, `export_${format}`);
    fs.mkdirSync(exportDir, { recursive: true });

    const python = getPythonCommand();
    const exportScriptPath = path.join(exportDir, 'export.py');
    const exportScript = this.buildExportScript(job.outputPath, exportDir, format);
    fs.writeFileSync(exportScriptPath, exportScript, 'utf8');
    await execAsync(`${python} "${exportScriptPath}"`, { timeout: 300000 });
    return exportDir;
  }

  getSupportedBaseModels(): Array<{ name: string; description: string; size: string }> {
    return [
      { name: 'unsloth/llama-3-8b-bnb-4bit', description: 'Llama 3 8B（4-bit）', size: '5GB' },
      { name: 'unsloth/mistral-7b-bnb-4bit', description: 'Mistral 7B（4-bit）', size: '4GB' },
      { name: 'unsloth/qwen2-7b-bnb-4bit', description: 'Qwen2 7B（4-bit）', size: '4GB' },
      { name: 'unsloth/Phi-4', description: 'Phi-4（4-bit）', size: '8GB' },
    ];
  }

  private ensureOutputDir(): void {
    fs.mkdirSync(this.config.unsloth.outputDir, { recursive: true });
  }

  private generateTrainingScript(job: TrainingJob): string {
    const jobDir = path.join(this.config.unsloth.outputDir, job.id);
    fs.mkdirSync(jobDir, { recursive: true });

    const script = [
      'import torch',
      'from unsloth import FastLanguageModel',
      'from datasets import load_dataset',
      'from trl import SFTTrainer',
      'from transformers import TrainingArguments',
      '',
      'max_seq_length = 2048',
      'dtype = None',
      'load_in_4bit = True',
      '',
      `model, tokenizer = FastLanguageModel.from_pretrained(model_name=${JSON.stringify(job.baseModel)}, max_seq_length=max_seq_length, dtype=dtype, load_in_4bit=load_in_4bit)`,
      'model = FastLanguageModel.get_peft_model(',
      '    model,',
      `    r=${job.config.r},`,
      '    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],',
      `    lora_alpha=${job.config.loraAlpha},`,
      '    lora_dropout=0,',
      '    bias="none",',
      '    use_gradient_checkpointing="unsloth",',
      '    random_state=3407,',
      ')',
      '',
      `dataset = load_dataset(${JSON.stringify(job.dataset)}, split="train")`,
      'training_args = TrainingArguments(',
      `    per_device_train_batch_size=${job.config.batchSize},`,
      '    gradient_accumulation_steps=4,',
      '    warmup_steps=10,',
      `    num_train_epochs=${job.config.epochs},`,
      `    learning_rate=${job.config.learningRate},`,
      '    fp16=not torch.cuda.is_bf16_supported(),',
      '    bf16=torch.cuda.is_bf16_supported(),',
      '    logging_steps=10,',
      '    optim="adamw_8bit",',
      '    weight_decay=0.01,',
      '    lr_scheduler_type="linear",',
      '    seed=3407,',
      `    output_dir=${JSON.stringify(jobDir)},`,
      '    report_to="none",',
      ')',
      'trainer = SFTTrainer(',
      '    model=model,',
      '    tokenizer=tokenizer,',
      '    train_dataset=dataset,',
      '    dataset_text_field="text",',
      '    max_seq_length=max_seq_length,',
      '    dataset_num_proc=2,',
      '    packing=False,',
      '    args=training_args,',
      ')',
      'trainer.train()',
      `model.save_pretrained_merged(${JSON.stringify(path.join(jobDir, 'final_model'))}, tokenizer, save_method="merged_16bit")`,
      'print("TRAINING_DONE")',
      '',
    ].join('\n');

    const scriptPath = path.join(jobDir, 'train.py');
    fs.writeFileSync(scriptPath, script, 'utf8');
    return scriptPath;
  }

  private buildExportScript(modelPath: string, exportDir: string, format: 'gguf' | 'ollama'): string {
    const lines = [
      'from unsloth import FastLanguageModel',
      `model, tokenizer = FastLanguageModel.from_pretrained(${JSON.stringify(modelPath)})`,
      `model.save_pretrained_gguf(${JSON.stringify(exportDir)}, tokenizer, quantization_method="q4_k_m")`,
    ];

    if (format === 'ollama') {
      const modelFilePath = path.join(exportDir, 'Modelfile');
      lines.push(
        `with open(${JSON.stringify(modelFilePath)}, "w", encoding="utf-8") as file:`,
        `    file.write("FROM ${path.join(exportDir, 'unsloth.Q4_K_M.gguf').replace(/\\/g, '/')}" + "\\n")`,
        '    file.write("PARAMETER temperature 0.7\\n")',
        '    file.write("PARAMETER top_p 0.9\\n")'
      );
    }

    return `${lines.join('\n')}\n`;
  }

  private parseTrainingOutput(job: TrainingJob, output: string): void {
    this.appendJobLog(job.id, output);

    const lossMatch = output.match(/loss[:\s]+([\d.]+)/i);
    const epochMatch = output.match(/epoch[:\s]+([\d.]+)/i);

    if (lossMatch) {
      job.progress.loss = Number.parseFloat(lossMatch[1]);
    }

    if (epochMatch) {
      job.progress.currentEpoch = Number.parseFloat(epochMatch[1]);
    }
  }

  private appendJobLog(jobId: string, output: string): void {
    const logPath = path.join(this.config.unsloth.outputDir, jobId, 'train.log');
    fs.appendFileSync(logPath, output, 'utf8');
  }
}
