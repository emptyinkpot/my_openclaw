/**
 * @fileoverview 工作流引擎核心
 * @module @openclaw-modules/workflow-engine/core
 * 
 * 功能特性:
 * - 任务编排（串行/并行/条件/循环）
 * - 自动重试机制
 * - 超时控制
 * - 进度追踪
 * - 状态持久化
 * - 错误恢复
 */

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

/**
 * 工作流状态枚举
 */
const WorkflowStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

/**
 * 任务状态枚举
 */
const TaskStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  SKIPPED: 'skipped',
  COMPLETED: 'completed',
  FAILED: 'failed',
  RETRYING: 'retrying'
};

/**
 * 工作流引擎
 * @class
 * @extends EventEmitter
 */
class WorkflowEngine extends EventEmitter {
  /**
   * @param {Object} config - 引擎配置
   * @param {string} [config.id] - 工作流ID
   * @param {string} [config.name] - 工作流名称
   * @param {Object} [config.options] - 全局选项
   * @param {number} [config.options.maxRetries=3] - 最大重试次数
   * @param {number} [config.options.retryDelay=1000] - 重试延迟(ms)
   * @param {number} [config.options.timeout=300000] - 全局超时(ms)
   * @param {boolean} [config.options.continueOnError=false] - 错误时继续
   * @param {string} [config.stateDir] - 状态保存目录
   */
  constructor(config = {}) {
    super();
    
    this.id = config.id || this._generateId();
    this.name = config.name || 'unnamed-workflow';
    this.options = {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 300000,
      continueOnError: false,
      ...config.options
    };
    
    this.stateDir = config.stateDir;
    this.tasks = new Map();
    this.results = new Map();
    this.errors = new Map();
    this.context = {};
    
    this._status = WorkflowStatus.PENDING;
    this._startTime = null;
    this._endTime = null;
    this._currentTask = null;
  }

  // ============ 属性 ============

  get status() { return this._status; }
  get startTime() { return this._startTime; }
  get endTime() { return this._endTime; }
  get duration() {
    if (!this._startTime) return 0;
    const end = this._endTime || Date.now();
    return end - this._startTime;
  }
  get progress() {
    const total = this.tasks.size;
    if (total === 0) return 0;
    const completed = Array.from(this.results.values())
      .filter(r => r.status === TaskStatus.COMPLETED || r.status === TaskStatus.SKIPPED).length;
    return Math.round((completed / total) * 100);
  }

  // ============ 任务注册 ============

  /**
   * 注册任务
   * @param {string} taskId - 任务ID
   * @param {Object} taskDef - 任务定义
   * @param {Function} taskDef.execute - 执行函数
   * @param {string[]} [taskDef.dependencies] - 依赖任务ID列表
   * @param {Object} [taskDef.options] - 任务选项
   * @returns {WorkflowEngine} this
   */
  register(taskId, taskDef) {
    this.tasks.set(taskId, {
      id: taskId,
      execute: taskDef.execute,
      dependencies: taskDef.dependencies || [],
      options: {
        maxRetries: this.options.maxRetries,
        retryDelay: this.options.retryDelay,
        timeout: this.options.timeout,
        skipCondition: null,
        ...taskDef.options
      },
      status: TaskStatus.PENDING,
      retries: 0
    });
    
    return this;
  }

  /**
   * 批量注册任务
   * @param {Object} tasks - 任务映射 { id: definition }
   * @returns {WorkflowEngine} this
   */
  registerAll(tasks) {
    for (const [id, def] of Object.entries(tasks)) {
      this.register(id, def);
    }
    return this;
  }

  // ============ 上下文管理 ============

  /**
   * 设置上下文
   * @param {Object} ctx - 上下文数据
   * @returns {WorkflowEngine} this
   */
  setContext(ctx) {
    this.context = { ...this.context, ...ctx };
    return this;
  }

  /**
   * 获取上下文
   * @returns {Object}
   */
  getContext() {
    return { ...this.context };
  }

