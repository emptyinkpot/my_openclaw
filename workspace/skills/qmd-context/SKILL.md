# QMD 上下文管理技能

使用 QMD（Query Markup Documents）搜索引擎进行文档上下文管理。QMD 提供 BM25 全文搜索 + 向量语义搜索 + LLM 重排序，专为智能体流程设计。

## 安装状态
- QMD 已通过 npm 安装：`@tobilu/qmd@2.0.1`
- 工作区目录：`/workspace/projects/qmd-workspace/`
- 使用方式：通过 `npx qmd` 或项目本地安装调用

## 工具定义

### 1. qmd_search - 搜索文档
使用 QMD 搜索文档内容。

**参数：**
- `query` (必需): 搜索查询
- `collection` (可选): 指定集合名称 (notes/meetings/docs)
- `limit` (可选): 结果数量限制，默认 10
- `min_score` (可选): 最小分数阈值，默认 0.3

**示例：**
```bash
npx qmd search "项目时间线" --json -n 10
npx qmd search "API 设计" -c notes --json
```

### 2. qmd_query - 高级查询（混合+重排序）
使用 QMD 的高级查询功能，结合全文、向量和 LLM 重排序。

**参数：**
- `query` (必需): 搜索查询
- `collection` (可选): 指定集合名称
- `all` (可选): 返回所有匹配项
- `files` (可选): 返回文件路径
- `min_score` (可选): 最小分数阈值

**示例：**
```bash
npx qmd query "季度规划流程" --json --all --files --min-score 0.4
```

### 3. qmd_get - 获取特定文档
获取特定文档的完整内容。

**参数：**
- `doc_path` (必需): 文档路径或 docid
- `full` (可选): 返回完整内容

**示例：**
```bash
npx qmd get "notes/2024-01-15.md" --full
npx qmd get "#abc123"
```

### 4. qmd_status - 检查索引状态
检查 QMD 索引状态和集合信息。

**示例：**
```bash
npx qmd status --json
```

## 初始化脚本

首次使用时需要初始化 QMD 集合：

```bash
# 创建目录
mkdir -p /workspace/projects/qmd-workspace/{notes,meetings,docs}

# 初始化集合（需要先解决 better-sqlite3 编译问题）
npx qmd collection add /workspace/projects/qmd-workspace/notes --name notes
npx qmd collection add /workspace/projects/qmd-workspace/meetings --name meetings
npx qmd collection add /workspace/projects/qmd-workspace/docs --name docs

# 添加上下文
npx qmd context add qmd://notes "个人笔记和想法"
npx qmd context add qmd://meetings "会议记录和笔记"
npx qmd context add qmd://docs "工作文档"

# 生成嵌入向量
npx qmd embed
```

## 当前问题
1. **better-sqlite3 编译问题** - 需要重新构建 native 模块
2. **全局安装问题** - 目前只能通过 npx 使用

## 解决方案
1. 在项目目录中重新构建 better-sqlite3：
   ```bash
   cd /workspace/projects && npm rebuild better-sqlite3
   ```

2. 或者使用预构建的二进制版本

## OpenClaw 集成配置

### 方案 1：直接通过 exec 工具调用（推荐）
在 OpenClaw 回复中直接使用 `exec` 工具：

```javascript
// 示例：搜索文档
const searchCmd = `npx @tobilu/qmd search "项目计划" --json -n 5`;
const searchResult = await exec(searchCmd);
const docs = JSON.parse(searchResult.stdout || '[]');

if (docs.length > 0) {
    return `找到 ${docs.length} 个相关文档：\n` +
           docs.map(d => `• ${d.file} (分数: ${d.score.toFixed(2)})`).join('\n');
}
```

### 方案 2：创建自定义工具
在 OpenClaw 配置中添加 QMD 工具：

```json
{
  "tools": {
    "qmd_search": {
      "description": "使用 QMD 搜索文档",
      "command": "npx @tobilu/qmd search \"{query}\" --json -n {limit:10}",
      "parseOutput": "json"
    },
    "qmd_query": {
      "description": "使用 QMD 高级查询",
      "command": "npx @tobilu/qmd query \"{query}\" --json --all --files --min-score {min_score:0.3}",
      "parseOutput": "json"
    }
  }
}
```

### 方案 3：MCP 服务器集成
启动 QMD MCP 服务器：

