/**
 * @fileoverview 工作流节点类型
 * @module @openclaw-modules/workflow-engine/nodes
 * 
 * 提供各种类型的工作流节点，用于构建复杂流程
 */

/**
 * 基础节点
 */
class BaseNode {
  constructor(id, config = {}) {
    this.id = id;
    this.config = config;
    this.status = 'pending';
    this.result = null;
    this.error = null;
  }

  async execute(context, results) {
    throw new Error('子类必须实现 execute 方法');
  }
}

/**
 * 任务节点 - 执行单个任务
 */
class TaskNode extends BaseNode {
  /**
   * @param {string} id - 节点ID
   * @param {Object} config
   * @param {Function} config.action - 执行函数 (context, results) => any
   * @param {string[]} [config.dependencies] - 依赖节点
   * @param {number} [config.timeout] - 超时时间
   * @param {number} [config.retries=0] - 重试次数
   * @param {Function} [config.onSuccess] - 成功回调
   * @param {Function} [config.onError] - 错误回调
   */
  constructor(id, config) {
    super(id, config);
    this.action = config.action;
    this.dependencies = config.dependencies || [];
    this.timeout = config.timeout;
    this.retries = config.retries || 0;
    this.onSuccess = config.onSuccess;
    this.onError = config.onError;
  }

  async execute(context, results) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        this.status = attempt > 0 ? 'retrying' : 'running';
        
        let result;
        if (this.timeout) {
          result = await Promise.race([
            this.action(context, results),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), this.timeout)
            )
          ]);
        } else {
          result = await this.action(context, results);
        }
        
        this.result = result;
        this.status = 'completed';
        
        if (this.onSuccess) {
          await this.onSuccess(result, context);
        }
        
        return { success: true, data: result };
      } catch (error) {
        lastError = error;
        if (this.onError) {
          await this.onError(error, context, attempt);
        }
      }
    }
    
    this.error = lastError;
    this.status = 'failed';
    return { success: false, error: lastError.message };
  }
}

/**
 * 条件节点 - 根据条件执行不同分支
 */
class ConditionNode extends BaseNode {
  /**
   * @param {string} id - 节点ID
   * @param {Object} config
   * @param {Function} config.condition - 条件判断 (context, results) => string
   * @param {Object} config.branches - 分支映射 { branchName: Node }
   * @param {BaseNode} [config.default] - 默认分支
   */
  constructor(id, config) {
    super(id, config);
    this.condition = config.condition;
    this.branches = config.branches || {};
    this.defaultBranch = config.default;
  }

  async execute(context, results) {
    this.status = 'running';
    
    try {
      const branchName = await this.condition(context, results);
      const branch = this.branches[branchName] || this.defaultBranch;
      
      if (!branch) {
        this.status = 'completed';
        this.result = { branch: branchName, skipped: true };
        return { success: true, data: this.result };
      }
      
      const branchResult = await branch.execute(context, results);
      
      this.status = 'completed';
      this.result = { branch: branchName, result: branchResult };
      
      return { success: true, data: this.result };
    } catch (error) {
      this.status = 'failed';
      this.error = error;
      return { success: false, error: error.message };
    }
  }
}

/**
 * 并行节点 - 并行执行多个任务
 */
class ParallelNode extends BaseNode {
  /**
   * @param {string} id - 节点ID
   * @param {Object} config
   * @param {BaseNode[]} config.tasks - 并行任务列表
   * @param {number} [config.concurrency] - 并发数限制
   * @param {boolean} [config.failFast=true] - 任一失败立即停止
   */
  constructor(id, config) {
    super(id, config);
    this.tasks = config.tasks || [];
    this.concurrency = config.concurrency;
    this.failFast = config.failFast !== false;
  }

  async execute(context, results) {
    this.status = 'running';
    
    try {
      let taskResults;
      
      if (this.concurrency && this.concurrency < this.tasks.length) {
        // 限制并发
        taskResults = await this._executeWithConcurrency(context, results);
      } else {
        // 全部并行
        taskResults = await Promise.all(
          this.tasks.map(task => task.execute(context, results))
        );
      }
      
      const failures = taskResults.filter(r => !r.success);
      
      if (failures.length > 0 && this.failFast) {
        throw new Error(`${failures.length} 个并行任务失败`);
      }
      
      this.status = 'completed';
      this.result = taskResults;
      
      return { 
        success: failures.length === 0,
        data: taskResults,
        failures: failures.length
      };
    } catch (error) {
      this.status = 'failed';
      this.error = error;
      return { success: false, error: error.message };
    }
  }

  async _executeWithConcurrency(context, results) {
    const taskResults = [];
    const executing = new Set();
    
    for (const task of this.tasks) {
      if (executing.size >= this.concurrency) {
        await Promise.race(executing);
      }
      
      const promise = task.execute(context, results).then(result => {
        executing.delete(promise);
        taskResults.push(result);
        return result;
      });
      
      executing.add(promise);
    }
    
    await Promise.all(executing);
    return taskResults;
  }
}