  /**
   * 更新上下文
   * @param {Object} data - 要合并的数据
   */
  updateContext(data) {
    this.context = { ...this.context, ...data };
  }

  // ============ 执行控制 ============

  /**
   * 运行工作流
   * @param {Object} [initialContext] - 初始上下文
   * @returns {Promise<Object>} 执行结果
   */
  async run(initialContext = {}) {
    if (this._status === WorkflowStatus.RUNNING) {
      throw new Error('工作流已在运行中');
    }
    
    this._status = WorkflowStatus.RUNNING;
    this._startTime = Date.now();
    this.context = { ...initialContext };
    
    this.emit('start', { id: this.id, name: this.name });
    
    try {
      // 验证依赖
      this._validateDependencies();
      
      // 获取执行顺序
      const order = this._getExecutionOrder();
      
      // 执行任务
      for (const taskId of order) {
        if (this._status === WorkflowStatus.CANCELLED) {
          break;
        }
        
        await this._executeTask(taskId);
      }
      
      // 完成
      this._status = WorkflowStatus.COMPLETED;
      this._endTime = Date.now();
      
      this.emit('complete', {
        id: this.id,
        duration: this.duration,
        results: this._getResults()
      });
      
      return this._getResults();
    } catch (error) {
      this._status = WorkflowStatus.FAILED;
      this._endTime = Date.now();
      
      this.emit('error', { id: this.id, error });
      
      throw error;
    }
  }

  /**
   * 取消工作流
   */
  cancel() {
    this._status = WorkflowStatus.CANCELLED;
    this._endTime = Date.now();
    this.emit('cancel', { id: this.id });
  }

  /**
   * 暂停工作流
   */
  pause() {
    if (this._status === WorkflowStatus.RUNNING) {
      this._status = WorkflowStatus.PAUSED;
      this.emit('pause', { id: this.id });
    }
  }

  /**
   * 恢复工作流
   */
  async resume() {
    if (this._status === WorkflowStatus.PAUSED) {
      this._status = WorkflowStatus.RUNNING;
      this.emit('resume', { id: this.id });
      // 继续执行未完成的任务
    }
  }

  // ============ 任务执行 ============