```bash
# 后台运行 MCP 服务器
npx @tobilu/qmd mcp &

# 在 OpenClaw 配置中添加 MCP 服务器
```

## 完整使用示例

### 示例 1：会议记录搜索
```javascript
// 搜索会议记录
const meetingSearch = await exec(`npx @tobilu/qmd search "季度规划" --json -n 10`);
const meetings = JSON.parse(meetingSearch.stdout);

if (meetings.length > 0) {
    const topMeeting = meetings[0];
    const meetingContent = await exec(`npx @tobilu/qmd get "${topMeeting.file}" --full`);
    return `最新季度规划会议：\n${meetingContent.stdout}`;
}
```

### 示例 2：文档检索助手
```javascript
// 用户问关于部署的问题
const query = "如何部署应用到生产环境";
const results = await exec(`npx @tobilu/qmd query "${query}" --json --all --files --min-score 0.4`);
const relevantDocs = JSON.parse(results.stdout);

if (relevantDocs.length > 0) {
    // 获取最相关的文档内容
    const docPromises = relevantDocs.slice(0, 3).map(doc => 
        exec(`npx @tobilu/qmd get "${doc.file}" --full`)
    );
    const docContents = await Promise.all(docPromises);
    
    return `找到 ${relevantDocs.length} 个相关文档，以下是前 3 个：\n\n` +
           docContents.map((content, i) => 
               `### ${relevantDocs[i].file}\n${content.stdout.slice(0, 500)}...`
           ).join('\n\n');
}
```

### 示例 3：项目文档管理
```javascript
// 获取所有项目文档
const projectDocs = await exec('npx @tobilu/qmd multi-get "projects/*.md" --json --max-bytes 10240');
const projects = JSON.parse(projectDocs.stdout);

// 创建项目文档摘要
const summary = projects.map(p => `- ${p.file}: ${p.content.slice(0, 100)}...`).join('\n');
return `当前项目文档（${projects.length} 个）：\n${summary}`;
```

## 自动化工作流

### 1. 每日文档索引
```bash
# 添加到 cron 任务
0 2 * * * cd /workspace/projects && npx @tobilu/qmd embed --incremental
```

### 2. 会议记录自动归档
```bash
# 自动添加新会议记录
find /path/to/new/meetings -name "*.md" -exec npx @tobilu/qmd collection add {} --name meetings \;
```

### 3. 文档更新监控
```bash
# 监控文档变化并重新索引
inotifywait -m -r -e modify,create,delete /workspace/projects/qmd-workspace/ |
while read path action file; do
    npx @tobilu/qmd embed --incremental
done
```

## 性能提示

1. **增量更新**：使用 `--incremental` 标志只更新变化的文档
2. **批量处理**：一次性添加多个文档到集合
3. **缓存利用**：QMD 会自动缓存搜索结果
4. **定期清理**：每月运行 `npx @tobilu/qmd cleanup`

## 验证配置
运行以下命令验证 QMD 配置：

```bash
# 测试基本功能
npx @tobilu/qmd --version
npx @tobilu/qmd status --json
npx @tobilu/qmd search "测试" --json

# 测试集合
npx @tobilu/qmd collection list
npx @tobilu/qmd context list
```

## 故障排除

### Q: 搜索返回空结果
**A:** 检查：
1. 集合是否正确添加：`npx @tobilu/qmd collection list`
2. 嵌入是否生成：`npx @tobilu/qmd status`
3. 文档格式是否正确（支持 .md, .txt, .json 等）

### Q: 嵌入生成失败
**A:** 
1. 检查网络连接
2. 检查磁盘空间
3. 尝试：`npx @tobilu/qmd embed --force`

### Q: better-sqlite3 错误
**A:**
```bash
# 重新构建
cd /workspace/projects && npm rebuild better-sqlite3
# 或使用系统包
apt-get install -y build-essential python3
```

## 文件结构
```
/workspace/projects/qmd-workspace/
├── notes/      # 个人笔记
├── meetings/   # 会议记录
└── docs/       # 工作文档

~/.cache/qmd/   # QMD 索引和缓存
```

## 注意事项
1. QMD 索引存储在 `~/.cache/qmd/index.sqlite`
2. 首次运行需要生成嵌入向量（可能较慢）
3. 支持 Markdown、文本文件等多种格式
4. 上下文管理是 QMD 的核心功能，可以显著提升搜索相关性