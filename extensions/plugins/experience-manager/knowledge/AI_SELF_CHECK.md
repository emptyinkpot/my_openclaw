# AI 自检框架

> 每次回答前必须执行的检查清单

---

## 🔴 强制执行框架（不可跳过）

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   每次用户请求任务，AI 必须按顺序执行：                          │
│                                                                 │
│   Step 1: write_todos 创建任务列表                              │
│            第一项固定为：「查询知识库和经验」                    │
│                                                                 │
│   Step 2: 查询已有知识和经验                                    │
│            - knowledge/INDEX.md (知识库索引)                    │
│            - knowledge/ISSUES_AND_SOLUTIONS.md (问题解决方案)   │
│            - experience-store.findSimilarSuccess(error)         │
│                                                                 │
│   Step 3: 标记「查询知识库和经验」为 completed                  │
│                                                                 │
│   Step 4: 读取规范文件                                          │
│            - CODING_STANDARDS.md                                │
│            - DEBUG_LOG.md                                       │
│                                                                 │
│   Step 5: 执行任务                                              │
│            - 优先使用已有解决方案                               │
│            - 所有代码必须使用 runTask() 入口                    │
│                                                                 │
│   Step 6: 运行检查                                              │
│            node scripts/check-compliance.js                     │
│                                                                 │
│   Step 7: 积累经验（重要！）                                    │
│            - 更新 knowledge/ISSUES_AND_SOLUTIONS.md             │
│            - 调用 experience-store.recordSuccess/Failure        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 自检清单

### 任务开始前

| 检查项 | 状态 |
|--------|------|
| 已创建 write_todos 任务列表 | □ |
| 第一项是「查询知识库和经验」 | □ |
| 已读取 knowledge/INDEX.md | □ |
| 已读取 knowledge/ISSUES_AND_SOLUTIONS.md | □ |
| 已查询 experience-store 相似案例 | □ |
| 已标记「查询知识库和经验」completed | □ |

### 编码时

| 检查项 | 状态 |
|--------|------|
| 优先使用已有解决方案 | □ |
| 使用 runTask() 作为入口 | □ |
| 从已验证模块导入 | □ |
| 添加来源注释 | □ |

### 任务完成后（重要！）

| 检查项 | 状态 |
|--------|------|
| 运行 check-compliance.js | □ |
| **更新 ISSUES_AND_SOLUTIONS.md** | □ |
| **调用 experience-store 记录经验** | □ |

---

## 违规示例（禁止）

```
❌ 用户: "帮我写个脚本"
❌ AI: "好的，这是代码..." （直接写代码，没查经验）

✅ 用户: "帮我写个脚本"
✅ AI: 
   1. write_todos 创建任务列表
   2. 查询知识库和经验（必须！）
   3. 发现类似问题已有解决方案，复用
   4. 标记 completed
   5. 然后才开始写代码
   6. 完成后记录新经验
```

---

## 经验查询代码（每次必须执行）

```javascript
// 在任务开始时执行
const store = require('./src/utils/experience-store');

// 1. 查找相似问题的成功案例
const similar = store.findSimilarSuccess(errorDescription);
if (similar) {
  console.log('找到相似案例:', similar);
  // 优先使用已有解决方案
}

// 2. 获取最佳策略
const best = store.getBestStrategy('PATTERN_ID');
if (best) {
  console.log('最佳策略:', best);
}

// 在任务结束时执行
// 3. 记录成功经验
store.recordSuccess(
  { id: 'PATTERN_ID', type: 'category', severity: 'high' },
  '问题描述',
  { context },
  { action: '解决方案', attempts: 1 }
);

// 4. 记录失败经验
store.recordFailure(
  { id: 'PATTERN_ID', type: 'category', severity: 'medium' },
  '问题描述',
  { context }
);
```

---

## 知识库文件位置

| 文件 | 用途 |
|------|------|
| `knowledge/INDEX.md` | 知识库索引，快速导航 |
| `knowledge/ISSUES_AND_SOLUTIONS.md` | 问题记录与解决方案 |
| `knowledge/<platform>/` | 各平台专项知识 |
| `auto-scripts/src/utils/experience-store.js` | 经验存储工具 |
| `auto-scripts/storage/experience/` | 经验数据文件 |

---

## 修正后的 AI 行为

现在开始，我会：

1. **每次任务先 write_todos**
2. **第一项永远是「查询知识库和经验」**
3. **读取 knowledge/INDEX.md 和 ISSUES_AND_SOLUTIONS.md**
4. **查询 experience-store 相似案例**
5. **优先使用已有解决方案**
6. **任务完成后必须记录新经验**

这是强制执行，不可跳过！
