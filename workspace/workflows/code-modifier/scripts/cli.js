#!/usr/bin/env node
/**
 * 代码修改工作流 CLI 入口
 * 
 * 用法:
 *   node scripts/cli.js start "修改白梦登录模块"
 *   node scripts/cli.js list
 *   node scripts/cli.js confirm <id>
 *   node scripts/cli.js cancel <id>
 *   node scripts/cli.js status <id>
 */

const path = require('path');
const { buildWorkflow } = require('../index');
const { stateManager } = require('../../state-manager');

// ============================================================
// CLI 命令
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'start':
      await handleStart(args[1]);
      break;
    case 'list':
      handleList();
      break;
    case 'confirm':
      handleConfirm(args[1]);
      break;
    case 'cancel':
      handleCancel(args[1]);
      break;
    case 'status':
      handleStatus(args[1]);
      break;
    default:
      printHelp();
  }
}

// ============================================================
// 命令处理
// ============================================================

async function handleStart(userRequest) {
  if (!userRequest) {
    console.error('❌ 请提供修改请求');
    console.log('用法: node scripts/cli.js start "修改描述"');
    process.exit(1);
  }
  
  console.log('🚀 启动代码修改工作流...\n');
  console.log(`请求: ${userRequest}\n`);
  
  try {
    // 创建工作流
    const workflow = buildWorkflow();
    
    // 创建工作流实例
    const instance = stateManager.createWorkflow(userRequest);
    
    // 初始状态
    const initialState = {
      userRequest,
      messages: [],
    };
    
    // 运行到确认节点
    let state = initialState;
    let currentNode = 'analyze';
    
    // 手动执行各个节点
    const nodes = require('../index').nodes;
    
    // 1. 分析
    state = await nodes.analyzeNode(state);
    
    // 2. 知识检查
    state = await nodes.checkKnowledgeNode(state);
    
    // 3. 规划
    state = await nodes.planNode(state);
    
    // 4. 确认（暂停）
    state = await nodes.confirmNode(state);
    
    // 保存待确认状态
    stateManager.pauseWorkflow(instance.id, state, state.confirmationMessage);
    
    console.log(`\n✅ 工作流已创建，等待确认`);
    console.log(`工作流 ID: ${instance.id}`);
    console.log(`\n确认: node scripts/cli.js confirm ${instance.id}`);
    console.log(`取消: node scripts/cli.js cancel ${instance.id}`);
    
  } catch (error) {
    console.error('❌ 工作流执行失败:', error.message);
    process.exit(1);
  }
}

function handleList() {
  const pending = stateManager.listPendingConfirmations();
  
  if (pending.length === 0) {
    console.log('📭 没有待确认的工作流');
    return;
  }
  
  console.log(`📋 待确认的工作流 (${pending.length} 个):\n`);
  
  for (const record of pending) {
    console.log(`  ID: ${record.id}`);
    console.log(`  请求: ${record.state.userRequest}`);
    console.log(`  创建时间: ${record.localTime}`);
    console.log('');
  }
}

function handleConfirm(id) {
  if (!id) {
    console.error('❌ 请提供工作流 ID');
    console.log('用法: node scripts/cli.js confirm <id>');
    process.exit(1);
  }
  
  const result = stateManager.resumeWorkflow(id, true);
  
  if (result.error) {
    console.error(`❌ ${result.error}`);
    process.exit(1);
  }
  
  console.log(`✅ 工作流 ${id} 已确认`);
  console.log('\n请继续执行修改...\n');
  
  // 输出状态供 AI 继续执行
  console.log('工作流状态:');
  console.log(JSON.stringify(result.state, null, 2));
}

function handleCancel(id) {
  if (!id) {
    console.error('❌ 请提供工作流 ID');
    console.log('用法: node scripts/cli.js cancel <id>');
    process.exit(1);
  }
  
  const result = stateManager.resumeWorkflow(id, false);
  
  if (result.error) {
    console.error(`❌ ${result.error}`);
    process.exit(1);
  }
  
  console.log(`🚫 工作流 ${id} 已取消`);
}

function handleStatus(id) {
  if (!id) {
    console.error('❌ 请提供工作流 ID');
    console.log('用法: node scripts/cli.js status <id>');
    process.exit(1);
  }
  
  const record = stateManager.getPendingConfirmation(id);
  
  if (!record) {
    console.log(`📭 工作流 ${id} 不存在或已处理`);
    return;
  }
  
  console.log(`📋 工作流状态:\n`);
  console.log(`  ID: ${record.id}`);
  console.log(`  状态: ${record.status}`);
  console.log(`  请求: ${record.state.userRequest}`);
  console.log(`  创建时间: ${record.localTime}`);
  
  if (record.state.analysis) {
    console.log(`\n  分析:`);
    console.log(`    意图: ${record.state.analysis.intent}`);
    console.log(`    目标模块: ${record.state.analysis.targetModule || '未指定'}`);
    console.log(`    风险级别: ${record.state.analysis.riskLevel}`);
  }
}

function printHelp() {
  console.log(`
代码修改工作流 CLI

用法:
  node scripts/cli.js <command> [arguments]

命令:
  start <request>    开始新的修改流程
  list               列出待确认的工作流
  confirm <id>       确认工作流
  cancel <id>        取消工作流
  status <id>        查看工作流状态

示例:
  node scripts/cli.js start "修改白梦登录模块"
  node scripts/cli.js list
  node scripts/cli.js confirm wf-abc123
`);
}

// ============================================================
// 执行
// ============================================================

main().catch(console.error);
