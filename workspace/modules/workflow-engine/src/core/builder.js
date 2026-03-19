/**
 * @fileoverview 工作流编排器
 * @module @openclaw-modules/workflow-engine/builder
 * 
 * 提供流畅API构建复杂工作流
 */

const { WorkflowEngine, WorkflowStatus, TaskStatus } = require('./engine');
const {
  TaskNode,
  ConditionNode,
  ParallelNode,
  LoopNode,
  WaitNode,
  RetryNode,
  AggregateNode
} = require('../nodes');

/**
 * 工作流构建器
 * @class
 */
class WorkflowBuilder {
  constructor(name) {
    this.name = name;
    this.tasks = {};
    this.options = {};
    this.stateDir = null;
  }

  /**
   * 设置全局选项
   * @param {Object} options
   * @returns {WorkflowBuilder}
   */
  setOptions(options) {
    this.options = { ...this.options, ...options };
    return this;
  }

  /**
   * 设置状态保存目录
   * @param {string} dir
   * @returns {WorkflowBuilder}
   */
  setStateDir(dir) {
    this.stateDir = dir;
    return this;
  }

  /**
   * 添加任务
   * @param {string} id - 任务ID
   * @param {Function} action - 执行函数
   * @param {Object} [options]
   * @returns {WorkflowBuilder}
   */
  task(id, action, options = {}) {
    this.tasks[id] = {
      execute: action,
      dependencies: options.dependencies || [],
      options: {
        maxRetries: options.retries || this.options.maxRetries || 0,
        timeout: options.timeout || this.options.timeout,
        skipCondition: options.skipIf
      }
    };
    return this;
  }

  /**
   * 添加条件分支
   * @param {string} id - 节点ID
   * @param {Function} condition - 条件函数
   * @param {Object} branches - 分支配置
   * @returns {WorkflowBuilder}
   */
  condition(id, condition, branches) {
    const node = new ConditionNode(id, {
      condition,
      branches
    });
    
    this.tasks[id] = {
      execute: () => node.execute({}, {}),
      dependencies: []
    };
    
    return this;
  }

  /**
   * 添加并行任务
   * @param {string} id - 节点ID
   * @param {Object} taskDefs - 任务定义 { taskId: action }
   * @param {Object} [options]
   * @returns {WorkflowBuilder}
   */
  parallel(id, taskDefs, options = {}) {
    const tasks = Object.entries(taskDefs).map(([taskId, action]) => {
      return new TaskNode(taskId, { action });
    });
    
    const node = new ParallelNode(id, {
      tasks,
      concurrency: options.concurrency,
      failFast: options.failFast
    });
    
    this.tasks[id] = {
      execute: () => node.execute({}, {}),
      dependencies: options.dependencies || []
    };
    
    return this;
  }

  /**
   * 添加循环节点
   * @param {string} id - 节点ID
   * @param {Function} getItems - 获取迭代项
   * @param {Function} taskFactory - 任务工厂
   * @param {Object} [options]
   * @returns {WorkflowBuilder}
   */
  loop(id, getItems, taskFactory, options = {}) {
    const node = new LoopNode(id, {
      items: getItems,
      task: taskFactory,
      concurrency: options.concurrency || 1
    });
    
    this.tasks[id] = {
      execute: (ctx, results) => node.execute(ctx, results),
      dependencies: options.dependencies || []
    };
    
    return this;
  }

  /**
   * 添加等待节点
   * @param {string} id - 节点ID
   * @param {number|Function} durationOrCondition - 等待时间或条件
   * @returns {WorkflowBuilder}
   */
  wait(id, durationOrCondition) {
    const config = typeof durationOrCondition === 'number'
      ? { duration: durationOrCondition }
      : { until: durationOrCondition };
    
    const node = new WaitNode(id, config);
    
    this.tasks[id] = {
      execute: () => node.execute({}, {}),
      dependencies: []
    };
    
    return this;
  }

  /**
   * 添加重试包装
   * @param {string} id - 节点ID
   * @param {Function} action - 执行函数
   * @param {Object} options
   * @returns {WorkflowBuilder}
   */
  retry(id, action, options = {}) {
    const task = new TaskNode(id, { action });
    const node = new RetryNode(id, {
      task,
      maxRetries: options.maxRetries || 3,
      delay: options.delay || 1000
    });
    
    this.tasks[id] = {
      execute: () => node.execute({}, {}),
      dependencies: options.dependencies || []
    };
    
    return this;
  }

  /**
   * 定义任务依赖
   * @param {string} taskId - 任务ID
   * @param {...string} dependencies - 依赖的任务ID
   * @returns {WorkflowBuilder}
   */
  depends(taskId, ...dependencies) {
    if (this.tasks[taskId]) {
      this.tasks[taskId].dependencies = dependencies;
    }
    return this;
  }

  /**
   * 构建工作流引擎
   * @returns {WorkflowEngine}
   */
  build() {
    const engine = new WorkflowEngine({
      name: this.name,
      options: this.options,
      stateDir: this.stateDir
    });
    
    engine.registerAll(this.tasks);
    
    return engine;
  }
}

/**
 * 创建工作流构建器
 * @param {string} name - 工作流名称
 * @returns {WorkflowBuilder}
 */
function workflow(name) {
  return new WorkflowBuilder(name);
}

/**
 * 快捷创建任务节点
 */
function task(id, action, options = {}) {
  return new TaskNode(id, { action, ...options });
}

/**
 * 快捷创建条件节点
 */
function when(id, condition, branches) {
  return new ConditionNode(id, { condition, branches });
}

/**
 * 快捷创建并行节点
 */
function parallel(id, tasks, options = {}) {
  return new ParallelNode(id, { tasks, ...options });
}

/**
 * 快捷创建循环节点
 */
function loop(id, getItems, taskFactory, options = {}) {
  return new LoopNode(id, { items: getItems, task: taskFactory, ...options });
}

/**
 * 快捷创建等待节点
 */
function wait(id, duration) {
  return new WaitNode(id, { duration });
}

module.exports = {
  WorkflowBuilder,
  workflow,
  task,
  when,
  parallel,
  loop,
  wait
};
