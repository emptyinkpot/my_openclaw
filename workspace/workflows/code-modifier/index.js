/**
 * 代码修改工作流 - LangGraph 实现
 * 
 * 多阶段确认机制：
 * 1. 分析 → 理解用户需求
 * 2. 检查知识库 → 搜索相关代码和选择器
 * 3. 规划 → 制定修改计划
 * 4. 确认 → 等待用户确认（中断点）
 * 5. 执行 → 执行修改
 * 6. 验证 → 验证结果
 * 
 * @module workflows/code-modifier
 */

const { StateGraph, END } = require('@langchain/langgraph');
const { BaseMessage, HumanMessage, AIMessage, SystemMessage } = require('@langchain/core/messages');
const fs = require('fs');
const path = require('path');

// ============================================================
// 配置
// ============================================================

const CONFIG = {
  knowledgeBase: '/workspace/projects/auto-scripts/docs',
  verifiedModules: '/workspace/projects/auto-scripts/src/platforms',
  libPath: '/workspace/projects/workspace/lib',
  maxRetries: 3,
  confirmationTimeout: 300000, // 5分钟确认超时
};

// ============================================================
// 状态定义
// ============================================================

/**
 * @typedef {Object} WorkflowState
 * @property {string} userRequest - 用户请求
 * @property {string} [targetFile] - 目标文件
 * @property {Object} [analysis] - 分析结果
 * @property {Object} [knowledge] - 知识检查结果
 * @property {Object} [plan] - 修改计划
 * @property {boolean} [confirmed] - 是否已确认
 * @property {string} [confirmationMessage] - 确认消息
 * @property {Object} [execution] - 执行结果
 * @property {Object} [verification] - 验证结果
 * @property {Array} messages - 消息历史
 * @property {string} [nextNode] - 下一个节点
 * @property {string} [error] - 错误信息
 */

// ============================================================
// 节点：分析用户需求
// ============================================================

async function analyzeNode(state) {
  console.log('\n📋 [分析节点] 理解用户需求...');
  
  const { userRequest } = state;
  
  // 分析用户请求
  const analysis = {
    intent: extractIntent(userRequest),
    targetModule: extractTargetModule(userRequest),
    targetFile: extractTargetFile(userRequest),
    riskLevel: assessRisk(userRequest),
    keywords: extractKeywords(userRequest),
  };
  
  console.log(`  意图: ${analysis.intent}`);
  console.log(`  目标模块: ${analysis.targetModule || '未指定'}`);
  console.log(`  风险级别: ${analysis.riskLevel}`);
  
  return {
    ...state,
    analysis,
    messages: [...state.messages, {
      role: 'system',
      content: `分析完成: ${analysis.intent}，目标模块: ${analysis.targetModule || '未指定'}，风险: ${analysis.riskLevel}`,
    }],
  };
}

// ============================================================
// 节点：检查知识库
// ============================================================

async function checkKnowledgeNode(state) {
  console.log('\n📚 [知识检查节点] 搜索相关知识...');
  
  const { analysis } = state;
  const keywords = analysis?.keywords || [];
  
  // 搜索知识库
  const knowledge = {
    verifiedModules: [],
    selectors: [],
    relatedIssues: [],
    codeExamples: [],
  };
  
  // 1. 搜索已验证模块
  const modulePath = `${CONFIG.verifiedModules}/${analysis.targetModule}`;
  if (fs.existsSync(modulePath)) {
    const files = fs.readdirSync(modulePath).filter(f => f.endsWith('.js'));
    knowledge.verifiedModules = files.map(f => `${analysis.targetModule}/${f}`);
  }
  
  // 2. 搜索选择器
  const selectorFile = `${CONFIG.knowledgeBase}/元素选择器字典.md`;
  if (fs.existsSync(selectorFile)) {
    const content = fs.readFileSync(selectorFile, 'utf-8');
    for (const keyword of keywords) {
      const regex = new RegExp(`.*${keyword}.*`, 'gi');
      const matches = content.match(regex);
      if (matches) {
        knowledge.selectors.push(...matches.slice(0, 3));
      }
    }
  }
  
  // 3. 搜索历史问题
  const debugFile = `${CONFIG.knowledgeBase}/DEBUG_LOG.md`;
  if (fs.existsSync(debugFile)) {
    const content = fs.readFileSync(debugFile, 'utf-8');
    for (const keyword of keywords) {
      const regex = new RegExp(`.*${keyword}.*`, 'gi');
      const matches = content.match(regex);
      if (matches) {
        knowledge.relatedIssues.push(...matches.slice(0, 3));
      }
    }
  }
  
  console.log(`  已验证模块: ${knowledge.verifiedModules.length} 个`);
  console.log(`  相关选择器: ${knowledge.selectors.length} 个`);
  console.log(`  相关问题: ${knowledge.relatedIssues.length} 个`);
  
  return {
    ...state,
    knowledge,
    messages: [...state.messages, {
      role: 'system',
      content: `知识检查完成: 找到 ${knowledge.verifiedModules.length} 个模块，${knowledge.selectors.length} 个选择器`,
    }],
  };
}

