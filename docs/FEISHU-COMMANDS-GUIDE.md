# 飞书指令文档维护指南

## 文档说明

**FEISHU-COMMANDS.md** 是一份自动生成的文档，记录了飞书机器人支持的所有指令及对应的回复。

## 如何更新文档

### 方法一：手动更新（推荐）

当你修改了 `feishu-handler.js` 中的指令逻辑后，运行：

```bash
cd /workspace/projects/docs/tools
node update-feishu-docs.js
```

### 方法二：自动更新（定时任务）

设置定时任务，每天自动更新：

```bash
# 编辑 crontab
crontab -e

# 添加以下行（每天凌晨 3 点执行）
0 3 * * * /workspace/projects/docs/tools/auto-update-all.sh
```

### 方法三：一键更新所有文档

```bash
cd /workspace/projects/docs/tools
./auto-update-all.sh
```

## 文档结构

文档由以下几个部分组成：

| 部分 | 说明 | 更新方式 |
|------|------|----------|
| 支持的网站 | 列出所有配置的网站 | 自动从代码提取 |
| 指令列表 | 详细的指令说明和回复示例 | 自动从代码提取 |
| 快速参考 | 常用指令速查表 | 手动维护 |
| 注意事项 | 使用提示 | 手动维护 |
| 技术说明 | 文件位置等技术信息 | 手动维护 |
| 更新记录 | 文档更新历史 | 自动更新 |

## 自动生成的标记

文档中使用以下标记标识自动生成的内容：

```markdown
<!-- AUTO-GENERATED: 指令列表开始 -->
... 自动生成的内容 ...
<!-- AUTO-GENERATED: 指令列表结束 -->
```

**注意**：标记之间的内容会被脚本覆盖，不要手动修改！

## 如何添加新指令

### 1. 修改处理器代码

编辑 `workspace/skills/website-automation/scripts/feishu-handler.js`：

```javascript
// 在 parseMessage 函数中添加新指令
if (command.includes('新指令')) {
  return { site: siteName, command: 'newcmd', args: [] };
}

// 在 formatResult 函数中添加回复
case 'newcmd':
  return `✅ 新指令执行成功: ${result.data}`;
```

### 2. 更新文档

```bash
node docs/tools/update-feishu-docs.js
```

### 3. 验证

检查 `docs/FEISHU-COMMANDS.md` 是否包含新指令。

## 添加新网站

### 1. 修改 siteMappings

```javascript
const siteMappings = {
  '白梦': 'baimeng',
  'baimeng': 'baimeng',
  '新网站': 'newsite',  // 添加这行
  'newsite': 'newsite'
};
```

### 2. 添加网站配置

编辑 `workspace/skills/website-automation/scripts/config.js`：

```javascript
const newsiteConfig = {
  name: 'newsite',
  baseUrl: 'https://example.com',
  // ... 其他配置
};

configs.newsite = newsiteConfig;
```

### 3. 更新文档

```bash
node docs/tools/update-feishu-docs.js
```

## 脚本工作原理

1. **读取代码**：读取 `feishu-handler.js` 文件内容
2. **提取 siteMappings**：解析支持的所有网站和关键词
3. **提取指令**：从 `parseMessage` 函数中提取指令逻辑
4. **提取回复模板**：从 `formatResult` 函数中提取回复格式
5. **生成文档**：组合以上信息，生成 Markdown 文档
6. **更新文件**：替换文档中的自动生成部分

## 故障排除

### 问题：文档没有更新

```bash
# 检查脚本是否有执行权限
ls -la docs/tools/update-feishu-docs.js

# 检查代码文件是否存在
ls -la workspace/skills/website-automation/scripts/feishu-handler.js

# 手动运行查看错误
node docs/tools/update-feishu-docs.js
```

### 问题：指令识别错误

检查 `parseMessage` 函数中的正则表达式是否正确：

```javascript
// 确保正则能匹配到指令
if (msg.includes('关键词')) {
  // ...
}
```

### 问题：回复格式不对

检查 `formatResult` 函数中的 switch case：

```javascript
case 'command':
  return `回复内容`;  // 确保有 return
```

## 示例：完整的新增指令流程

假设要添加"删除作品"功能：

### 1. 修改 feishu-handler.js

```javascript
// 在 parseMessage 中添加
if (command.includes('删除')) {
  const match = message.match(/(\d+)/);
  if (match) {
    return { site: siteName, command: 'delete', args: [match[1]] };
  }
}

// 在 formatResult 中添加
case 'delete':
  return `✅ 已删除作品: ${result.work.title}`;
```

### 2. 更新文档

```bash
node docs/tools/update-feishu-docs.js
```

### 3. 检查生成的文档

`FEISHU-COMMANDS.md` 中应该出现：

```markdown
#### X. 删除作品

**触发指令**：
- `白梦 删除 <编号>`
- `baimeng delete <编号>`

**机器人回复示例**：
```
✅ 已删除作品: 作品名称
```
```

## 参考

- 处理器文件：`workspace/skills/website-automation/scripts/feishu-handler.js`
- 生成脚本：`docs/tools/update-feishu-docs.js`
- 输出文档：`docs/FEISHU-COMMANDS.md`

---

*最后更新: 2026-03-12*
