# Experience-Manager 与 Memory-Lancedb-Pro 联动说明

## 架构概览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           OpenClaw Agent                                 │
│                                                                          │
│  ┌────────────────────────┐         ┌────────────────────────────────┐ │
│  │   memory-lancedb-pro   │         │     experience-manager         │ │
│  │                        │         │                                │ │
│  │  scopes:               │◄────────│  ExperienceRepository          │ │
│  │   - global ✓           │  同步    │    ↓ create()                 │ │
│  │   - experience ✓       │         │  MemorySync.sync()             │ │
│  │   - project:novel      │         │                                │ │
│  │                        │────────►│  searchRelatedExperiences()    │ │
│  │  工具接口:              │  搜索    │                                │ │
│  │   - memory_store       │         │  数据存储:                      │ │
│  │   - memory_recall      │         │   experiences.json             │ │
│  └────────────────────────┘         └────────────────────────────────┘ │
│                                                                          │
│  用户: "我遇到一个 MySQL 连接问题..."                                    │
│                          │                                               │
│                          ▼                                               │
│  Agent 自动从 memory-lancedb-pro 检索:                                   │
│   - 从 experience scope 找到类似问题的解决方案                            │
│   - 结合当前对话上下文给出建议                                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 联动机制

### 1. 单向同步（experience → memory-lancedb-pro）

当 experience-manager 创建新经验时，自动将经验同步到 memory-lancedb-pro：

```typescript
// ExperienceRepository.ts
create(record) {
  // 1. 保存到本地 experiences.json
  this.data.records.unshift(newRecord);
  this.save();
  
  // 2. 异步同步到 memory-lancedb-pro（不阻塞主流程）
  syncExperienceToMemory(newRecord).catch(err => {
    console.warn('[Experience] 同步失败:', err.message);
  });
  
  return newRecord;
}
```

### 2. 语义搜索增强

通过 memory-lancedb-pro 的混合检索能力，可以找到语义相关的经验：

```typescript
// 使用示例
import { searchRelatedExperiences } from 'experience-manager';

// 当用户描述问题时，搜索相关经验
const relatedExps = await searchRelatedExperiences('MySQL 连接超时怎么办？');
// 返回语义相关的经验记录，即使关键词不完全匹配
```

### 3. 经验格式

同步到 memory-lancedb-pro 的经验会被格式化为：

```
【经验记录】MySQL 连接超时问题解决

类型: bug_fix
难度: ⭐⭐⭐ (3/5)
标签: mysql, connection, timeout

问题描述:
MySQL 连接在长时间空闲后出现超时错误

解决方案:
1. 增加 wait_timeout 参数
2. 配置连接池保活

获得的经验:
- 数据库连接池配置
- MySQL 参数调优
```

## 配置说明

### memory-lancedb-pro 配置

在 `openclaw.json` 中已配置：

```json
{
  "plugins": {
    "slots": {
      "memory": "memory-lancedb-pro"
    },
    "entries": {
      "memory-lancedb-pro": {
        "config": {
          "scopes": {
            "definitions": {
              "global": { "description": "共享知识库 - 所有 Agent 可见" },
              "experience": { "description": "经验积累 - 问题解决方案" },
              "project:novel": { "description": "小说项目专用记忆" }
            },
            "agentAccess": {
              "default": ["global", "experience"]
            }
          }
        }
      }
    }
  }
}
```

### 环境变量配置

```bash
# 是否启用同步（默认启用）
EXPERIENCE_MEMORY_SYNC=true

# OpenClaw Gateway 地址
OPENCLAW_GATEWAY_URL=http://localhost:5000

# Gateway 认证 Token
OPENCLAW_GATEWAY_TOKEN=your-token-here
```

## 使用场景

### 场景 1: Git 自动积累 + AI 记忆

```bash
# Git Hook 自动积累经验
git commit -m "fix: 修复 MySQL 连接超时问题"

# 经验自动记录到:
# 1. experience-manager 的 experiences.json
# 2. memory-lancedb-pro 的 experience scope

# 之后 Agent 可以通过语义搜索找到这条经验
```

### 场景 2: 问题诊断辅助

```
用户: 我的番茄小说扫描失败了，显示找不到元素

Agent:
  1. 调用 memory_recall 搜索 "番茄小说扫描失败"
  2. 从 experience scope 找到相关经验
  3. 结合经验给出解决方案:
     
     根据之前的经验，这个问题可能是：
     1. 页面加载慢导致元素未出现
     2. 番茄更新了页面结构
     
     建议尝试：
     1. 增加等待时间
     2. 更新选择器
```

### 场景 3: 知识复用

```
用户: 如何配置 memory-lancedb-pro？

Agent:
  从 memory-lancedb-pro 检索到相关经验：
  
  【经验记录】memory-lancedb-pro 配置最佳实践
  - 使用 hybrid 检索模式
  - 配置 smartExtraction 开启智能提取
  - 使用 experience scope 分离不同类型记忆
```

## 数据流

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Git Commit     │     │  手动添加经验     │     │   API 调用       │
└────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      ExperienceRepository.create()                   │
│                                                                      │
│  1. 生成唯一 ID 和时间戳                                              │
│  2. 写入本地 experiences.json                                        │
│  3. 异步调用 MemorySync.sync()                                       │
└────────────────────────────────────┬────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      MemorySync.sync()                               │
│                                                                      │
│  1. 格式化经验为记忆文本                                              │
│  2. 调用 memory_store 工具                                           │
│  3. 存储到 experience scope                                          │
│  4. 自动建立向量索引（用于语义搜索）                                   │
└─────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      memory-lancedb-pro                              │
│                                                                      │
│  - 存储经验记录（带向量嵌入）                                         │
│  - 支持 BM25 + 向量混合检索                                          │
│  - 支持 cross-encoder 重排序                                         │
│  - 支持时间衰减和重要性加权                                           │
└─────────────────────────────────────────────────────────────────────┘
```

## 故障排除

### 同步失败

检查以下项：
1. Gateway 是否正常运行 (`curl http://localhost:5000/health`)
2. Token 是否正确 (`OPENCLAW_GATEWAY_TOKEN`)
3. memory-lancedb-pro 是否启用 (`openclaw plugins info memory-lancedb-pro`)

### 搜索无结果

检查以下项：
1. 经验是否已同步到 memory-lancedb-pro
2. scope 是否正确 (`experience`)
3. 向量嵌入是否正常生成

### 日志查看

```bash
# 查看 memory-lancedb-pro 日志
openclaw logs --follow --plain | grep "memory-lancedb-pro"

# 查看经验同步日志
grep "MemorySync" /app/work/logs/bypass/dev.log
```

## 未来扩展

1. **双向同步**: 支持从 memory-lancedb-pro 回写到 experience-manager
2. **经验推荐**: 基于当前上下文主动推荐相关经验
3. **经验演化**: 跟踪经验的使用频率和效果，自动调整重要性
4. **跨项目共享**: 支持不同项目间的经验共享和隔离