  /**
   * 执行单个任务
   * @param {string} taskId
   * @private
   */
  async _executeTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }
    
    this._currentTask = taskId;
    
    // 检查依赖
    for (const depId of task.dependencies) {
      const depResult = this.results.get(depId);
      if (!depResult || depResult.status === TaskStatus.FAILED) {
        task.status = TaskStatus.SKIPPED;
        this.results.set(taskId, {
          status: TaskStatus.SKIPPED,
          reason: `依赖任务失败或未执行: ${depId}`
        });
        this.emit('task:skip', { taskId, reason: 'dependency_failed' });
        return;
      }
    }
    
    // 检查跳过条件
    if (task.options.skipCondition) {
      const shouldSkip = typeof task.options.skipCondition === 'function'
        ? await task.options.skipCondition(this.context, this.results)
        : task.options.skipCondition;
      
      if (shouldSkip) {
        task.status = TaskStatus.SKIPPED;
        this.results.set(taskId, {
          status: TaskStatus.SKIPPED,
          reason: 'skip_condition_met'
        });
        this.emit('task:skip', { taskId, reason: 'condition' });
        return;
      }
    }
    
    // 执行任务（带重试）
    task.status = TaskStatus.RUNNING;
    this.emit('task:start', { taskId, progress: this.progress });
    
    let lastError = null;
    const maxRetries = task.options.maxRetries;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        task.status = TaskStatus.RETRYING;
        task.retries = attempt;
        this.emit('task:retry', { taskId, attempt, maxRetries });
        await this._sleep(task.options.retryDelay);
      }
      
      try {
        // 带超时执行
        const result = await this._executeWithTimeout(
          task.execute(this.context, this.results),
          task.options.timeout
        );
        
        task.status = TaskStatus.COMPLETED;
        this.results.set(taskId, {
          status: TaskStatus.COMPLETED,
          data: result,
          duration: this.duration
        });
        
        // 更新上下文
        if (result && typeof result === 'object') {
          this.updateContext(result);
        }
        
        this.emit('task:complete', { taskId, result, progress: this.progress });
        return;
      } catch (error) {
        lastError = error;
        this.emit('task:error', { taskId, error, attempt });
      }
    }
    
    // 所有重试失败
    task.status = TaskStatus.FAILED;
    this.errors.set(taskId, lastError);
    this.results.set(taskId, {
      status: TaskStatus.FAILED,
      error: lastError.message
    });
    
    if (!this.options.continueOnError) {
      throw lastError;
    }
  }

  /**
   * 带超时执行
   * @private
   */
  async _executeWithTimeout(promise, timeout) {
    if (!timeout) return await promise;
    
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('任务超时')), timeout);
      })
    ]);
  }

  // ============ 工具方法 ============

  /**
   * 验证依赖关系
   * @private
   */
  _validateDependencies() {
    for (const [taskId, task] of this.tasks) {
      for (const depId of task.dependencies) {
        if (!this.tasks.has(depId)) {
          throw new Error(`任务 ${taskId} 依赖不存在的任务: ${depId}`);
        }
      }
    }
    
    // 检测循环依赖
    const visited = new Set();
    const stack = new Set();
    
    const checkCycle = (taskId) => {
      if (stack.has(taskId)) {
        throw new Error(`检测到循环依赖: ${taskId}`);
      }
      if (visited.has(taskId)) return;
      
      visited.add(taskId);
      stack.add(taskId);
      
      const task = this.tasks.get(taskId);
      for (const depId of task.dependencies) {
        checkCycle(depId);
      }
      
      stack.delete(taskId);
    };
    
    for (const taskId of this.tasks.keys()) {
      checkCycle(taskId);
    }
  }

  /**
   * 获取执行顺序（拓扑排序）
   * @private
   */
  _getExecutionOrder() {
    const order = [];
    const visited = new Set();
    
    const visit = (taskId) => {
      if (visited.has(taskId)) return;
      visited.add(taskId);
      
      const task = this.tasks.get(taskId);
      for (const depId of task.dependencies) {
        visit(depId);
      }
      
      order.push(taskId);
    };
    
    for (const taskId of this.tasks.keys()) {
      visit(taskId);
    }
    
    return order;
  }

  /**
   * 获取结果
   * @private
   */
  _getResults() {
    const results = {};
    for (const [taskId, result] of this.results) {
      results[taskId] = result;
    }
    return {
      id: this.id,
      name: this.name,
      status: this._status,
      duration: this.duration,
      tasks: results,
      context: this.context
    };
  }

  /**
   * 生成ID
   * @private
   */
  _generateId() {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 延迟
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============ 状态持久化 ============

  /**
   * 保存状态
   * @returns {Object}
   */
  saveState() {
    const state = {
      id: this.id,
      name: this.name,
      status: this._status,
      context: this.context,
      results: Object.fromEntries(this.results),
      errors: Object.fromEntries(this.errors)
    };
    
    if (this.stateDir) {
      const filePath = path.join(this.stateDir, `${this.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
    }
    
    return state;
  }

  /**
   * 加载状态
   * @param {string} workflowId
   * @returns {Object|null}
   */
  loadState(workflowId) {
    if (!this.stateDir) return null;
    
    const filePath = path.join(this.stateDir, `${workflowId}.json`);
    if (!fs.existsSync(filePath)) return null;
    
    const state = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    this.id = state.id;
    this.name = state.name;
    this._status = state.status;
    this.context = state.context;
    this.results = new Map(Object.entries(state.results));
    this.errors = new Map(Object.entries(state.errors));
    
    return state;
  }
}

module.exports = {
  WorkflowEngine,
  WorkflowStatus,
  TaskStatus
};