// ============================================================
// 节点：规划修改
// ============================================================

async function planNode(state) {
  console.log('\n📝 [规划节点] 制定修改计划...');
  
  const { analysis, knowledge } = state;
  
  // 生成修改计划
  const plan = {
    steps: [],
    codeChanges: [],
    verifiedModulesUsed: [],
    selectorsUsed: [],
    warnings: [],
  };
  
  // 1. 确定步骤
  plan.steps.push(`检查目标模块: ${analysis.targetModule || 'auto-scripts'}`);
  
  if (knowledge.verifiedModules.length > 0) {
    plan.steps.push(`使用已验证模块: ${knowledge.verifiedModules.slice(0, 3).join(', ')}`);
    plan.verifiedModulesUsed = knowledge.verifiedModules.slice(0, 3);
  }
  
  if (knowledge.selectors.length > 0) {
    plan.steps.push(`使用选择器: ${knowledge.selectors.slice(0, 2).join(', ').substring(0, 100)}...`);
    plan.selectorsUsed = knowledge.selectors.slice(0, 2);
  }
  
  plan.steps.push('编写代码');
  plan.steps.push('执行修改');
  
  // 2. 添加警告
  if (analysis.riskLevel === 'high') {
    plan.warnings.push('⚠️ 高风险操作：请仔细检查代码变更');
  }
  
  if (knowledge.verifiedModules.length === 0) {
    plan.warnings.push('⚠️ 未找到已验证模块，可能需要新建代码');
  }
  
  console.log(`  步骤: ${plan.steps.length} 个`);
  plan.steps.forEach((step, i) => console.log(`    ${i + 1}. ${step}`));
  
  if (plan.warnings.length > 0) {
    console.log(`  警告:`);
    plan.warnings.forEach(w => console.log(`    ${w}`));
  }
  
  return {
    ...state,
    plan,
    messages: [...state.messages, {
      role: 'assistant',
      content: formatPlanMessage(plan),
    }],
  };
}

// ============================================================
// 节点：等待确认（中断点）
// ============================================================

async function confirmNode(state) {
  console.log('\n⏸️ [确认节点] 等待用户确认...');
  
  const { plan, analysis } = state;
  
  // 生成确认消息
  const confirmationMessage = formatConfirmationMessage(state);
  
  console.log('\n' + '='.repeat(60));
  console.log(confirmationMessage);
  console.log('='.repeat(60));
  console.log('\n请回复 "确认" 或 "取消"');
  
  // 设置状态为等待确认
  return {
    ...state,
    confirmed: null, // null 表示等待确认
    confirmationMessage,
    // 这是一个中断点，工作流会暂停
    nextNode: 'wait_for_confirmation',
  };
}

// ============================================================
// 节点：执行修改
// ============================================================

async function executeNode(state) {
  console.log('\n🔧 [执行节点] 执行代码修改...');
  
  const { plan, analysis } = state;
  
  const execution = {
    filesModified: [],
    success: false,
    error: null,
    timestamp: new Date().toISOString(),
  };
  
  try {
    // 这里是实际的代码修改逻辑
    // 由于这是工作流框架，实际的修改由 AI 完成
    // 这里我们只是记录和验证
    
    execution.success = true;
    console.log('  ✅ 执行成功');
    
  } catch (error) {
    execution.error = error.message;
    console.log(`  ❌ 执行失败: ${error.message}`);
  }
  
  return {
    ...state,
    execution,
    messages: [...state.messages, {
      role: 'system',
      content: execution.success 
        ? `执行完成: 修改了 ${execution.filesModified.length} 个文件`
        : `执行失败: ${execution.error}`,
    }],
  };
}

// ============================================================
// 节点：验证结果
// ============================================================

async function verifyNode(state) {
  console.log('\n✅ [验证节点] 验证修改结果...');
  
  const { execution, plan } = state;
  
  const verification = {
    passed: false,
    issues: [],
    checks: [],
  };
  
  // 1. 检查执行是否成功
  if (!execution?.success) {
    verification.issues.push('执行未成功完成');
  } else {
    verification.checks.push('✓ 执行成功');
  }
  
  // 2. 检查是否使用了已验证模块
  if (plan?.verifiedModulesUsed?.length > 0) {
    verification.checks.push(`✓ 使用了已验证模块: ${plan.verifiedModulesUsed.length} 个`);
  }
  
  // 3. 检查是否有警告未处理
  if (plan?.warnings?.length > 0) {
    verification.issues.push(`存在 ${plan.warnings.length} 个警告需要关注`);
  }
  
  // 4. 最终判断
  verification.passed = execution?.success && verification.issues.length === 0;
  
  console.log(`  检查结果:`);
  verification.checks.forEach(c => console.log(`    ${c}`));
  if (verification.issues.length > 0) {
    console.log(`  问题:`);
    verification.issues.forEach(i => console.log(`    ⚠️ ${i}`));
  }
  
  console.log(`\n  最终结果: ${verification.passed ? '✅ 通过' : '❌ 未通过'}`);
  
  return {
    ...state,
    verification,
    messages: [...state.messages, {
      role: 'system',
      content: verification.passed 
        ? '验证通过，修改完成'
        : `验证未通过: ${verification.issues.join(', ')}`,
    }],
  };
}

