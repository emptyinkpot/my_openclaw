# 🤖 AI模型管理中心

OpenClaw插件 - 集成主流开源AI框架的统一管理界面

## 功能特性

### 1. 本地模型部署

#### 🦙 Ollama 集成
- 一键拉取和运行量化模型 (GGUF格式)
- 支持 Llama 3、Mistral、Qwen、Phi 等主流模型
- REST API 兼容 OpenAI 格式
- 低资源消耗，适合本地开发

#### ⚡ vLLM 集成
- 生产级高性能推理引擎
- PagedAttention 机制优化KV缓存
- 高并发支持，适合部署环境
- OpenAI 兼容 API

### 2. 模型微调 (Unsloth + PEFT)

- **2倍训练速度**，**70%显存节省**
- LoRA 低秩适配技术
- 支持 Llama、Mistral、Qwen 等模型
- 一键导出到 GGUF / Ollama / HuggingFace 格式

### 3. 代码安全沙盒

#### AST 静态分析
- Python 代码语法树解析
- JavaScript 代码模式匹配
- 危险模块/函数检测

#### 多层级隔离
- **本地**: VM2 / 受限子进程
- **Docker**: 容器隔离 (无网络访问)
- **E2B**: 云端安全运行时

## 安装

```bash
cd extensions/ai-model-hub

# 运行安装脚本
node scripts/setup.js

# 或手动安装Python依赖
pip install unsloth transformers datasets peft accelerate bitsandbytes trl torch

# 安装Node依赖
pnpm install

# 编译
npx tsc
```

## 启动

```bash
# 方式1: 独立运行
./start.sh
# 或
node dist/index.js

# 方式2: 通过OpenClaw启动
# 已在openclaw.json中注册，点击 🤖 AI模型管理 导航项即可
```

服务默认运行在 http://localhost:5100

## 使用说明

### Ollama 模型管理

1. 确保 Ollama 服务已启动:
   ```bash
   ollama serve
   ```

2. 在管理界面中:
   - 查看已安装的模型
   - 拉取新模型 (如: `llama3.2`, `mistral`)
   - 测试模型推理

### 模型微调

1. 准备数据集 (HuggingFace 格式)
2. 创建微调任务:
   - 选择基础模型
   - 配置 LoRA 参数 (r, alpha)
   - 设置训练轮数
3. 启动训练
4. 导出微调后的模型

### 代码沙盒

1. 粘贴待分析的代码
2. 选择代码语言
3. 运行安全分析
4. 查看潜在风险和导入模块

## 技术栈

| 功能 | 开源项目 | 链接 |
|------|---------|------|
| 微调加速 | Unsloth | https://github.com/unslothai/unsloth |
| 参数高效微调 | PEFT | https://github.com/huggingface/peft |
| 本地部署 | Ollama | https://ollama.com |
| 高性能推理 | vLLM | https://github.com/vllm-project/vllm |
| 云端沙盒 | E2B | https://github.com/e2b-dev/e2b |
| AST解析 | Python ast / Babel | 内置模块 |

## API 接口

### 模型管理
- `GET /api/models/ollama` - Ollama模型列表
- `POST /api/models/ollama/pull` - 拉取模型
- `POST /api/models/ollama/generate` - 文本生成
- `POST /api/models/vllm/generate` - vLLM生成

### 微调训练
- `GET /api/finetune/base-models` - 支持的预训练模型
- `POST /api/finetune/jobs` - 创建训练任务
- `POST /api/finetune/jobs/:id/start` - 启动训练
- `GET /api/finetune/jobs` - 任务列表

### 沙盒安全
- `POST /api/sandbox/analyze` - 代码安全分析
- `POST /api/sandbox/execute` - 沙盒执行
- `GET /api/sandbox/config` - 获取配置

## 配置

编辑 `openclaw.plugin.json`:

```json
{
  "localModels": {
    "ollama": {
      "enabled": true,
      "host": "http://localhost:11434",
      "defaultModel": "llama3.2"
    },
    "vllm": {
      "enabled": false,
      "host": "http://localhost:8000"
    }
  },
  "fineTuning": {
    "unsloth": {
      "enabled": true,
      "outputDir": "./models/fine-tuned",
      "defaultConfig": {
        "r": 16,
        "loraAlpha": 16,
        "epochs": 3
      }
    }
  },
  "sandbox": {
    "enabled": true,
    "provider": "local",
    "astCheck": true,
    "blockedModules": ["os", "subprocess", "socket", "requests"]
  }
}
```

## 导航栏集成

OpenClaw主界面已添加 AI模型管理 入口:

```
🦞 OpenClaw | 📚 小说管理 | ⚙️ 自动化模组 | 🧠 经验积累 | 💾 缓存管理 | 🤖 AI模型管理 | 🎯 原生界面
```

## 目录结构

```
extensions/ai-model-hub/
├── src/
│   ├── services/
│   │   ├── LocalModelService.ts    # Ollama/vLLM服务
│   │   ├── FineTuningService.ts    # Unsloth微调服务
│   │   └── SandboxService.ts       # 沙盒安全服务
│   ├── routes/
│   │   ├── model.ts                # 模型API路由
│   │   ├── finetune.ts             # 微调API路由
│   │   └── sandbox.ts              # 沙盒API路由
│   └── index.ts                    # 主入口
├── public/
│   └── index.html                  # 管理界面
├── scripts/
│   └── setup.js                    # 安装脚本
├── openclaw.plugin.json            # 插件配置
└── package.json
```

## 注意事项

1. **GPU要求**: 微调功能需要NVIDIA GPU，建议显存 >= 8GB
2. **Python版本**: 需要 Python 3.8+
3. **CUDA**: 建议安装 CUDA 11.8+ 以获得最佳性能
4. **模型存储**: 大模型文件占用大量磁盘空间，确保有足够存储

## License

MIT