/**
 * 循环节点 - 循环执行任务
 */
class LoopNode extends BaseNode {
  /**
   * @param {string} id - 节点ID
   * @param {Object} config
   * @param {Function} config.items - 获取迭代项 (context) => any[]
   * @param {Function} config.task - 任务工厂 (item, index, context) => Node
   * @param {number} [config.concurrency=1] - 并发数
   */
  constructor(id, config) {
    super(id, config);
    this.items = config.items;
    this.taskFactory = config.task;
    this.concurrency = config.concurrency || 1;
  }

  async execute(context, results) {
    this.status = 'running';
    
    try {
      const items = await this.items(context);
      const taskResults = [];
      
      if (this.concurrency > 1) {
        // 并发处理
        for (let i = 0; i < items.length; i += this.concurrency) {
          const batch = items.slice(i, i + this.concurrency);
          const batchResults = await Promise.all(
            batch.map((item, j) => {
              const task = this.taskFactory(item, i + j, context);
              return task.execute(context, results);
            })
          );
          taskResults.push(...batchResults);
        }
      } else {
        // 串行处理
        for (let i = 0; i < items.length; i++) {
          const task = this.taskFactory(items[i], i, context);
          const result = await task.execute(context, results);
          taskResults.push(result);
        }
      }
      
      this.status = 'completed';
      this.result = taskResults;
      
      return { 
        success: true, 
        data: taskResults,
        count: items.length
      };
    } catch (error) {
      this.status = 'failed';
      this.error = error;
      return { success: false, error: error.message };
    }
  }
}

/**
 * 等待节点 - 延迟执行
 */
class WaitNode extends BaseNode {
  /**
   * @param {string} id - 节点ID
   * @param {Object} config
   * @param {number} config.duration - 等待时间(ms)
   * @param {Function} [config.until] - 等待条件 (context) => boolean
   * @param {number} [config.pollInterval=1000] - 轮询间隔
   */
  constructor(id, config) {
    super(id, config);
    this.duration = config.duration;
    this.until = config.until;
    this.pollInterval = config.pollInterval || 1000;
  }

  async execute(context, results) {
    this.status = 'running';
    
    try {
      if (this.duration) {
        await new Promise(resolve => setTimeout(resolve, this.duration));
      } else if (this.until) {
        while (!(await this.until(context))) {
          await new Promise(resolve => setTimeout(resolve, this.pollInterval));
        }
      }
      
      this.status = 'completed';
      return { success: true };
    } catch (error) {
      this.status = 'failed';
      this.error = error;
      return { success: false, error: error.message };
    }
  }
}

/**
 * 重试节点 - 包装任务添加重试逻辑
 */
class RetryNode extends BaseNode {
  /**
   * @param {string} id - 节点ID
   * @param {Object} config
   * @param {BaseNode} config.task - 要重试的任务
   * @param {number} config.maxRetries - 最大重试次数
   * @param {number} [config.delay=1000] - 重试延迟
   * @param {Function} [config.shouldRetry] - 是否重试判断 (error, attempt) => boolean
   */
  constructor(id, config) {
    super(id, config);
    this.task = config.task;
    this.maxRetries = config.maxRetries || 3;
    this.delay = config.delay || 1000;
    this.shouldRetry = config.shouldRetry;
  }

  async execute(context, results) {
    this.status = 'running';
    let lastError;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.task.execute(context, results);
        
        if (result.success) {
          this.status = 'completed';
          this.result = result;
          return result;
        }
        
        lastError = new Error(result.error);
      } catch (error) {
        lastError = error;
      }
      
      if (attempt < this.maxRetries) {
        const shouldRetry = this.shouldRetry 
          ? await this.shouldRetry(lastError, attempt)
          : true;
        
        if (!shouldRetry) break;
        
        await new Promise(resolve => setTimeout(resolve, this.delay));
      }
    }
    
    this.status = 'failed';
    this.error = lastError;
    return { success: false, error: lastError.message };
  }
}

/**
 * 聚合节点 - 聚合多个任务结果
 */
class AggregateNode extends BaseNode {
  /**
   * @param {string} id - 节点ID
   * @param {Object} config
   * @param {string[]} config.taskIds - 要聚合的任务ID
   * @param {Function} config.aggregator - 聚合函数 (results) => any
   */
  constructor(id, config) {
    super(id, config);
    this.taskIds = config.taskIds || [];
    this.aggregator = config.aggregator;
  }

  async execute(context, results) {
    this.status = 'running';
    
    try {
      const data = this.aggregator(results, context);
      
      this.status = 'completed';
      this.result = data;
      
      return { success: true, data };
    } catch (error) {
      this.status = 'failed';
      this.error = error;
      return { success: false, error: error.message };
    }
  }
}

module.exports = {
  BaseNode,
  TaskNode,
  ConditionNode,
  ParallelNode,
  LoopNode,
  WaitNode,
  RetryNode,
  AggregateNode
};
