# 工作流引擎 (Workflow Engine)

复杂自动化流程编排引擎，支持串行/并行/条件/循环/重试。

## 安装

```javascript
const { workflow, task, parallel, loop, when, wait } = require('@openclaw-modules/workflow-engine');
```

## 快速开始

### 基础串行流程

```javascript
const wf = workflow('my-workflow')
  .task('step1', async (ctx) => {
    return { data: 1 };
  })
  .task('step2', async (ctx) => {
    return { data: ctx.data + 1 };
  }, { dependencies: ['step1'] })
  .build();

const result = await wf.run();
// result.context = { data: 2 }
```

### 并行任务

```javascript
const wf = workflow('parallel-demo')
  .parallel('fetch-all', {
    users: async () => fetchUsers(),
    products: async () => fetchProducts(),
    orders: async () => fetchOrders()
  })
  .build();
```

### 条件分支

```javascript
const wf = workflow('conditional')
  .task('check', async (ctx) => {
    return { isAdmin: ctx.user.role === 'admin' };
  })
  .task('admin-task', adminTask, {
    dependencies: ['check'],
    skipIf: (ctx) => !ctx.isAdmin
  })
  .task('user-task', userTask, {
    dependencies: ['check'],
    skipIf: (ctx) => ctx.isAdmin
  })
  .build();
```

### 循环处理

```javascript
const wf = workflow('batch-process')
  .task('get-items', async () => ({ items: [1, 2, 3, 4, 5] }))
  .loop('process-items',
    (ctx) => ctx.items,
    (item, index) => async () => {
      console.log(`处理: ${item}`);
      return { processed: item * 2 };
    }
  )
  .build();
```

### 错误重试

```javascript
const wf = workflow('retry-demo')
  .setOptions({ maxRetries: 3, retryDelay: 1000 })
  .task('flaky-task', async (ctx) => {
    // 可能失败的操作
    return result;
  }, { retries: 3 })
  .build();
```

## API 参考

### workflow(name)

创建工作流构建器。

```javascript
const wf = workflow('workflow-name')
  .setOptions({ maxRetries: 3, timeout: 60000 })
  .setStateDir('/path/to/states')
  .task('id', action, options)
  .build();
```

### .task(id, action, options)

添加任务节点。

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 任务唯一标识 |
| action | Function | 执行函数 `(ctx, results) => any` |
| options.dependencies | string[] | 依赖的任务ID |
| options.retries | number | 重试次数 |
| options.timeout | number | 超时时间(ms) |
| options.skipIf | Function | 跳过条件 `(ctx) => boolean` |

### .parallel(id, tasks, options)

添加并行节点。

```javascript
.parallel('fetch-all', {
  taskA: async () => 'A',
  taskB: async () => 'B'
}, { concurrency: 2, failFast: true })
```

### .loop(id, getItems, taskFactory, options)

添加循环节点。

```javascript
.loop('process',
  (ctx) => ctx.items,           // 获取迭代项
  (item, index, ctx) => async () => {  // 任务工厂
    return processItem(item);
  },
  { concurrency: 3 }            // 并发数
)
```

### .condition(id, condition, branches)

添加条件节点。

```javascript
.condition('route',
  (ctx) => ctx.type,  // 返回分支名
  {
    'typeA': taskNodeA,
    'typeB': taskNodeB
  }
)
```

### .wait(id, duration)

添加等待节点。

```javascript
.wait('delay', 3000)  // 等待3秒

.wait('poll', async (ctx) => {  // 等待条件满足
  return ctx.ready === true;
})
```

### .depends(taskId, ...dependencies)

定义任务依赖。

```javascript
.task('a', taskA)
.task('b', taskB)
.task('c', taskC)
.depends('c', 'a', 'b')  // c 依赖 a 和 b
```

## 事件

```javascript
wf.on('start', ({ id, name }) => {});
wf.on('complete', ({ id, duration, results }) => {});
wf.on('error', ({ id, error }) => {});
wf.on('task:start', ({ taskId, progress }) => {});
wf.on('task:complete', ({ taskId, result, progress }) => {});
wf.on('task:error', ({ taskId, error, attempt }) => {});
wf.on('task:retry', ({ taskId, attempt, maxRetries }) => {});
```

## 节点类型

| 节点 | 说明 |
|------|------|
| TaskNode | 执行单个任务 |
| ParallelNode | 并行执行多个任务 |
| ConditionNode | 条件分支 |
| LoopNode | 循环迭代 |
| WaitNode | 等待/延迟 |
| RetryNode | 重试包装 |
| AggregateNode | 结果聚合 |

## 示例项目

```bash
cd projects/workflow-examples
node src/main.js 6  # 运行网站自动化示例
```
