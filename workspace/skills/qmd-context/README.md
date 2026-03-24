# QMD 上下文管理技能 - 使用指南

## 概述
QMD（Query Markup Documents）是一个本地文档搜索引擎，提供 BM25 全文搜索 + 向量语义搜索 + LLM 重排序。专为智能体流程设计。

## 安装状态
✅ **QMD 已成功安装并配置**

### 已验证功能：
1. ✅ QMD 命令行工具可用 (`npx @tobilu/qmd`)
2. ✅ 集合创建成功 (`test-collection`)
3. ✅ 嵌入生成进行中（可能需要几分钟）
4. ✅ 基本搜索功能正常

## 快速开始

### 1. 初始化你的工作区
```bash
# 创建目录结构
mkdir -p /workspace/projects/qmd-workspace/{notes,meetings,docs,projects}

# 添加示例文档
echo "# 项目计划" > /workspace/projects/qmd-workspace/projects/plan.md
echo "## 目标：完成 OpenClaw 集成" >> /workspace/projects/qmd-workspace/projects/plan.md
echo "- 安装 QMD" >> /workspace/projects/qmd-workspace/projects/plan.md
echo "- 配置 OpenClaw 技能" >> /workspace/projects/qmd-workspace/projects/plan.md
echo "- 测试搜索功能" >> /workspace/projects/qmd-workspace/projects/plan.md
```

### 2. 创建 QMD 集合
```bash
# 添加集合
npx @tobilu/qmd collection add /workspace/projects/qmd-workspace/notes --name notes
npx @tobilu/qmd collection add /workspace/projects/qmd-workspace/meetings --name meetings
npx @tobilu/qmd collection add /workspace/projects/qmd-workspace/docs --name docs
npx @tobilu/qmd collection add /workspace/projects/qmd-workspace/projects --name projects
```

### 3. 添加上下文描述
```bash
# 添加上下文（提升搜索相关性）
npx @tobilu/qmd context add qmd://notes "个人笔记、想法和日记"
npx @tobilu/qmd context add qmd://meetings "会议记录、讨论要点和决策"
npx @tobilu/qmd context add qmd://docs "技术文档、API 参考和手册"
npx @tobilu/qmd context add qmd://projects "项目计划、任务和进度跟踪"
```

### 4. 生成嵌入向量
```bash
# 生成向量嵌入（首次运行需要时间）
npx @tobilu/qmd embed
```

## OpenClaw 集成

### 通过 exec 工具调用
```javascript
// 在 OpenClaw 回复中使用
const searchResults = await exec(`npx @tobilu/qmd search "项目计划" --json -n 5`);
const documents = JSON.parse(searchResults.stdout);

if (documents.length > 0) {
    return `找到 ${documents.length} 个相关文档：\n` +
           documents.map(d => `• ${d.path} (分数: ${d.score.toFixed(2)})`).join('\n');
} else {
    return "未找到相关文档。";
}
```

### 使用预定义的工具函数
```javascript
// 加载 QMD 工具
const qmdTools = require('./qmd-tools.js');

// 搜索文档
const results = await qmdTools.qmdSearch("OpenClaw 配置", "projects", 5, 0.3);

// 高级查询
const advancedResults = await qmdTools.qmdQuery("如何部署应用", "docs", true, true, 0.4);

// 获取特定文档
const docContent = await qmdTools.qmdGet("projects/plan.md", true);

// 检查状态
const status = await qmdTools.qmdStatus();
```

## 使用示例

### 场景 1：会议记录搜索
```bash
# 搜索会议记录
npx @tobilu/qmd search "季度规划 会议" -c meetings --json

# 高级查询（混合搜索 + 重排序）
npx @tobilu/qmd query "产品路线图讨论" --all --files --min-score 0.35
```

### 场景 2：技术文档检索
```bash
# 搜索 API 文档
npx @tobilu/qmd vsearch "REST API 设计模式" -c docs

# 获取特定文档
npx @tobilu/qmd get "docs/api-reference.md" --full
```

### 场景 3：项目文档管理
```bash
# 批量获取项目文档
npx @tobilu/qmd multi-get "projects/*.md" --json --max-bytes 10240

# 搜索项目相关文档
npx @tobilu/qmd query "lex:部署\nvec:生产环境配置" --json
```

## MCP 服务器集成

QMD 支持 MCP（Model Context Protocol）服务器，可与 AI 代理深度集成：

```bash
# 启动 MCP 服务器
npx @tobilu/qmd mcp

# 在 Claude Desktop 等支持 MCP 的客户端中配置
```

MCP 服务器提供以下工具：
- `query` - 混合搜索
- `get` - 文档检索
- `multi_get` - 批量获取
- `status` - 状态检查

## 文件结构
```
/workspace/projects/qmd-workspace/
├── notes/          # 个人笔记
├── meetings/       # 会议记录
├── docs/           # 技术文档
└── projects/       # 项目文档

/workspace/projects/workspace/skills/qmd-context/
├── SKILL.md        # 技能说明
├── qmd-tools.js    # 工具函数
├── qmd-wrapper.sh  # 包装脚本
└── test-qmd.sh     # 测试脚本

~/.cache/qmd/       # QMD 索引和缓存
```

## 性能优化

### 1. 增量更新
```bash
# 只更新变化的文档
npx @tobilu/qmd embed --incremental
```

### 2. 并行处理
```bash
# 使用多线程（如果支持）
npx @tobilu/qmd embed --workers 4
```

### 3. 缓存管理
```bash
# 清理缓存
npx @tobilu/qmd cleanup
```

## 故障排除

### 问题 1: better-sqlite3 编译错误
```bash
# 重新构建 native 模块
cd /workspace/projects && npm rebuild better-sqlite3
```

### 问题 2: 嵌入生成失败
```bash
# 检查模型文件
ls ~/.cache/qmd/models/

# 重新下载模型
npx @tobilu/qmd embed --force
```

### 问题 3: 搜索无结果
```bash
# 检查索引状态
npx @tobilu/qmd status

# 重新索引
npx @tobilu/qmd collection add --force /path/to/docs --name collection-name
```

## 下一步
1. 等待嵌入生成完成
2. 测试搜索功能
3. 创建 OpenClaw 自动化工作流
4. 集成到日常任务中

## 参考链接
- [QMD GitHub 仓库](https://github.com/tobi/qmd)
- [Model Context Protocol](https://spec.modelcontextprotocol.io/)
- [OpenClaw 文档](https://docs.openclaw.ai/)