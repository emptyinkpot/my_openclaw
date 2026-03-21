const fs = require('fs');
const path = require('path');

// 读取现有经验数据
const expPath = './extensions/apps/experience-manager/data/experiences.json';
const expData = JSON.parse(fs.readFileSync(expPath, 'utf-8'));

// 创建新经验记录
const newExperience = {
  id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  timestamp: Date.now(),
  type: 'bug_fix',
  title: '笔记功能不显示问题排查与修复',
  description: '用户反馈点击"📒 笔记"标签后，显示"暂无笔记"，但实际上数据库中有 28 条笔记数据',
  userQuery: '📒 暂无笔记 点击"新建笔记"添加第一条笔记还是这个',
  solution: `## 问题排查过程

### 1. 第一层检查：API 路由缺失
- 发现 experience-routes.ts 已经更新添加了笔记 API
- 但插件入口文件 index.ts 有自己独立的 HTTP 处理逻辑 handleExperienceApi
- 完全没有使用 experience-routes.ts，也没有笔记 API 处理

### 2. 第二层修复：在 index.ts 中添加笔记 API
- 在 handleExperienceApi 函数中添加完整的笔记 CRUD 路由
- 更新 initializeData 函数同时初始化笔记数据
- 重启服务

### 3. 第三层问题：数据格式不匹配
- 发现 API 请求确实到达了（日志显示）
- 但笔记还是不显示
- 检查 NoteRepository 发现数据格式期望：{ notes: [...], version: "1.0" }
- 实际保存的是：直接是一个数组 [...]
- 同时字段名也不匹配：createdAt/updatedAt vs created_at/updated_at

### 4. 最终修复：转换数据格式
- 将数组格式转换为 { notes: [...], version: "1.0" } 格式
- 转换字段名：createdAt → created_at，updatedAt → updated_at
- 为每条笔记添加唯一 ID：db_note_ 前缀
- 重启服务

## 关键经验点
1. 插件入口文件可能有自己的 HTTP 处理逻辑，不依赖路由文件
2. 数据格式必须严格匹配 Repository 期望的格式
3. 先检查日志看 API 请求是否到达，再看数据格式是否正确
4. 字段命名规范要统一（驼峰 vs 下划线）`,
  experienceApplied: [
    '日志排查技巧',
    'API 路由调试',
    '数据格式验证'
  ],
  experienceGained: [
    '插件入口文件可能独立实现 HTTP 处理，不使用路由文件',
    'Repository 期望的数据格式必须严格匹配',
    '先确认 API 请求是否到达，再检查数据格式',
    '字段命名规范要统一（驼峰 vs 下划线）',
    '日志是排查问题的第一手资料'
  ],
  tags: [
    'OpenClaw',
    '笔记功能',
    'API 路由',
    '数据格式',
    'bug 修复',
    '插件开发'
  ],
  difficulty: 3,
  xpGained: 150
};

// 添加到经验数据
expData.records.unshift(newExperience);

// 保存
fs.writeFileSync(expPath, JSON.stringify(expData, null, 2));

console.log('✅ 经验记录已添加！');
console.log(`标题: ${newExperience.title}`);
console.log(`获得 XP: +${newExperience.xpGained}`);