// ============================================================
// 工具函数
// ============================================================

function extractIntent(request) {
  const lower = request.toLowerCase();
  if (lower.includes('添加') || lower.includes('新增')) return 'add';
  if (lower.includes('修改') || lower.includes('更新')) return 'modify';
  if (lower.includes('删除') || lower.includes('移除')) return 'delete';
  if (lower.includes('修复') || lower.includes('bug')) return 'fix';
  if (lower.includes('重构')) return 'refactor';
  return 'unknown';
}

function extractTargetModule(request) {
  const lower = request.toLowerCase();
  if (lower.includes('白梦') || lower.includes('baimeng')) return 'baimeng';
  if (lower.includes('番茄') || lower.includes('fanqie')) return 'fanqie';
  return null;
}

function extractTargetFile(request) {
  // 简化实现，实际可以用更复杂的解析
  const match = request.match(/[\w\/\-]+\.js/);
  return match ? match[0] : null;
}

function assessRisk(request) {
  const lower = request.toLowerCase();
  if (lower.includes('删除') || lower.includes('清空')) return 'high';
  if (lower.includes('修改') || lower.includes('更新')) return 'medium';
  return 'low';
}

function extractKeywords(request) {
  const keywords = [];
  const words = request.split(/[\s,，。.!！?？]+/);
  for (const word of words) {
    if (word.length >= 2 && word.length <= 10) {
      keywords.push(word);
    }
  }
  return keywords.slice(0, 5);
}

function formatPlanMessage(plan) {
  let msg = '📋 修改计划:\n\n';
  msg += '步骤:\n';
  plan.steps.forEach((step, i) => {
    msg += `  ${i + 1}. ${step}\n`;
  });
  
  if (plan.verifiedModulesUsed.length > 0) {
    msg += `\n使用的已验证模块:\n`;
    plan.verifiedModulesUsed.forEach(m => {
      msg += `  - ${m}\n`;
    });
  }
  
  if (plan.warnings.length > 0) {
    msg += `\n⚠️ 警告:\n`;
    plan.warnings.forEach(w => {
      msg += `  ${w}\n`;
    });
  }
  
  return msg;
}

function formatConfirmationMessage(state) {
  const { analysis, plan, knowledge } = state;
  
  let msg = '\n🔔 请确认以下修改计划:\n\n';
  msg += `目标: ${analysis?.intent || '未知'}\n`;
  msg += `模块: ${analysis?.targetModule || '未指定'}\n`;
  msg += `风险: ${analysis?.riskLevel || '未知'}\n\n`;
  
  msg += '计划步骤:\n';
  plan?.steps?.forEach((step, i) => {
    msg += `  ${i + 1}. ${step}\n`;
  });
  
  if (plan?.warnings?.length > 0) {
    msg += '\n⚠️ 警告:\n';
    plan.warnings.forEach(w => msg += `  ${w}\n`);
  }
  
  msg += '\n请回复 "确认" 继续，或 "取消" 放弃。\n';
  
  return msg;
}

// ============================================================
// 构建工作流图
// ============================================================

function buildWorkflow() {
  // 创建状态图
  const workflow = new StateGraph({
    channels: {
      userRequest: { value: null },
      targetFile: { value: null },
      analysis: { value: null },
      knowledge: { value: null },
      plan: { value: null },
      confirmed: { value: null },
      confirmationMessage: { value: null },
      execution: { value: null },
      verification: { value: null },
      messages: { value: [], reducer: (a, b) => [...a, ...b] },
      nextNode: { value: null },
      error: { value: null },
    },
  });
  
  // 添加节点
  workflow.addNode('analyze', analyzeNode);
  workflow.addNode('check_knowledge', checkKnowledgeNode);
  workflow.addNode('make_plan', planNode);  // 重命名避免与状态属性冲突
  workflow.addNode('confirm', confirmNode);
  workflow.addNode('execute', executeNode);
  workflow.addNode('verify', verifyNode);
  
  // 设置入口
  workflow.setEntryPoint('analyze');
  
  // 添加边（正常流程）
  workflow.addEdge('analyze', 'check_knowledge');
  workflow.addEdge('check_knowledge', 'make_plan');
  workflow.addEdge('make_plan', 'confirm');
  
  // 确认节点的条件分支
  workflow.addConditionalEdges('confirm', (state) => {
    if (state.confirmed === true) {
      return 'execute';
    } else if (state.confirmed === false) {
      return END;
    }
    // null 表示等待确认，暂停工作流
    return 'confirm';
  });
  
  workflow.addEdge('execute', 'verify');
  workflow.addEdge('verify', END);
  
  return workflow.compile();
}

// ============================================================
// 导出
// ============================================================

module.exports = {
  buildWorkflow,
  nodes: {
    analyzeNode,
    checkKnowledgeNode,
    planNode,
    confirmNode,
    executeNode,
    verifyNode,
  },
  CONFIG,
};
