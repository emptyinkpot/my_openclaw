/**
 * @fileoverview 工作流引擎模块入口
 * @module @openclaw-modules/workflow-engine
 * 
 * 复杂自动化流程编排引擎
 * 
 * @example
 * const { workflow, task, parallel, loop, when, wait } = require('@openclaw-modules/workflow-engine');
 * 
 * // 方式1：使用构建器
 * const wf = workflow('my-workflow')
 *   .task('step1', async (ctx) => { return { data: 1 }; })
 *   .task('step2', async (ctx) => { return { data: ctx.data + 1 }; }, { dependencies: ['step1'] })
 *   .parallel('step3', {
 *     taskA: async () => 'A',
 *     taskB: async () => 'B'
 *   })
 *   .build();
 * 
 * const result = await wf.run({ initial: 'data' });
 * 
 * // 方式2：使用引擎API
 * const { WorkflowEngine } = require('@openclaw-modules/workflow-engine');
 * 
 * const engine = new WorkflowEngine({ name: 'my-workflow' });
 * engine.register('step1', { execute: async () => {} });
 * engine.register('step2', { execute: async () => {}, dependencies: ['step1'] });
 * await engine.run();
 */

// 核心
const { WorkflowEngine, WorkflowStatus, TaskStatus } = require('./core/engine');
const { WorkflowBuilder, workflow, task, when, parallel, loop, wait } = require('./core/builder');

// 节点
const {
  BaseNode,
  TaskNode,
  ConditionNode,
  ParallelNode,
  LoopNode,
  WaitNode,
  RetryNode,
  AggregateNode
} = require('./nodes');

module.exports = {
  // 核心引擎
  WorkflowEngine,
  WorkflowStatus,
  TaskStatus,
  
  // 构建器
  WorkflowBuilder,
  workflow,
  
  // 节点快捷函数
  task,
  when,
  parallel,
  loop,
  wait,
  
  // 节点类
  BaseNode,
  TaskNode,
  ConditionNode,
  ParallelNode,
  LoopNode,
  WaitNode,
  RetryNode,
  AggregateNode
};
